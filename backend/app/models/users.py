from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean
from app.db.database import Base
from datetime import datetime, timezone

# 사용자 테이블 (Users Table)
class Users(Base):
    __tablename__ = "users" # 테이블 이름

    user_id = Column(Integer, primary_key=True, autoincrement=True) # 고유 번호
    id = Column(String(50), unique=True, nullable=False)            # 아이디    / 중복 불가, 필수
    name = Column(String(10), nullable=False)                       # 이름
    password_hash = Column(String(255), nullable=False)             # 비밀번호(hash)
    nickname = Column(String(20), nullable=False, unique=True)      # 닉네임
    email = Column(String(100), unique=True, nullable=False)        # 이메일    / 중복 불가, 필수
    birth_date = Column(Date, nullable=True)                        # 생년월일
    phone_number = Column(String(20), unique=True, nullable=False)  # 전화번호  / 중복 불가, 필수
    address = Column(String(255), nullable=True)                    # 주소
    profile_picture = Column(String(255), nullable=True)            # 프로필 이미지
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))    # 계정 생성 시간
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=datetime.now) # 계정 수정 시간
    # 추가 컬럼 제안
    kakao_id = Column(String(100), unique=True, nullable=True)  # 카카오 사용자 ID
    provider_type = Column(String(20), nullable=True)  # 로그인 제공자 (일반, 카카오, 네이버 등)
    is_verified = Column(Boolean, default=False)  # 이메일 인증 여부
    refresh_token = Column(String(255), nullable=True)  # OAuth 리프레시 토큰 (선택적)