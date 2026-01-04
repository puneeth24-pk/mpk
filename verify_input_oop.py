import jupyter_client
import time
import json
import asyncio

async def verify_input_oop():
    print("Starting verification of Input and OOP...")
    
    km = jupyter_client.KernelManager(kernel_name='python3')
    km.start_kernel()
    kc = km.client()
    kc.start_channels()
    kc.wait_for_ready(timeout=60)
    print("Kernel started.")

    results = {
        "oop": False,
        "input": False
    }

    # Test OOP
    oop_code = """
class Person:
    def __init__(self, name):
        self.name = name
    
    def greet(self):
        return f"Hello, I am {self.name}"

p = Person("Luna")
print(p.greet())
"""
    print("--- Testing OOP ---")
    outs = run_code_sync(kc, oop_code)
    if any("Hello, I am Luna" in o.get('text', '') for o in outs):
        print("✅ OOP Verified")
        results["oop"] = True
    else:
        print("❌ OOP Failed")
        print(outs)

    # Test Input
    # Input is tricky because it blocks execution until input is received via stdin channel.
    # We need to simulate the frontend's role:
    # 1. Send execute request
    # 2. Wait for input_request on stdin channel
    # 3. Send input_reply on stdin channel
    # 4. Wait for execution to finish
    
    input_code = """
name = input("Enter your name: ")
print(f"Welcome, {name}!")
"""
    print("--- Testing Input (Simulated) ---")
    
    # We'll use a slightly different flow for input testing since it requires interaction
    msg_id = kc.execute(input_code)
    
    input_verified = False
    
    while True:
        try:
            # Check for input request on stdin channel (some clients receive it on iopub too depending on config, but mostly stdin)
            # Actually jupyter_client handles this. 
            # We need to poll checking for 'input_request'
            
            # Using get_stdin_msg for input requests
            try:
                msg = kc.get_stdin_msg(timeout=1)
                if msg['header']['msg_type'] == 'input_request':
                    print(f"Received input request: {msg['content']['prompt']}")
                    kc.input("AntiGravityUser")
                    print("Sent input reply: AntiGravityUser")
            except:
                pass

            # Check iopub for output
            try:
                msg = kc.get_iopub_msg(timeout=1)
                if msg['parent_header'].get('msg_id') == msg_id:
                    msg_type = msg['msg_type']
                    content = msg['content']
                    
                    if msg_type == 'stream':
                        text = content['text']
                        print(f"Output: {text.strip()}")
                        if "Welcome, AntiGravityUser!" in text:
                            print("✅ Input Verified")
                            input_verified = True
                            results["input"] = True
                    
                    elif msg_type == 'status' and content['execution_state'] == 'idle':
                        break
            except:
                pass
                
            if input_verified: 
                # Wait a bit for status idle then break
                pass
                
        except KeyboardInterrupt:
            break
            
    km.shutdown_kernel()
    return results

def run_code_sync(kc, code):
    msg_id = kc.execute(code)
    outputs = []
    while True:
        try:
            msg = kc.get_iopub_msg(timeout=5)
            if msg['parent_header'].get('msg_id') == msg_id:
                msg_type = msg['msg_type']
                content = msg['content']
                if msg_type == 'stream':
                    outputs.append({'type': 'stream', 'text': content['text']})
                    # print(f"stream: {content['text']}")
                elif msg_type == 'error':
                     outputs.append({'type': 'error', 'text': str(content)})
                elif msg_type == 'status' and content['execution_state'] == 'idle':
                    break
        except:
            break
    return outputs

if __name__ == "__main__":
    import asyncio
    asyncio.run(verify_input_oop())
