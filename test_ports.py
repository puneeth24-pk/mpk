import requests

def test_ports():
    code = '''
import numpy as np

n = int(input("Enter size: "))
arr = np.array([int(input(f"Enter element {i+1}: ")) for i in range(n)])

print("Array:", arr)
print("Max:", np.max(arr))
print("Min:", np.min(arr))
print("Average:", np.mean(arr))
'''
    
    ports = [8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008]
    
    for port in ports:
        try:
            response = requests.post(f"http://localhost:{port}/execute", 
                                   json={"code": code}, timeout=2)
            result = response.json()
            
            print(f"Port {port}: {'SUCCESS' if result['success'] else 'ERROR'}")
            if result["success"]:
                print("Output:", result["output"][:200] + "...")
                break
            else:
                print("Error:", result["error"][:100] + "...")
                
        except Exception as e:
            print(f"Port {port}: Not available")

if __name__ == "__main__":
    test_ports()