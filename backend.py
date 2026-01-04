from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import jupyter_client
from jupyter_client import AsyncKernelManager
import os
import shutil
import json
import asyncio
import uuid
import logging
import queue

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WORKING_DIR = os.getcwd()

# Store active sessions: {session_id: KernelSession}
sessions = {}

class KernelSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.km = None
        self.kc = None
        self.started = False

    async def start(self):
        logger.info(f"Starting kernel for session {self.session_id}")
        self.km = AsyncKernelManager(kernel_name='python3')
        # Use valid start_kernel_async
        await self.km.start_kernel(cwd=WORKING_DIR)
        self.kc = self.km.client()
        self.kc.start_channels()
        
        try:
            await self.kc.wait_for_ready(timeout=60)
            self.started = True
            logger.info(f"Kernel ready for session {self.session_id}")
            
            # Run startup code silently
            startup_code = """
import matplotlib
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
%matplotlib inline
"""
            # We fire and forget startup code, or wait for it? 
            # Better to wait to ensure environment is ready.
            await self.execute_silent(startup_code)
            
        except Exception as e:
            logger.error(f"Failed to start kernel: {e}")
            await self.shutdown()
            raise

    async def execute_silent(self, code: str):
        if not self.kc: return
        msg_id = self.kc.execute(code, silent=True)
        # We don't need to wait for output, but we should probably wait for idle
        # to ensure imports are done before user code runs.
        # For simplicity in this 'silent' version, we just let it queue.
        # Actually, let's wait for idle to be safe.
        await self._wait_for_idle(msg_id)

    async def execute(self, websocket: WebSocket, code: str, cell_id: str):
        if not self.started:
            await websocket.send_json({"type": "error", "cellId": cell_id, "content": "Kernel not running"})
            return

        msg_id = self.kc.execute(code)
        
        # Poll for messages
        while True:
            try:
                # Check iopub
                try:
                    # print("Checking iopub...")
                    msg = await self.kc.get_iopub_msg(timeout=0.05)
                    # print(f"Got iopub message: {msg['header']['msg_type']}")
                    await self._handle_iopub(websocket, msg, cell_id, msg_id)
                    
                    if msg['header']['msg_type'] == 'status' and \
                       msg['content']['execution_state'] == 'idle' and \
                       msg['parent_header']['msg_id'] == msg_id:
                        print("Execution finished (idle status received)")
                        break
                except (asyncio.QueueEmpty, queue.Empty):
                    pass
                except Exception as e:
                    print(f"Error checking iopub: {e}")
                
                # Check stdin
                try:
                    msg = await self.kc.get_stdin_msg(timeout=0.05)
                    if msg['parent_header']['msg_id'] == msg_id:
                         if msg['header']['msg_type'] == 'input_request':
                            # print(f"Got input request: {msg['content']['prompt']}")
                            # Send input request to frontend
                            await websocket.send_json({
                                "type": "input_request",
                                "cellId": cell_id,
                                "prompt": msg['content']['prompt']
                            })
                            
                            # Wait for input reply from frontend
                            while True:
                                data = await websocket.receive_text()
                                message = json.loads(data)
                                
                                if message.get("type") == "input_reply":
                                    value = message.get("value")
                                    self.kc.input(value)
                                    break
                                
                                elif message.get("type") == "restart":
                                    logger.info("Restart requested while waiting for input")
                                    await self.shutdown()
                                    await self.start()
                                    await websocket.send_json({"type": "restart_success", "content": "Kernel restarted successfully"})
                                    return # Exit execution immediately
                                     
                                else:
                                    # We received something else while waiting for input.
                                    # We can't process it right now. Warn the user.
                                    print(f"Ignored message type {message.get('type')} while waiting for input")
                                    await websocket.send_json({
                                        "type": "error",
                                        "cellId": cell_id,
                                        "traceback": ["Kernel is waiting for input. Please complete the input prompt first or Restart Runtime."]
                                    })
                except (asyncio.QueueEmpty, queue.Empty):
                    pass
                except Exception as e:
                    print(f"Error checking stdin: {e}")
                
                await asyncio.sleep(0.01)

            except Exception as e:
                logger.error(f"Error during execution: {e}")
                break
        
        await websocket.send_json({"type": "complete", "cellId": cell_id})

    async def input(self, value: str):
        if self.kc:
            self.kc.input(value)

    async def shutdown(self):
        if self.km:
            logger.info(f"Shutting down kernel for session {self.session_id}")
            await self.km.shutdown_kernel()
            self.started = False
            self.km = None
            self.kc = None

    async def _wait_for_idle(self, msg_id):
        # Helper to wait for a specific message to be done without sending anything to WS
        while True:
            try:
                msg = await self.kc.get_iopub_msg(timeout=1)
                if msg['header']['msg_type'] == 'status' and \
                   msg['content']['execution_state'] == 'idle' and \
                   msg['parent_header']['msg_id'] == msg_id:
                    break
            except:
                break

    async def _handle_iopub(self, websocket: WebSocket, msg, cell_id, parent_msg_id):
        if msg['parent_header'].get('msg_id') != parent_msg_id:
            return

        msg_type = msg['header']['msg_type']
        content = msg['content']
        
        response = {"cellId": cell_id, "type": msg_type}

        if msg_type == 'stream':
            response["text"] = content['text']
            response["name"] = content['name']
            await websocket.send_json(response)
            
        elif msg_type in ('execute_result', 'display_data'):
            data = content['data']
            if 'text/html' in data:
                 response["html"] = data['text/html']
            if 'image/png' in data:
                response["image"] = data['image/png']
            if 'text/plain' in data:
                response["text"] = data['text/plain']
            await websocket.send_json(response)
            
        elif msg_type == 'error':
            response["ename"] = content['ename']
            response["evalue"] = content['evalue']
            response["traceback"] = content['traceback']
            await websocket.send_json(response)


