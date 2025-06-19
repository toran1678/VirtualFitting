from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.users import Users
from app.schemas.profile import ProfileUpdateRequest, PasswordChangeRequest, PrivacySettingsRequest
from typing import Optional
import hashlib
import logging

logger = logging.getLogger(__name__)

def hash_password(password: str) -> str:
    """SHA-256을 사용한 간단한 비밀번호 해싱"""
    salt = "virtual_fitting_salt"
    salted_password = password + salt
    hashed = hashlib.sha256(salted_password.encode()).hexdigest()
    return hashed

def get_user_profile(db: Session, user_id: int) -> Optional[Users]:
    """사용자 프로필 정보 조회"""
    try:
        user = db.query(Users).filter(Users.user_id == user_id).first()
        return user
    except Exception as e:
        logger.error(f"프로필 조회 오류: {str(e)}")
        return None

def update_user_profile(
    db: Session, 
    user_id: int, 
    profile_data: ProfileUpdateRequest,
    profile_picture_path: Optional[str] = None
) -> Optional[Users]:
    """사용자 프로필 정보 수정"""
    try:
        user = db.query(Users).filter(Users.user_id == user_id).first()
        if not user:
            return None
        
        # 중복 검사
        if profile_data.email and profile_data.email != user.email:
            existing_email = db.query(Users).filter(
                and_(Users.email == profile_data.email, Users.user_id != user_id)
            ).first()
            if existing_email:
                raise ValueError("이미 등록된 이메일입니다.")
        
        if profile_data.nickname and profile_data.nickname != user.nickname:
            existing_nickname = db.query(Users).filter(
                and_(Users.nickname == profile_data.nickname, Users.user_id != user_id)
            ).first()
            if existing_nickname:
                raise ValueError("이미 사용 중인 닉네임입니다.")
        
        if profile_data.phone_number and profile_data.phone_number != user.phone_number:
            # 하이픈 제거
            phone_number = profile_data.phone_number.replace("-", "")
            existing_phone = db.query(Users).filter(
                and_(Users.phone_number == phone_number, Users.user_id != user_id)
            ).first()
            if existing_phone:
                raise ValueError("이미 등록된 전화번호입니다.")
            profile_data.phone_number = phone_number
        
        # 프로필 정보 업데이트
        update_data = profile_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            if value is not None:
                setattr(user, field, value)
        
        # 프로필 이미지 업데이트
        if profile_picture_path:
            user.profile_picture = profile_picture_path
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"프로필 수정 성공: user_id={user_id}")
        return user
        
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"프로필 수정 오류: {str(e)}")
        db.rollback()
        return None

def change_user_password(db: Session, user_id: int, new_password: str) -> bool:
    """사용자 비밀번호 변경"""
    try:
        user = db.query(Users).filter(Users.user_id == user_id).first()
        if not user:
            return False
        
        # 새 비밀번호 해싱
        hashed_password = hash_password(new_password)
        user.password_hash = hashed_password
        
        db.commit()
        
        logger.info(f"비밀번호 변경 성공: user_id={user_id}")
        return True
        
    except Exception as e:
        logger.error(f"비밀번호 변경 오류: {str(e)}")
        db.rollback()
        return False

def update_privacy_settings(db: Session, user_id: int, privacy_data: PrivacySettingsRequest) -> Optional[Users]:
    """프라이버시 설정 업데이트"""
    try:
        user = db.query(Users).filter(Users.user_id == user_id).first()
        if not user:
            return None
        
        if privacy_data.is_private is not None:
            user.is_private = privacy_data.is_private
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"프라이버시 설정 변경 성공: user_id={user_id}")
        return user
        
    except Exception as e:
        logger.error(f"프라이버시 설정 변경 오류: {str(e)}")
        db.rollback()
        return None
