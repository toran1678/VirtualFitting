from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.users import Users, Followers
from typing import List, Tuple

def get_followers_count(db: Session, user_id: int) -> int:
    """사용자의 팔로워 수 조회"""
    return db.query(Followers).filter(Followers.following_id == user_id).count()

def get_following_count(db: Session, user_id: int) -> int:
    """사용자의 팔로잉 수 조회"""
    return db.query(Followers).filter(Followers.follower_id == user_id).count()

def is_following(db: Session, follower_id: int, following_id: int) -> bool:
    """특정 사용자가 다른 사용자를 팔로우하고 있는지 확인"""
    follow_record = db.query(Followers).filter(
        Followers.follower_id == follower_id,
        Followers.following_id == following_id
    ).first()
    return follow_record is not None

def create_follow_relationship(db: Session, follower_id: int, following_id: int) -> Followers:
    """팔로우 관계 생성 (팔로우 요청 수락 시 사용)"""
    if follower_id == following_id:
        raise ValueError("자기 자신을 팔로우할 수 없습니다.")
    
    # 이미 팔로우 중인지 확인
    existing_follow = db.query(Followers).filter(
        Followers.follower_id == follower_id,
        Followers.following_id == following_id
    ).first()
    
    if existing_follow:
        # 이미 팔로우 중이면 기존 관계 반환
        return existing_follow
    
    # 새로운 팔로우 관계 생성
    new_follow = Followers(follower_id=follower_id, following_id=following_id)
    db.add(new_follow)
    db.commit()
    db.refresh(new_follow)
    
    return new_follow

def toggle_follow(db: Session, follower_id: int, following_id: int) -> Tuple[bool, int]:
    """팔로우 토글 (추가/제거)"""
    if follower_id == following_id:
        raise ValueError("자기 자신을 팔로우할 수 없습니다.")
    
    # 기존 팔로우 확인
    existing_follow = db.query(Followers).filter(
        Followers.follower_id == follower_id,
        Followers.following_id == following_id
    ).first()
    
    if existing_follow:
        # 팔로우 제거
        db.delete(existing_follow)
        is_following_now = False
    else:
        # 팔로우 추가
        new_follow = Followers(follower_id=follower_id, following_id=following_id)
        db.add(new_follow)
        is_following_now = True
    
    db.commit()
    
    # 업데이트된 팔로워 수 조회
    followers_count = get_followers_count(db, following_id)
    
    return is_following_now, followers_count

def get_user_followers(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Users]:
    """사용자의 팔로워 목록 조회"""
    return db.query(Users).join(
        Followers, Users.user_id == Followers.follower_id
    ).filter(
        Followers.following_id == user_id
    ).offset(skip).limit(limit).all()

def get_user_following(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Users]:
    """사용자의 팔로잉 목록 조회"""
    return db.query(Users).join(
        Followers, Users.user_id == Followers.following_id
    ).filter(
        Followers.follower_id == user_id
    ).offset(skip).limit(limit).all()
