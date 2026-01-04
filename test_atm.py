class ATM:
    def __init__(self, balance):
        self.balance = balance

    def withdraw(self, amt):
        if amt <= self.balance:
            self.balance -= amt
            print("Withdrawn:", amt)
        else:
            print("Insufficient balance")

atm = ATM(5000)

while True:
    amt = int(input("Enter withdraw amount (0 to exit): "))
    if amt == 0:
        break
    atm.withdraw(amt)
    print("Balance:", atm.balance)