import re

# Test the problematic code
code = 'a=int("A")\nprint(a)'

print("Original problematic code:")
print(code)
print()

# Test smart input replacement
test_codes = [
    'a=int(input("Enter number: "))',
    'b=float(input("Enter float: "))',
    'c=input("Enter name: ")',
    'x=int(input("Age: "))\ny=input("Name: ")'
]

for test_code in test_codes:
    print(f"Original: {test_code}")
    
    # Apply smart replacements
    transformed = test_code
    # Replace input() calls that are wrapped in int() with numbers
    transformed = re.sub(r'int\(input\([^)]*\)\)', '42', transformed)
    # Replace input() calls that are wrapped in float() with numbers
    transformed = re.sub(r'float\(input\([^)]*\)\)', '3.14', transformed)
    # Replace remaining input() calls with strings
    transformed = re.sub(r'input\([^)]*\)', '"sample"', transformed)
    
    print(f"Transformed: {transformed}")
    print()

print("Testing execution:")
exec('a=42\nprint("a =", a)')
exec('b=3.14\nprint("b =", b)')
exec('c="sample"\nprint("c =", c)')