import requests

def test_your_code():
    code = '''
import numpy as np

n = int(input("Enter size: "))
arr = np.array([int(input(f"Enter element {i+1}: ")) for i in range(n)])

print("Array:", arr)
print("Max:", np.max(arr))
print("Min:", np.min(arr))
print("Average:", np.mean(arr))
'''
    
    try:
        response = requests.post("http://localhost:8008/execute", 
                               json={"code": code})
        result = response.json()
        
        if result["success"]:
            print("SUCCESS! Your code works:")
            print(result["output"])
        else:
            print("ERROR:", result["error"])
            
    except Exception as e:
        print(f"Connection error: {e}")
        print("Start server: python backend.py")

if __name__ == "__main__":
    test_your_code()