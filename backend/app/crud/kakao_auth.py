from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.users import Users
from app.schemas.kakao_auth import KakaoUserInfo
import hashlib
import secrets
import string
from typing import Optional

# 기존과 동일한 해싱 함수
def hash_password(password: str) -> str:
    salt = "virtual_fitting_salt"
    return hashlib.sha256((password + salt).encode()).hexdigest()

def get_user_by_kakao_id(db: Session, kakao_id: str) -> Optional[Users]:
    """카카오 ID로 사용자 조회"""
    return db.query(Users).filter(Users.kakao_id == kakao_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[Users]:
    """이메일로 사용자 조회"""
    return db.query(Users).filter(Users.email == email).first()

def get_user_by_phone(db: Session, phone_number: str) -> Optional[Users]:
    """전화번호로 사용자 조회"""
    return db.query(Users).filter(Users.phone_number == phone_number).first()

def check_duplicate_user_info(db: Session, email: str = None, phone_number: str = None, nickname: str = None) -> dict:
    """중복 정보 체크"""
    duplicates = {}
    
    if email:
        if db.query(Users).filter(Users.email == email).first():
            duplicates['email'] = '이미 사용 중인 이메일입니다.'
    
    if phone_number:
        if db.query(Users).filter(Users.phone_number == phone_number).first():
            duplicates['phone_number'] = '이미 사용 중인 전화번호입니다.'
    
    if nickname:
        if db.query(Users).filter(Users.nickname == nickname).first():
            duplicates['nickname'] = '이미 사용 중인 닉네임입니다.'
    
    return duplicates

def create_kakao_user(
    db: Session, 
    kakao_info: KakaoUserInfo, 
    name: str,
    phone_number: str,
    email: Optional[str] = None,
    birth_date: Optional[str] = None,
    address: Optional[str] = None,
    custom_nickname: Optional[str] = None
) -> Users:
    """카카오 사용자 생성 - 프로필 사진 지원"""
    
    # 최종 이메일 결정 (사용자 입력 > 카카오 이메일)
    final_email = email or kakao_info.email
    if not final_email:
        raise ValueError("이메일은 필수 정보입니다.")
    
    # 임시 아이디 생성 (카카오 사용자는 별도 아이디 불필요)
    temp_id = f"kakao_{kakao_info.kakao_id}"
    
    # 임시 비밀번호 생성 (카카오 로그인이므로 실제로는 사용되지 않음)
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
    
    # 닉네임 결정 및 중복 처리
    final_nickname = custom_nickname or kakao_info.nickname or f"사용자{kakao_info.kakao_id[:8]}"
    original_nickname = final_nickname
    counter = 1
    while db.query(Users).filter(Users.nickname == final_nickname).first():
        final_nickname = f"{original_nickname}{counter}"
        counter += 1
    
    # 중복 체크
    duplicates = check_duplicate_user_info(db, final_email, phone_number, final_nickname)
    if duplicates:
        raise ValueError(f"중복된 정보가 있습니다: {duplicates}")
    
    db_user = Users(
        id=temp_id,
        name=name,
        password_hash=hash_password(temp_password),  # 기존 해싱 방식 사용
        nickname=final_nickname,
        email=final_email,
        birth_date=birth_date,
        phone_number=phone_number,
        address=address,
        profile_picture=kakao_info.profile_picture,  # 업로드된 프로필 사진 경로 사용
        kakao_id=kakao_info.kakao_id,
        provider_type="kakao",
        is_verified=kakao_info.is_email_verified if email is None else False
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def link_kakao_to_existing_user(db: Session, user: Users, kakao_id: str, profile_picture: str = None) -> Users:
    """기존 사용자에 카카오 계정 연동 - 프로필 사진 지원"""
    user.kakao_id = kakao_id
    if not user.provider_type:
        user.provider_type = "kakao"
    
    # 프로필 사진이 제공되고 기존에 없는 경우 업데이트
    if profile_picture and not user.profile_picture:
        user.profile_picture = profile_picture
    
    db.commit()
    db.refresh(user)
    return user

def update_user_from_kakao(db: Session, user: Users, kakao_info: KakaoUserInfo) -> Users:
    """카카오 정보로 사용자 정보 업데이트"""
    # 프로필 사진 업데이트 (기존에 없는 경우만)
    if kakao_info.profile_picture and not user.profile_picture:
        user.profile_picture = kakao_info.profile_picture
    
    # 카카오 이메일과 동일한 경우 인증 상태 업데이트
    if kakao_info.email and user.email == kakao_info.email and kakao_info.is_email_verified:
        user.is_verified = True
    
    db.commit()
    db.refresh(user)
    return user
