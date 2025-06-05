from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional
from datetime import date, datetime

class UserBase(BaseModel):
    id: str = Field(..., min_length=4)
    name: str
    password: str = Field(..., min_length=8)
    nickname: str
    email: EmailStr
    birth_date: Optional[date] = None
    phone_number: str
    address: Optional[str] = None
    is_verified: bool = False
    
# 회원가입 시 사용자 정보
class RegisterUserInfo(BaseModel):
    user_id: int
    id: str
    name: str
    nickname: str
    email: EmailStr
    phone_number: str
    profile_picture: Optional[str] = None
    is_verified: bool

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "user_id": 1,
                    "id": "testuser123",
                    "name": "홍길동",
                    "nickname": "길동이",
                    "email": "test@example.com",
                    "phone_number": "01012345678",
                    "profile_picture": "/uploads/profile_pictures/test.png",
                    "is_verified": False
                }
            ]
        }
    }

# 회원가입 응답 스키마
class RegisterResponse(BaseModel):
    success: bool
    message: str
    user: RegisterUserInfo

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "test1",
                    "name": "홍길동",
                    "password": "password1!",
                    "nickname": "길동이",
                    "email": "test@example.com",
                    "birth_date": "1990-01-01",
                    "phone_number": "010-1234-5678",
                    "address": "서울시 강남구"
                }
            ]
        }
    }

class UserCreate(UserBase):
    @field_validator('password')
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('비밀번호는 최소 8자 이상이어야 합니다')
        if not any(char.isdigit() for char in v):
            raise ValueError('비밀번호는 최소 1개 이상의 숫자를 포함해야 합니다')
        if not any(char.isalpha() for char in v):
            raise ValueError('비밀번호는 최소 1개 이상의 문자를 포함해야 합니다')
        return v

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "id": "testuser",
                    "name": "홍길동",
                    "password": "password123",
                    "nickname": "길동이",
                    "email": "user@example.com",
                    "birth_date": "1990-01-01",
                    "phone_number": "010-1234-5678",
                    "address": "서울시 강남구",
                    "is_verified": True
                }
            ]
        }

class UserResponse(BaseModel):
    user_id: int
    id: str
    name: str
    nickname: str
    email: EmailStr
    is_verified: bool
    profile_picture: Optional[str] = None
    
    model_config = {
        "from_attributes": True
    }

# 사용자 프로필 조회 응답 스키마 추가
class UserProfileResponse(BaseModel):
    user_id: int
    email: str
    nickname: str
    profile_picture: Optional[str] = None
    is_private: bool = False
    followers_count: int = 0
    following_count: int = 0
    is_following: Optional[bool] = False  # 현재 로그인한 사용자가 이 사용자를 팔로우하고 있는지
    
    model_config = {
        "from_attributes": True
    }

# 팔로우 관련 스키마
class FollowRequest(BaseModel):
    user_id: int

class FollowResponse(BaseModel):
    is_following: bool
    followers_count: int
    message: str

class UserLogin(BaseModel):
    id: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    
class EmailVerificationRequest(BaseModel):
    email: EmailStr
    
class EmailVerificationCheck(BaseModel):
    email: EmailStr
    code: str
