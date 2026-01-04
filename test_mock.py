import tempfile
import subprocess
import sys
import os

# Original code with input()
code = '''name = input("What's your name? ")
age = int(input("How old are you? "))
print(f"Hello {name}, you are {age} years old!")'''

print("Original code:")
print(code)
print("\n" + "="*50 + "\n")

# Replace input() calls with mock data
mock_code = code
mock_code = mock_code.replace('input("What\'s your name? ")', '"John"')
mock_code = mock_code.replace('input("How old are you? ")', '"25"')

print("Mock code:")
print(mock_code)
print("\n" + "="*50 + "\n")

# Create temp file and run
with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
    f.write(mock_code)
    temp_file = f.name

result = subprocess.run(
    [sys.executable, temp_file],
    capture_output=True,
    text=True,
    timeout=30
)

os.unlink(temp_file)

print("Output:")
print(result.stdout)
if result.stderr:
    print("Error:")
    print(result.stderr)