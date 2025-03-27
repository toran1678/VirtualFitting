from pydantic import BaseModel

class UserBase(BaseModel):
    name: str
    nickname: str
    email: str

class UserCreate(UserBase):
    password: str
    password_hash: str

class UserRead(UserBase):
    user_id: int

    class Config:
        orm_mode = True
