import jupyter_client
import time
import re

# ATM code
code = '''class ATM:
    def __init__(self, balance):
        self.balance = balance

    def withdraw(self, amt):
        if amt <= self.balance:
            self.balance -= amt
            print("Withdrawn:", amt)
        else:
            print("Insufficient balance")

atm = ATM(5000)

while True:
    amt = int(input("Enter withdraw amount (0 to exit): "))
    if amt == 0:
        break
    atm.withdraw(amt)
    print("Balance:", atm.balance)'''

print("Original ATM code:")
print(code)
print("\n" + "="*50 + "\n")

# Transform code
if 'input(' in code:
    # Replace specific ATM inputs
    code = code.replace('input("Enter withdraw amount (0 to exit): ")', '"1000"')
    # Handle while True loops
    if 'while True:' in code:
        code = code.replace('while True:', 'for _ in range(3):')
        code = code.replace('break', 'continue')
    # Replace any remaining input() calls
    code = re.sub(r'input\\([^)]*\\)', '"100"', code)

print("Transformed code:")
print(code)
print("\n" + "="*50 + "\n")

# Test with Jupyter kernel
kernel_manager = jupyter_client.KernelManager(kernel_name='python3')
kernel_manager.start_kernel()
kernel_client = kernel_manager.client()
kernel_client.start_channels()
kernel_client.wait_for_ready(timeout=30)

# Execute code
msg_id = kernel_client.execute(code)

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
            elif msg_type == 'error':
                output_text += "ERROR: " + "\\n".join(content['traceback'])
            elif msg_type == 'status' and content['execution_state'] == 'idle':
                break
                
    except:
        if time.time() - start_time > timeout:
            break
        continue

print("Jupyter Kernel Output:")
print(output_text)

# Cleanup
kernel_manager.shutdown_kernel()
print("\\n[OK] ATM test completed!")