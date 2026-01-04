import requests

def test_input():
    code = '''
name = input("What's your name? ")
age = input("How old are you? ")
print(f"Hello {name}, you are {age} years old!")
'''
    
    try:
        response = requests.post("http://localhost:8006/execute", 
                               json={"code": code})
        result = response.json()
        
        if result.get("needs_input"):
            print("Input detection works")
            print("Prompts:", result["input_prompts"])
            
            inputs = {
                "What's your name? ": "John",
                "How old are you? ": "25"
            }
            
            response2 = requests.post("http://localhost:8006/execute", 
                                    json={"code": code, "inputs": inputs})
            result2 = response2.json()
            
            if result2["success"]:
                print("Input handling works!")
                print("Output:", result2["output"])
            else:
                print("Input execution failed:", result2.get("error"))
        else:
            print("Input detection failed")
            
    except Exception as e:
        print(f"Connection error: {e}")
        print("Make sure server is running: python backend.py")

if __name__ == "__main__":
    test_input()