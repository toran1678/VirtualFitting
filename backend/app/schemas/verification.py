from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class VerificationRequest(BaseModel):
    """이메일 인증 요청 스키마"""
    email: EmailStr

class VerificationResponse(BaseModel):
    """이메일 인증 응답 스키마"""
    message: str
    code: Optional[str] = None

class VerificationVerifyRequest(BaseModel):
    """이메일 인증 코드 확인 요청 스키마"""
    email: EmailStr
    code: str

class VerificationVerifyResponse(BaseModel):
    """이메일 인증 코드 확인 응답 스키마"""
    success: bool
    message: str
