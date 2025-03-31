from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.users import UserCreate, UserResponse
from app.crud import users as crud_users
from app.db.database import get_db

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

@router.post("/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    return crud_users.create_user(db, user)

@router.get("/{user_id}", response_model=UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)):
    return crud_users.get_user(db, user_id)

@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    # 닉네임 중복 확인
    existing = db.query(crud_users.Users).filter_by(nickname=user.nickname).first()
    if existing:
        raise HTTPException(status_code=400, detail="Nickname already exists")

    return crud_users.create_user(db, user)