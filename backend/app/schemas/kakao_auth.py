from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re

class KakaoAuthRequest(BaseModel):
    """카카오 OAuth 인증 요청"""
    authorization_code: str
    state: Optional[str] = None

class KakaoAuthResponse(BaseModel):
    """카카오 OAuth 인증 응답 (세션 기반)"""
    message: str
    user: Optional[dict] = None  # Optional로 변경하고 기본값 None 설정
    is_new_user: bool
    needs_signup: Optional[bool] = False  # 추가 필드
    kakao_info: Optional[dict] = None  # 추가 필드

class KakaoUserInfo(BaseModel):
    """카카오에서 받은 사용자 정보 (제한된 정보만)"""
    kakao_id: str
    email: Optional[EmailStr] = None
    nickname: Optional[str] = None
    profile_picture: Optional[str] = None
    is_email_verified: bool = False

class KakaoSignupRequest(BaseModel):
    """카카오 회원가입 - 추가 필수 정보 입력"""
    # authorization_code 제거 - 이미 checkKakaoUser에서 사용됨
    kakao_id: str  # 카카오 사용자 ID 사용
    
    # 카카오에서 제공되지 않는 필수 정보들
    name: str  # 실명
    phone_number: str  # 전화번호
    email: Optional[EmailStr] = None  # 카카오 이메일을 사용하지 않는 경우
    
    # 선택 정보들
    birth_date: Optional[str] = None  # YYYY-MM-DD 형식
    address: Optional[str] = None
    custom_nickname: Optional[str] = None  # 카카오 닉네임과 다르게 설정하고 싶은 경우
    
    @field_validator('phone_number')
    @classmethod
    def validate_phone_number(cls, v):
        # 한국 전화번호 형식 검증
        phone_pattern = re.compile(r'^010-\d{4}-\d{4}$')
        if not phone_pattern.match(v):
            raise ValueError('전화번호는 010-XXXX-XXXX 형식이어야 합니다.')
        return v
    
    @field_validator('birth_date')
    @classmethod
    def validate_birth_date(cls, v):
        if v is not None:
            # YYYY-MM-DD 형식 검증
            date_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}$')
            if not date_pattern.match(v):
                raise ValueError('생년월일은 YYYY-MM-DD 형식이어야 합니다.')
        return v

class KakaoUserCheckResponse(BaseModel):
    """카카오 사용자 존재 여부 확인 응답"""
    user_exists: bool
    kakao_info: dict
    needs_additional_info: bool = True  # 항상 추가 정보 필요

class AuthorizationUrlResponse(BaseModel):
    """인증 URL 응답"""
    authorization_url: str
    state: Optional[str] = None
