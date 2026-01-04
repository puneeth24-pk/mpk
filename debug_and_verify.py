import jupyter_client
import time
import json

def run_debug():
    print("Starting Debug Kernel...")
    km = jupyter_client.KernelManager(kernel_name='python3')
    km.start_kernel()
    kc = km.client()
    kc.start_channels()
    kc.wait_for_ready(timeout=30)
    print("Kernel Ready.")

    # 1. Inspect execution environment and Numpy
    code_inspect = """
import numpy as np
import pandas as pd
import matplotlib
print(f"NumPy Version: {np.__version__}")
print(f"Pandas Version: {pd.__version__}")
print(f"Matplotlib Version: {matplotlib.__version__}")
try:
    print(f"np.square available: {callable(np.square)}")
except Exception as e:
    print(f"Error inspecting np: {e}")
"""
    print("--- Inspecting Libraries ---")
    run_code(kc, code_inspect)

    # 2. Configure Matplotlib Basic
    code_mpl = """
%matplotlib inline
import matplotlib.pyplot as plt
import numpy as np
x = np.linspace(0, 10, 100)
y = np.sin(x)
plt.figure()
plt.plot(x, y)
print("Plot created (hopefully)")
plt.show()
"""
    print("--- Testing Matplotlib Inline ---")
    run_code(kc, code_mpl)

    km.shutdown_kernel()

def run_code(kc, code):
    msg_id = kc.execute(code)
    while True:
        try:
            msg = kc.get_iopub_msg(timeout=5)
            if msg['parent_header'].get('msg_id') == msg_id:
                msg_type = msg['msg_type']
                content = msg['content']
                if msg_type == 'stream':
                    print(f"[STREAM {content['name']}]: {content['text'].strip()}")
                elif msg_type == 'error':
                    print(f"[ERROR]: {content['ename']}: {content['evalue']}")
                    for line in content['traceback']:
                        print(line)
                elif msg_type in ('execute_result', 'display_data'):
                    data = content['data']
                    if 'image/png' in data:
                        print(f"[DATA]: Got image/png data ({len(data['image/png'])} chars)")
                    elif 'text/plain' in data:
                        print(f"[RESULT]: {data['text/plain']}")
                elif msg_type == 'status' and content['execution_state'] == 'idle':
                    break
        except Exception:
            break

if __name__ == "__main__":
    run_debug()
