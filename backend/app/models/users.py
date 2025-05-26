from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, Enum, Text
from sqlalchemy.sql import func
from app.db.database import Base

# 사용자 테이블 (Users Table)
class Users(Base):
    __tablename__ = "users" # 테이블 이름

    user_id = Column(Integer, primary_key=True, autoincrement=True)     # 고유 번호
    id = Column(String(50), unique=True, nullable=False, index=True)    # 아이디    / 중복 불가, 필수
    name = Column(String(100), nullable=False)                          # 이름 (길이 증가)
    password_hash = Column(String(255), nullable=False)                 # 비밀번호(hash)
    nickname = Column(String(50), nullable=False, unique=True)          # 닉네임 (길이 증가)
    email = Column(String(255), unique=True, nullable=False, index=True)  # 이메일    / 중복 불가, 필수
    birth_date = Column(String(10), nullable=True)                        # 생년월일 (YYYY-MM-DD 형식)
    phone_number = Column(String(20), unique=True, nullable=False, index=True)  # 전화번호  / 중복 불가, 필수
    address = Column(Text, nullable=True)                    # 주소 (Text로 변경)
    profile_picture = Column(String(500), nullable=True)     # 프로필 이미지 URL (길이 증가)
    
    # 인증 관련
    is_verified = Column(Boolean, default=False)  # 이메일 인증 여부
    
    # 카카오 OAuth 관련 필드 (활성화)
    kakao_id = Column(String(100), unique=True, nullable=True, index=True)  # 카카오 사용자 ID
    provider_type = Column(Enum('local', 'kakao', name='provider_types'), default='local')  # 로그인 제공자
    
    # 메타데이터
    created_at = Column(DateTime(timezone=True), server_default=func.now())    # 계정 생성 시간
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()) # 계정 수정 시간
    last_login_at = Column(DateTime(timezone=True), nullable=True)  # 마지막 로그인 시간 (새로 추가)
