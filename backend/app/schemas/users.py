from pydantic import BaseModel

class UserBase(BaseModel):
    name: str
    nickname: str
    email: str

class UserCreate(BaseModel):
    name: str
    nickname: str
    email: str
    password: str

class UserRead(UserBase):
    user_id: int

    class Config:
        orm_mode = True
