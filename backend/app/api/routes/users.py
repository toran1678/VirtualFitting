from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.users import UserCreate, UserRead
from app.crud import users as crud_user
from app.db.database import get_db

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserRead)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    return crud_user.create_user(db, user)

@router.get("/{user_id}", response_model=UserRead)
def read_user(user_id: int, db: Session = Depends(get_db)):
    return crud_user.get_user(db, user_id)