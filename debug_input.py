import requests

def debug_input():
    code = '''name = input("What's your name? ")
print(f"Hello {name}!")'''
    
    print("Original code:")
    print(code)
    print()
    
    # Test input detection
    response = requests.post("http://localhost:8006/execute", 
                           json={"code": code})
    result = response.json()
    
    if result.get("needs_input"):
        print("Detected prompts:", result["input_prompts"])
        
        # Test with exact prompt
        inputs = {"What's your name? ": "John"}
        print("Sending inputs:", inputs)
        
        response2 = requests.post("http://localhost:8006/execute", 
                                json={"code": code, "inputs": inputs})
        result2 = response2.json()
        
        print("Result:", result2)

if __name__ == "__main__":
    debug_input()