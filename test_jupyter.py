import jupyter_client
import time

# Test Jupyter kernel functionality
print("Testing Jupyter kernel integration...")

# Start kernel
kernel_manager = jupyter_client.KernelManager(kernel_name='python3')
kernel_manager.start_kernel()
kernel_client = kernel_manager.client()
kernel_client.start_channels()

# Wait for kernel to be ready
kernel_client.wait_for_ready(timeout=30)
print("[OK] Kernel started successfully!")

# Test code execution
test_code = """
name = "Alice"
age = 25
print(f"Hello {name}, you are {age} years old!")
"""

print(f"Executing code: {test_code.strip()}")

# Execute code
msg_id = kernel_client.execute(test_code)

# Collect output
output_text = ""
timeout = 10
start_time = time.time()

while True:
    try:
        msg = kernel_client.get_iopub_msg(timeout=1)
        
        if msg['parent_header'].get('msg_id') == msg_id:
            msg_type = msg['msg_type']
            content = msg['content']
            
            if msg_type == 'stream':
                output_text += content['text']
            elif msg_type == 'status' and content['execution_state'] == 'idle':
                break
                
    except:
        if time.time() - start_time > timeout:
            break
        continue

print(f"Output: {output_text}")

# Test variable persistence
test_code2 = "print(f'Name is still: {name}')"
print(f"Testing variable persistence: {test_code2}")

msg_id = kernel_client.execute(test_code2)
output_text2 = ""

while True:
    try:
        msg = kernel_client.get_iopub_msg(timeout=1)
        
        if msg['parent_header'].get('msg_id') == msg_id:
            msg_type = msg['msg_type']
            content = msg['content']
            
            if msg_type == 'stream':
                output_text2 += content['text']
            elif msg_type == 'status' and content['execution_state'] == 'idle':
                break
                
    except:
        break

print(f"Persistence test output: {output_text2}")

# Cleanup
kernel_manager.shutdown_kernel()
print("[OK] Jupyter kernel test completed successfully!")