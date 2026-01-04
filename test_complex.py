import requests

def test_complex_code():
    code = '''
import numpy as np, pandas as pd, matplotlib.pyplot as plt, seaborn as sns

# ---------------- DATA ----------------
df = pd.DataFrame({
    "Hours":[1,2,3,4,5,np.nan],
    "Marks":[35,40,50,60,65,50],
    "Subject":["Math","Math","Sci","Sci","Eng","Eng"]
})

# ------------- DATA CLEANING ----------
df.fillna(df.mean(numeric_only=True), inplace=True)

# ------------- NUMPY TEST -------------
arr = np.array(df["Marks"])
print("Mean:", np.mean(arr), "Std:", np.std(arr))

# ----------- MATPLOTLIB ---------------
plt.figure()
plt.plot(df["Hours"], df["Marks"]); plt.title("Line"); plt.show()

plt.figure()
plt.bar(df["Subject"], df["Marks"]); plt.title("Bar"); plt.show()

plt.figure()
plt.scatter(df["Hours"], df["Marks"]); plt.title("Scatter"); plt.show()

print("ALL TESTS DONE SUCCESSFULLY")
'''
    
    try:
        response = requests.post("http://localhost:8005/execute", 
                               json={"code": code})
        result = response.json()
        
        if result["success"]:
            print("✅ Complex code executed successfully!")
            print("✅ Graphs generated:", "<img" in result["output"])
            print("✅ Output length:", len(result["output"]))
        else:
            print("❌ Failed:", result.get("error", "Unknown error"))
            
    except Exception as e:
        print(f"❌ Connection error: {e}")
        print("Make sure to run: python backend.py")

if __name__ == "__main__":
    test_complex_code()