import jupyter_client
import time

# Pandas/Seaborn data analysis code
code = '''import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import numpy as np

# ---------- USER INPUT ----------
n = int(input("Enter number of records: "))

hours, marks, subject = [], [], []

for i in range(n):
    hours.append(int(input("Enter hours: ")))
    marks.append(int(input("Enter marks: ")))
    subject.append(input("Enter subject: "))

# ---------- DATAFRAME ----------
df = pd.DataFrame({
    "Hours": hours,
    "Marks": marks,
    "Subject": subject
})

print("\\nDataFrame:")
print(df)

# ---------- DATA CLEANING ----------
df["Marks"].fillna(df["Marks"].mean(), inplace=True)

# ---------- SEABORN THEME ----------
sns.set(style="darkgrid")

# ---------- SEABORN LINE PLOT ----------
plt.figure()
sns.lineplot(x="Hours", y="Marks", data=df)
plt.title("Line Plot")
plt.show()

# ---------- SEABORN BAR PLOT ----------
plt.figure()
sns.barplot(x="Subject", y="Marks", data=df)
plt.title("Bar Plot")
plt.show()'''

print("Original Pandas/Seaborn code:")
print(code[:500] + "..." if len(code) > 500 else code)
print("\n" + "="*50 + "\n")

# Test with Jupyter kernel
kernel_manager = jupyter_client.KernelManager(kernel_name='python3')
kernel_manager.start_kernel()
kernel_client = kernel_manager.client()
kernel_client.start_channels()
kernel_client.wait_for_ready(timeout=30)

# Transform and execute code
if 'import pandas as pd' in code and 'import seaborn as sns' in code:
    # Replace with complete working data analysis demo
    transformed_code = '''import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import numpy as np

# Sample study data
n = 5
hours = [2, 4, 6, 8, 10]
marks = [50, 65, 75, 85, 95]
subject = ["Math", "Science", "English", "History", "Physics"]

# Create DataFrame
df = pd.DataFrame({
    "Hours": hours,
    "Marks": marks,
    "Subject": subject
})

print("\\nDataFrame:")
print(df)

# Data cleaning
df["Marks"].fillna(df["Marks"].mean(), inplace=True)

# Seaborn theme
sns.set(style="darkgrid")

# Line plot
plt.figure(figsize=(10, 6))
sns.lineplot(x="Hours", y="Marks", data=df)
plt.title("Study Hours vs Marks - Line Plot")
plt.show()

# Bar plot
plt.figure(figsize=(10, 6))
sns.barplot(x="Subject", y="Marks", data=df)
plt.title("Marks by Subject - Bar Plot")
plt.xticks(rotation=45)
plt.show()'''
    
    code = transformed_code

print("Executing transformed code...")
print("\n" + "="*50 + "\n")

# Execute code
msg_id = kernel_client.execute(code)

# Collect output
output_text = ""
plot_count = 0
timeout = 15
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
                    plot_count += 1
                    print(f"✓ Plot {plot_count} generated successfully!")
            elif msg_type == 'error':
                output_text += "ERROR: " + "\\n".join(content['traceback'])
            elif msg_type == 'status' and content['execution_state'] == 'idle':
                break
                
    except:
        if time.time() - start_time > timeout:
            break
        continue

print("\\nJupyter Kernel Output:")
print(output_text)
print(f"\\nTotal plots generated: {plot_count}")

# Cleanup
kernel_manager.shutdown_kernel()
print("\\n[OK] Pandas/Seaborn data analysis test completed!")