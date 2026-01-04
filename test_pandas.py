import requests

def test_pandas_code():
    code = '''
import pandas as pd

n = int(input("Enter number of students: "))
names, marks = [], []

for i in range(n):
    names.append(input("Enter name: "))
    marks.append(int(input("Enter marks: ")))

df = pd.DataFrame({"Name": names, "Marks": marks})
print(df)
'''
    
    try:
        response = requests.post("http://localhost:8000/execute", 
                               json={"code": code})
        result = response.json()
        
        if result["success"]:
            print("SUCCESS! Your pandas code works:")
            print(result["output"])
        else:
            print("ERROR:", result["error"])
            
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    test_pandas_code()