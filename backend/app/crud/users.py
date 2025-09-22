from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.users import Users, Followers
from app.schemas.users import UserProfileResponse
from typing import Optional, List, Tuple

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

def search_users(db: Session, query: str, current_user_id: Optional[int] = None, skip: int = 0, limit: int = 20) -> Tuple[List[UserProfileResponse], int]:
    """사용자 검색 (이름 또는 이메일로 검색)"""
    # 검색어가 비어있으면 빈 결과 반환
    if not query.strip():
        return [], 0
    
    # 이름 또는 이메일에서 검색
    search_filter = or_(
        Users.nickname.contains(query),
        Users.email.contains(query)
    )
    
    # 총 개수 계산
    total = db.query(Users).filter(search_filter).count()
    
    # 사용자 목록 조회
    users = db.query(Users).filter(search_filter).offset(skip).limit(limit).all()
    
    # UserProfileResponse 형태로 변환
    results = []
    for user in users:
        # 팔로워, 팔로잉 수 계산
        followers_count = db.query(Followers).filter(Followers.following_id == user.user_id).count()
        following_count = db.query(Followers).filter(Followers.follower_id == user.user_id).count()
        
        # 현재 로그인한 사용자가 이 사용자를 팔로우하고 있는지 확인
        is_following = False
        has_pending_request = False
        if current_user_id and current_user_id != user.user_id:
            follow_record = db.query(Followers).filter(
                Followers.follower_id == current_user_id,
                Followers.following_id == user.user_id
            ).first()
            is_following = follow_record is not None
            
            # 팔로우 요청이 있는지 확인 (비공개 계정인 경우)
            if not is_following and user.is_private:
                from app.crud.follow_requests import has_pending_follow_request
                has_pending_request = has_pending_follow_request(db, current_user_id, user.user_id)
        
        results.append(UserProfileResponse(
            user_id=user.user_id,
            email=user.email,
            nickname=user.nickname,
            profile_picture=user.profile_picture,
            is_private=user.is_private,
            followers_count=followers_count,
            following_count=following_count,
            is_following=is_following,
            has_pending_request=has_pending_request
        ))
    
    return results, total
