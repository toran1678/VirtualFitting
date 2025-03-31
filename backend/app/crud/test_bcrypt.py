import bcrypt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

print(bcrypt.__version__)

def main():
    password = "test1234"
    hashed = pwd_context.hash(password)
    print("Hashed:", hashed)
    print("Verify:", pwd_context.verify(password, hashed))

if __name__ == "__main__":
    main()