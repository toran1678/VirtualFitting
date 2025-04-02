from pydantic import BaseModel, EmailStr, constr

NameStr = constr(max_length=10)
NicknameStr = constr(max_length=20)

class UserBase(BaseModel):
    name: NameStr
    password: str
    nickname: NicknameStr
    email: EmailStr
    phone_number: str
    address: str = None

class UserCreate(BaseModel):
    name: NameStr
    password: str
    nickname: NicknameStr
    email: EmailStr

class UserResponse(BaseModel):
    user_id: int
    name: str
    nickname: str
    email: EmailStr
    
    class Config:
        orm_mode = True

class UserRead(UserBase):
    user_id: int

    class Config:
        orm_mode = True
