import requests

def test_backend():
    try:
        response = requests.post("http://localhost:8008/execute", 
                               json={"code": "print('Hello World')\nx = 10\nprint(f'x = {x}')"})
        result = response.json()
        
        if result["success"]:
            print("Backend working!")
            print("Output:", result["output"])
        else:
            print("Backend error:", result["error"])
            
    except Exception as e:
        print(f"Connection error: {e}")
        print("Start server: python backend.py")

if __name__ == "__main__":
    test_backend()