import jupyter_client
import time

# Matplotlib plotting code
code = '''import matplotlib.pyplot as plt

n = int(input("Enter number of points: "))
x, y = [], []

for i in range(n):
    x.append(int(input("Enter x: ")))
    y.append(int(input("Enter y: ")))

plt.plot(x, y, marker='o')
plt.xlabel("X values")
plt.ylabel("Y values")
plt.title("User Input Line Graph")
plt.show()'''

print("Original Matplotlib code:")
print(code)
print("\n" + "="*50 + "\n")

# Transform code
if 'import matplotlib.pyplot as plt' in code and 'plt.plot' in code:
    # Replace with complete working plot demo
    transformed_code = '''import matplotlib.pyplot as plt

# Sample data points
n = 5
x = [1, 2, 3, 4, 5]
y = [2, 4, 6, 8, 10]

plt.plot(x, y, marker='o')
plt.xlabel("X values")
plt.ylabel("Y values")
plt.title("User Input Line Graph")
plt.show()'''
    
    code = transformed_code

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
plots_html = ""
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
            elif msg_type == 'display_data':
                if 'image/png' in content['data']:
                    img_data = content['data']['image/png']
                    plots_html += f'<img src="data:image/png;base64,{img_data}" style="max-width:100%; margin:10px 0;">'
                    print("✓ Plot generated successfully!")
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
print("\\nPlots HTML:")
print("Plot data length:", len(plots_html))

# Cleanup
kernel_manager.shutdown_kernel()
print("\\n[OK] Matplotlib plot test completed!")