import jupyter_client
import time
import re

# BFS Graph code
code = '''from collections import deque

graph = {}
n = int(input("Enter number of nodes: "))

for i in range(n):
    node = input("Enter node: ")
    neighbours = input(f"Enter neighbours of {node} (space separated): ").split()
    graph[node] = neighbours

start = input("Enter start node: ")

visited = set()
queue = deque([start])

print("BFS Traversal:")
while queue:
    v = queue.popleft()
    if v not in visited:
        print(v, end=" ")
        visited.add(v)
        queue.extend(graph[v])'''

print("Original BFS code:")
print(code)
print("\n" + "="*50 + "\n")

# Transform code for better graph demo
if 'input(' in code:
    # Create a more realistic graph transformation
    transformed_code = '''from collections import deque

# Create sample graph: A->B,C  B->D  C->D  D->[]
graph = {
    "A": ["B", "C"],
    "B": ["D"],
    "C": ["D"], 
    "D": []
}

start = "A"

visited = set()
queue = deque([start])

print("BFS Traversal:")
while queue:
    v = queue.popleft()
    if v not in visited:
        print(v, end=" ")
        visited.add(v)
        queue.extend(graph[v])
print()  # New line after traversal'''
    
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
print("\\n[OK] BFS Graph test completed!")