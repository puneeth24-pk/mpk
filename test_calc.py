class Calculator:
    def add(self,a,b): return a+b
    def sub(self,a,b): return a-b
    def mul(self,a,b): return a*b
    def div(self,a,b): return a/b if b!=0 else "Zero error"

calc = Calculator()

while True:
    print("\n1.Add 2.Sub 3.Mul 4.Div 5.Exit")
    ch = int(input("Choose: "))

    if ch == 5:
        break

    a = int(input("Enter a: "))
    b = int(input("Enter b: "))

    if ch == 1:
        print(calc.add(a,b))
    elif ch == 2:
        print(calc.sub(a,b))
    elif ch == 3:
        print(calc.mul(a,b))
    elif ch == 4:
        print(calc.div(a,b))
    else:
        print("Invalid choice")