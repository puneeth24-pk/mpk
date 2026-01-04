import tempfile
import subprocess
import sys
import os
import re

# Original calculator code
code = '''class Calculator:
    def add(self,a,b): return a+b
    def sub(self,a,b): return a-b
    def mul(self,a,b): return a*b
    def div(self,a,b): return a/b if b!=0 else "Zero error"

calc = Calculator()

while True:
    print("\\n1.Add 2.Sub 3.Mul 4.Div 5.Exit")
    ch = int(input("Choose: "))

    if ch == 5:
        break

    a = int(input("Enter a: "))
    b = int(input("Enter b: "))

    if ch == 1:
        print(calc.add(a,b))
    elif ch == 2:
        print(calc.sub(a,b))
    elif ch == 3:
        print(calc.mul(a,b))
    elif ch == 4:
        print(calc.div(a,b))
    else:
        print("Invalid choice")'''

print("Original code:")
print(code)
print("\n" + "="*50 + "\n")

# Apply transformations
mock_code = code

# Replace specific input patterns
mock_code = mock_code.replace('input("Choose: ")', '"1"')
mock_code = mock_code.replace('input("Enter a: ")', '"10"')
mock_code = mock_code.replace('input("Enter b: ")', '"5"')

# Handle while True loops by limiting iterations
if 'while True:' in mock_code:
    mock_code = mock_code.replace('while True:', 'for _ in range(3):')
    mock_code = mock_code.replace('break', 'continue')

# Replace any remaining input() calls
mock_code = re.sub(r'input\\([^)]*\\)', '"1"', mock_code)

print("Transformed code:")
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
    timeout=10
)

os.unlink(temp_file)

print("Output:")
print(result.stdout)
if result.stderr:
    print("Error:")
    print(result.stderr)