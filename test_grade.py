import requests

def test_grade_code():
    code = '''
class Grade:
    def __init__(self, marks):
        self.marks = marks

    def show_grade(self):
        if self.marks >= 90:
            print("Grade A")
        elif self.marks >= 75:
            print("Grade B")
        elif self.marks >= 50:
            print("Grade C")
        else:
            print("Fail")

m = int(input("Enter marks: "))
g = Grade(m)
g.show_grade()
'''
    
    try:
        response = requests.post("http://localhost:8000/execute", 
                               json={"code": code})
        result = response.json()
        
        if result["success"]:
            print("SUCCESS! Your class code works:")
            print(result["output"])
        else:
            print("ERROR:", result["error"])
            
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    test_grade_code()