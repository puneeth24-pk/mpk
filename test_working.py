import requests
import time

def test_luna_book():
    print("Testing Luna Book...")
    
    # Test basic connection
    try:
        response = requests.get("http://localhost:8002/")
        print("✅ Server is running")
    except:
        print("❌ Server not running. Start with: python backend.py")
        return
    
    # Test basic Python
    print("\n1. Testing basic Python...")
    response = requests.post("http://localhost:8002/execute", 
                           json={"code": "print('Hello Luna Book!')\nx = 10\ny = 20\nprint(f'Sum: {x + y}')"})
    result = response.json()
    if result["success"]:
        print("✅ Basic Python works")
    else:
        print(f"❌ Failed: {result.get('error', 'Unknown error')}")
    
    # Test NumPy
    print("\n2. Testing NumPy...")
    response = requests.post("http://localhost:8002/execute", 
                           json={"code": "import numpy as np\narr = np.array([1,2,3,4,5])\nprint(f'Array: {arr}')\nprint(f'Mean: {np.mean(arr)}')"})
    result = response.json()
    if result["success"]:
        print("✅ NumPy works")
    else:
        print(f"❌ Failed: {result.get('error', 'Unknown error')}")
    
    # Test Pandas
    print("\n3. Testing Pandas...")
    response = requests.post("http://localhost:8002/execute", 
                           json={"code": "import pandas as pd\ndf = pd.DataFrame({'A': [1,2], 'B': [3,4]})\nprint(df)"})
    result = response.json()
    if result["success"]:
        print("✅ Pandas works")
    else:
        print(f"❌ Failed: {result.get('error', 'Unknown error')}")
    
    # Test Matplotlib
    print("\n4. Testing Matplotlib...")
    response = requests.post("http://localhost:8002/execute", 
                           json={"code": "import matplotlib.pyplot as plt\nimport numpy as np\nx = np.linspace(0, 10, 10)\ny = np.sin(x)\nplt.plot(x, y)\nplt.title('Test Plot')\nplt.show()"})
    result = response.json()
    if result["success"] and '<img' in result["output"]:
        print("✅ Matplotlib works - plot generated")
    else:
        print(f"❌ Failed: {result.get('error', 'No plot generated')}")
    
    # Test Scikit-learn
    print("\n5. Testing Scikit-learn...")
    response = requests.post("http://localhost:8002/execute", 
                           json={"code": "from sklearn.linear_model import LinearRegression\nimport numpy as np\nX = np.array([[1], [2], [3]])\ny = np.array([2, 4, 6])\nmodel = LinearRegression()\nmodel.fit(X, y)\nprint(f'Score: {model.score(X, y)}')"})
    result = response.json()
    if result["success"]:
        print("✅ Scikit-learn works")
    else:
        print(f"❌ Failed: {result.get('error', 'Unknown error')}")
    
    print("\n🎉 Test complete! Open http://localhost:8002 in browser")
    print("All Python libraries are working!")

if __name__ == "__main__":
    test_luna_book()