import jupyter_client
import time
import json
import base64

def verify_stack():
    print("Starting verification of Scientific Stack (NumPy, Pandas, Matplotlib)...")
    
    km = jupyter_client.KernelManager(kernel_name='python3')
    km.start_kernel()
    kc = km.client()
    kc.start_channels()
    kc.wait_for_ready(timeout=60)
    print("Kernel started.")

    results = {
        "numpy": False,
        "pandas": False,
        "matplotlib": False
    }

    # Test NumPy
    numpy_code = """
import numpy as np
arr = np.array([1, 2, 3])
print(f"Numpy Array: {arr}")
"""
    print("Testing NumPy...")
    outs = execute_code(kc, numpy_code)
    if any("Numpy Array: [1 2 3]" in o.get('text', '') for o in outs):
        print("✅ NumPy Verified")
        results["numpy"] = True
    else:
        print("❌ NumPy Failed")
        print(outs)

    # Test Pandas
    pandas_code = """
import pandas as pd
df = pd.DataFrame({'A': [1, 2], 'B': [3, 4]})
print(df.to_string())
"""
    print("Testing Pandas...")
    outs = execute_code(kc, pandas_code)
    # Check for DataFrame string representation
    if any("   A  B" in o.get('text', '') for o in outs):
        print("✅ Pandas Verified")
        results["pandas"] = True
    else:
        print("❌ Pandas Failed")
        print(outs)

    # Test Matplotlib
    # We need to ensure inline backend is active if we want images, 
    # but here we just check if it runs without error and maybe produces something.
    # Standard jupyter client might not produce image data unless configured purely via code protocols.
    # We force `%matplotlib inline` behavior if possible, or just generate a figure and save it/show it.
    mpl_code = """
import matplotlib.pyplot as plt
import io
import base64
fig = plt.figure()
plt.plot([1, 2], [3, 4])
# In a real notebook, plt.show() triggers display_data hook.
# Here we can also manually check if it raises no error.
print("Matplotlib OK")
"""
    print("Testing Matplotlib...")
    outs = execute_code(kc, mpl_code)
    if any("Matplotlib OK" in o.get('text', '') for o in outs):
        print("✅ Matplotlib Import/Execution Verified")
        results["matplotlib"] = True
    else:
        print("❌ Matplotlib Failed")
        print(outs)

    km.shutdown_kernel()
    return results

def execute_code(kc, code):
    msg_id = kc.execute(code)
    outputs = []
    while True:
        try:
            msg = kc.get_iopub_msg(timeout=2)
            if msg['parent_header'].get('msg_id') == msg_id:
                msg_type = msg['msg_type']
                content = msg['content']
                if msg_type == 'stream':
                    outputs.append({'type': 'stream', 'text': content['text']})
                elif msg_type in ('execute_result', 'display_data'):
                    outputs.append({'type': 'data', 'data': content['data']})
                elif msg_type == 'error':
                    outputs.append({'type': 'error', 'traceback': content['traceback']})
                elif msg_type == 'status' and content['execution_state'] == 'idle':
                    break
        except:
            break
    return outputs

if __name__ == "__main__":
    verify_stack()
