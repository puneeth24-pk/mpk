import requests
import json
import time

def test_luna_book():
    """Test all Luna Book functionality"""
    base_url = "http://localhost:8000"
    
    print("🌙📘 Testing Luna Book Functionality")
    print("=" * 50)
    
    # Test 1: Health check
    print("1. Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
        else:
            print("❌ Health check failed")
            return
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        print("Make sure to run: python backend.py")
        return
    
    # Test 2: Basic Python execution
    print("\n2. Testing basic Python execution...")
    test_code = """
print("Hello from Luna Book!")
x = 10
y = 20
result = x + y
print(f"Sum: {result}")
"""
    
    response = requests.post(f"{base_url}/execute", json={
        "code": test_code,
        "cell_id": "test-1",
        "variables": {}
    })
    
    if response.status_code == 200:
        result = response.json()
        if result["success"]:
            print("✅ Basic Python execution works")
            print(f"   Output: {result['output'][:50]}...")
        else:
            print(f"❌ Execution failed: {result['error']}")
    else:
        print("❌ Request failed")
    
    # Test 3: NumPy
    print("\n3. Testing NumPy...")
    numpy_code = """
import numpy as np
arr = np.array([1, 2, 3, 4, 5])
print(f"Array: {arr}")
print(f"Mean: {np.mean(arr)}")
"""
    
    response = requests.post(f"{base_url}/execute", json={
        "code": numpy_code,
        "cell_id": "test-2",
        "variables": {}
    })
    
    if response.status_code == 200:
        result = response.json()
        if result["success"] and "Array:" in result["output"]:
            print("✅ NumPy works")
        else:
            print(f"❌ NumPy failed: {result.get('error', 'Unknown error')}")
    
    # Test 4: Pandas
    print("\n4. Testing Pandas...")
    pandas_code = """
import pandas as pd
data = {'Name': ['Alice', 'Bob'], 'Age': [25, 30]}
df = pd.DataFrame(data)
print(f"DataFrame shape: {df.shape}")
print(df.head())
"""
    
    response = requests.post(f"{base_url}/execute", json={
        "code": pandas_code,
        "cell_id": "test-3",
        "variables": {}
    })
    
    if response.status_code == 200:
        result = response.json()
        if result["success"] and "DataFrame" in result["output"]:
            print("✅ Pandas works")
        else:
            print(f"❌ Pandas failed: {result.get('error', 'Unknown error')}")
    
    # Test 5: Matplotlib
    print("\n5. Testing Matplotlib...")
    matplotlib_code = """
import matplotlib.pyplot as plt
import numpy as np
x = np.linspace(0, 10, 10)
y = np.sin(x)
plt.figure(figsize=(8, 6))
plt.plot(x, y)
plt.title('Test Plot')
plt.show()
"""
    
    response = requests.post(f"{base_url}/execute", json={
        "code": matplotlib_code,
        "cell_id": "test-4",
        "variables": {}
    })
    
    if response.status_code == 200:
        result = response.json()
        if result["success"] and len(result.get("plots", [])) > 0:
            print("✅ Matplotlib works - plot generated")
        else:
            print(f"❌ Matplotlib failed: {result.get('error', 'No plots generated')}")
    
    # Test 6: Scikit-learn
    print("\n6. Testing Scikit-learn...")
    sklearn_code = """
from sklearn.linear_model import LinearRegression
import numpy as np
X = np.array([[1], [2], [3], [4]])
y = np.array([2, 4, 6, 8])
model = LinearRegression()
model.fit(X, y)
score = model.score(X, y)
print(f"R² Score: {score}")
"""
    
    response = requests.post(f"{base_url}/execute", json={
        "code": sklearn_code,
        "cell_id": "test-5",
        "variables": {}
    })
    
    if response.status_code == 200:
        result = response.json()
        if result["success"] and "Score:" in result["output"]:
            print("✅ Scikit-learn works")
        else:
            print(f"❌ Scikit-learn failed: {result.get('error', 'Unknown error')}")
    
    # Test 7: Error handling
    print("\n7. Testing error handling...")
    error_code = """
# This should cause an error
undefined_variable
"""
    
    response = requests.post(f"{base_url}/execute", json={
        "code": error_code,
        "cell_id": "test-6",
        "variables": {}
    })
    
    if response.status_code == 200:
        result = response.json()
        if not result["success"] and "NameError" in result["error"]:
            print("✅ Error handling works")
        else:
            print("❌ Error handling failed")
    
    # Test 8: Variable persistence
    print("\n8. Testing variable persistence...")
    var_code1 = "test_var = 'Hello World'"
    var_code2 = "print(f'Variable from previous cell: {test_var}')"
    
    # First execution
    response1 = requests.post(f"{base_url}/execute", json={
        "code": var_code1,
        "cell_id": "test-7a",
        "variables": {}
    })
    
    if response1.status_code == 200:
        result1 = response1.json()
        if result1["success"]:
            # Second execution with variables from first
            response2 = requests.post(f"{base_url}/execute", json={
                "code": var_code2,
                "cell_id": "test-7b",
                "variables": result1.get("variables", {})
            })
            
            if response2.status_code == 200:
                result2 = response2.json()
                if result2["success"] and "Hello World" in result2["output"]:
                    print("✅ Variable persistence works")
                else:
                    print("❌ Variable persistence failed")
    
    print("\n" + "=" * 50)
    print("🌙📘 Luna Book Test Complete!")
    print("If all tests passed, your Luna Book is ready!")
    print("Open http://localhost:8000 in your browser.")

if __name__ == "__main__":
    test_luna_book()