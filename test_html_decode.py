import html

# Test HTML entity decoding
test_codes = [
    'print(&quot;Hello&quot;)',  # HTML encoded quotes
    'print(&#39;World&#39;)',   # HTML encoded single quotes
    'print("Normal quotes")',   # Normal quotes
    'a = &quot;test&quot;\nprint(a)',  # Multi-line with HTML entities
]

print("Testing HTML entity decoding:")
for i, encoded_code in enumerate(test_codes, 1):
    print(f"\n{i}. Original (HTML encoded):")
    print(repr(encoded_code))
    
    decoded_code = html.unescape(encoded_code)
    print(f"   Decoded:")
    print(repr(decoded_code))
    
    # Test syntax validation
    try:
        compile(decoded_code, '<string>', 'exec')
        print("   [OK] Syntax valid")
        
        # Test execution
        exec(decoded_code)
        print("   [OK] Execution successful")
    except SyntaxError as e:
        print(f"   [ERROR] Syntax error: {e}")
    except Exception as e:
        print(f"   [ERROR] Runtime error: {e}")

print("\n" + "="*50)
print("Testing problematic case:")
problematic = 'print(&quot;'  # Unterminated string
print(f"Original: {repr(problematic)}")
decoded = html.unescape(problematic)
print(f"Decoded: {repr(decoded)}")

try:
    compile(decoded, '<string>', 'exec')
    print("[OK] Syntax valid")
except SyntaxError as e:
    print(f"[ERROR] Syntax error caught: {e}")