@app.on_event("startup")
async def startup_event():
    # Clean up any leftover kernels if necessary
    pass

@app.on_event("shutdown") 
async def shutdown_event():
    for session in sessions.values():
        await session.shutdown()

@app.get("/")
async def get_index():
    if os.path.exists("index.html"):
        with open("index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>Luna Book Backend Running</h1>")

@app.get("/{filename}")
async def get_file(filename: str):
    file_path = os.path.join(WORKING_DIR, filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return {"error": "File not found"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(WORKING_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"filename": file.filename, "status": "uploaded"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/restart")
async def restart_kernel_endpoint():
    # NOTE: In a multi-session world, a global restart is ambiguous.
    # ideally, the frontend should pass the session ID or the restart happens via WS.
    # For now, we will NOT support global restart via HTTP.
    # We will rely on page refresh -> new websocket -> new kernel.
    return {"status": "Use WebSocket execution to manage state"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Create new session for this connection
    session_id = str(uuid.uuid4())
    session = KernelSession(session_id)
    sessions[session_id] = session
    
    try:
        await session.start()
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            msg_type = message.get("type")
            
            if msg_type == "execute":
                code = message.get("code")
                cell_id = message.get("cellId")
                await session.execute(websocket, code, cell_id)
            
            elif msg_type == "input_reply":
                value = message.get("value")
                await session.input(value)

            elif msg_type == "restart":
                # Handle restart request
                logger.info(f"Restarting kernel for session {session_id}")
                await session.shutdown()
                await session.start()
                await websocket.send_json({"type": "restart_success", "content": "Kernel restarted successfully"})
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await session.shutdown()
        if session_id in sessions:
            del sessions[session_id]

if __name__ == "__main__":
    import uvicorn
    print("Starting Luna Book with Real Jupyter Backend on http://localhost:8009")
    uvicorn.run(app, host="127.0.0.1", port=8009)