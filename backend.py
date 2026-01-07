from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
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
import tempfile
import shutil
import glob

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
        self.current_execution = None
        self.is_executing = False
        self.temp_dir = None  # Dedicated storage for this session
        self.user_dir = None

    async def start(self, user_id: str):
        logger.info(f"Starting kernel for session {self.session_id} user {user_id}")
        
        # PERSISTENCE: Use consistent directory for the user
        base_storage = os.path.join(WORKING_DIR, "storage")
        os.makedirs(base_storage, exist_ok=True)
        
        self.user_dir = os.path.join(base_storage, user_id)
        
        if not os.path.exists(self.user_dir):
            os.makedirs(self.user_dir)
            logger.info(f"Created new persistent workspace for user {user_id}")
            
            # Initialize with default data files using HARD LINKS (fast, low space)
            try:
                for ext in ['*.csv', '*.xlsx', '*.json', '*.txt', '*.png', '*.jpg']:
                    for file_path in glob.glob(os.path.join(WORKING_DIR, ext)):
                        filename = os.path.basename(file_path)
                        dest_path = os.path.join(self.user_dir, filename)
                        if not os.path.exists(dest_path):
                            try:
                                os.link(file_path, dest_path)
                            except OSError:
                                # Fallback to copy if hard links fail (different drive etc)
                                shutil.copy(file_path, dest_path)
            except Exception as e:
                logger.warning(f"Failed to populate user workspace: {e}")
        else:
            logger.info(f"Resuming existing workspace for user {user_id}")
            
        self.temp_dir = self.user_dir # logical alias for backwards compat in class


        self.km = AsyncKernelManager(kernel_name='python3')
        # Use isolated directory as CWD
        await self.km.start_kernel(cwd=self.temp_dir)
        self.kc = self.km.client()
        self.kc.start_channels()
        
        try:
            await self.kc.wait_for_ready(timeout=60)
            self.started = True
            logger.info(f"Kernel ready for session {self.session_id}")
            
            # Run startup code silently
            # Add main directory to path so they can import modules if needed
            # Also ensure we are in the user dir
            startup_code = f"""
import sys
import os
sys.path.append(r"{WORKING_DIR}")
os.chdir(r"{self.user_dir}")
import matplotlib
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
%matplotlib inline
"""
            await self.execute_silent(startup_code) # Wait for idle

            
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

        # Check if already executing
        if self.is_executing:
            await websocket.send_json({
                "type": "error", 
                "cellId": cell_id, 
                "traceback": [f"Kernel is busy executing cell {self.current_execution}. Please wait or restart kernel."]
            })
            await websocket.send_json({"type": "complete", "cellId": cell_id})
            return

        # Mark as executing
        self.is_executing = True
        self.current_execution = cell_id
        logger.info(f"Starting execution for cell {cell_id}")

        try:
            msg_id = self.kc.execute(code)
            
            # Poll for messages
            while True:
                try:
                    # Check iopub
                    try:
                        msg = await self.kc.get_iopub_msg(timeout=0.02)  # Reduced from 0.05 to 0.02
                        await self._handle_iopub(websocket, msg, cell_id, msg_id)
                        
                        if msg['header']['msg_type'] == 'status' and \
                           msg['content']['execution_state'] == 'idle' and \
                           msg['parent_header']['msg_id'] == msg_id:
                            logger.info(f"Execution finished for cell {cell_id}")
                            break
                    except (asyncio.QueueEmpty, queue.Empty):
                        pass
                    except Exception as e:
                        logger.error(f"Error checking iopub: {e}")
                    
                    # Check stdin - FASTER timeout for quicker input detection
                    try:
                        msg = await self.kc.get_stdin_msg(timeout=0.01)
                        if msg['parent_header']['msg_id'] == msg_id:
                             if msg['header']['msg_type'] == 'input_request':
                                logger.info(f"Input requested for cell {cell_id}: {msg['content']['prompt']}")
                                # Send input request to frontend IMMEDIATELY
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
                                        logger.info(f"Input received for cell {cell_id}: {value}")
                                        break
                                    
                                    elif message.get("type") == "restart":
                                        logger.info("Restart requested while waiting for input")
                                        self.is_executing = False
                                        self.current_execution = None
                                        await self.shutdown()
                                        await self.start()
                                        await websocket.send_json({"type": "restart_success", "content": "Kernel restarted successfully"})
                                        return # Exit execution immediately
                                    
                                    elif message.get("type") == "execute":
                                        # Another cell trying to execute
                                        await websocket.send_json({
                                            "type": "error",
                                            "cellId": message.get("cellId"),
                                            "traceback": ["Kernel is waiting for input. Please complete the input prompt first or Restart Runtime."]
                                        })
                                        await websocket.send_json({"type": "complete", "cellId": message.get("cellId")})
                                    else:
                                        logger.warning(f"Ignored message type {message.get('type')} while waiting for input")
                    except (asyncio.QueueEmpty, queue.Empty):
                        pass
                    except Exception as e:
                        logger.error(f"Error checking stdin: {e}")
                    
                    # PERFORMANCE FIX: Increased sleep time to reduce CPU usage
                    # 1ms is too aggressive for 10+ users. 10ms (0.01) is sufficient/smooth.
                    await asyncio.sleep(0.01)

                except Exception as e:
                    logger.error(f"Error during execution: {e}")
                    break
            
        finally:
            # Always clear execution state
            self.is_executing = False
            self.current_execution = None
            logger.info(f"Cleared execution state for cell {cell_id}")
        
        await websocket.send_json({"type": "complete", "cellId": cell_id})

    async def input(self, value: str):
        if self.kc:
            self.kc.input(value)

    async def shutdown(self):
        if self.km:
            logger.info(f"Shutting down kernel for session {self.session_id}")
            try:
                await self.km.shutdown_kernel()
            except Exception as e:
                logger.warning(f"Error shutting down kernel: {e}")
            self.started = False
            self.km = None
            self.kc = None
            
            # DO NOT DELETE persistent user storage
            # But we might want to clean up if it was a temp/guest user?
            # For now, keep it for persistence.


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

app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "luna-book"}

@app.get("/")
async def get_index():
    # Serve React Build
    if os.path.exists("dist/index.html"):
        with open("dist/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(f.read())
    # Fallback to Legacy if build missing (Safety)
    if os.path.exists("index_legacy.html"):
        with open("index_legacy.html", "r", encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>Luna Book: Please run 'npm run build'</h1>")

@app.get("/{filename}")
async def get_file(filename: str):
    # Try serving from dist root (e.g. vite.svg)
    dist_path = os.path.join(WORKING_DIR, "dist", filename)
    if os.path.exists(dist_path) and os.path.isfile(dist_path):
        return FileResponse(dist_path)
    
    # Try serving from public (legacy mapping if copied to dist/public or root)
    # Since we moved app.js to public/, Vite copies it to dist/ root on build.
    # So dist/app.js should exist.
    
    # Legacy fallback for root files
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
async def websocket_endpoint(websocket: WebSocket, userId: str = "guest"):
    await websocket.accept()
    
    # Create new session for this connection
    session_id = str(uuid.uuid4())
    session = KernelSession(session_id)
    sessions[session_id] = session
    
    try:
        await session.start(user_id=userId)

        
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
    # Respect Railway's $PORT environment variable
    port = int(os.environ.get("PORT", 8020))
    # Bind to 0.0.0.0 for external access in cloud environments
    print(f"Starting Luna Book with Real Jupyter Backend on http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)