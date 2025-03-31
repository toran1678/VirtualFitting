from sqlalchemy.orm import Session
from app.models.users import Users
from app.schemas.users import UserCreate
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__default_rounds=12
)

def get_password_hash(password: str):
    return pwd_context.hash(password)

def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = Users(
        name=user.name,
        password_hash=hashed_password,
        nickname=user.nickname,
        email=user.email,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user(db: Session, user_id: int):
    return db.query(Users).filter(Users.user_id == user_id).first()