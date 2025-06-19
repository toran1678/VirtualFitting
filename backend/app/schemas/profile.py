from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional
from datetime import date, datetime

# 프로필 수정 요청 스키마
class ProfileUpdateRequest(BaseModel):
    nickname: Optional[str] = Field(None, min_length=2, max_length=50)
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, min_length=10, max_length=20)
    birth_date: Optional[str] = None  # YYYY-MM-DD 형식
    address: Optional[str] = Field(None, max_length=500)
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "nickname": "새로운닉네임",
                    "name": "홍길동",
                    "email": "newemail@example.com",
                    "phone_number": "010-1234-5678",
                    "birth_date": "1990-01-01",
                    "address": "서울시 강남구"
                }
            ]
        }
    }

# 비밀번호 변경 요청 스키마
class PasswordChangeRequest(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=100)
    
    @field_validator('new_password')
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('비밀번호는 최소 8자 이상이어야 합니다')
        if not any(char.isdigit() for char in v):
            raise ValueError('비밀번호는 최소 1개 이상의 숫자를 포함해야 합니다')
        if not any(char.isalpha() for char in v):
            raise ValueError('비밀번호는 최소 1개 이상의 문자를 포함해야 합니다')
        return v

# 프라이버시 설정 요청 스키마
class PrivacySettingsRequest(BaseModel):
    is_private: Optional[bool] = None

# 프로필 정보 응답 스키마
class ProfileResponse(BaseModel):
    user_id: int
    id: str
    name: str
    nickname: str
    email: EmailStr
    phone_number: str
    birth_date: Optional[str] = None
    address: Optional[str] = None
    profile_picture: Optional[str] = None
    is_verified: bool
    is_private: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }

# 프로필 수정 응답 스키마
class ProfileUpdateResponse(BaseModel):
    success: bool
    message: str
    user: ProfileResponse

# 비밀번호 변경 응답 스키마
class PasswordChangeResponse(BaseModel):
    success: bool
    message: str

# 프라이버시 설정 응답 스키마
class PrivacySettingsResponse(BaseModel):
    success: bool
    message: str
    is_private: bool
