from sqlalchemy.orm import Session
from app.models.users import Users
from app.schemas.users import UserCreate

def create_user(db: Session, user: UserCreate):
    db_user = Users(
        name=user.name,
        nickname=user.nickname,
        email=user.email,
        password=user.password,
        password_hash=user.password_hash
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user(db: Session, user_id: int):
    return db.query(Users).filter(Users.user_id == user_id).first()