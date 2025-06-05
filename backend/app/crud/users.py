from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.users import Users, Followers
from app.schemas.users import UserProfileResponse
from typing import Optional

def get_user_by_email(db: Session, email: str) -> Optional[Users]:
    """이메일로 사용자 조회"""
    return db.query(Users).filter(Users.email == email).first()

def get_user_profile_by_email(db: Session, email: str, current_user_id: Optional[int] = None) -> Optional[UserProfileResponse]:
    """이메일로 사용자 프로필 정보 조회"""
    user = get_user_by_email(db, email)
    if not user:
        return None
    
    # 팔로워, 팔로잉 수 계산
    followers_count = db.query(Followers).filter(Followers.following_id == user.user_id).count()
    following_count = db.query(Followers).filter(Followers.follower_id == user.user_id).count()
    
    # 현재 로그인한 사용자가 이 사용자를 팔로우하고 있는지 확인
    is_following = False
    if current_user_id and current_user_id != user.user_id:
        follow_record = db.query(Followers).filter(
            Followers.follower_id == current_user_id,
            Followers.following_id == user.user_id
        ).first()
        is_following = follow_record is not None
    
    return UserProfileResponse(
        user_id=user.user_id,
        email=user.email,
        nickname=user.nickname,
        profile_picture=user.profile_picture,
        is_private=user.is_private,
        followers_count=followers_count,
        following_count=following_count,
        is_following=is_following
    )
