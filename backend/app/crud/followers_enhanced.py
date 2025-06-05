from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models.users import Users, Followers
from app.models.follow_requests import FollowRequests
from app.crud.followers import *  # 기존 함수들 import
from app.crud.follow_requests import create_follow_request, has_pending_follow_request
from typing import List, Tuple, Optional

def enhanced_toggle_follow(db: Session, follower_id: int, following_id: int) -> Tuple[bool, int, str]:
    """향상된 팔로우 토글 (비공개 계정 고려)"""
    if follower_id == following_id:
        raise ValueError("자기 자신을 팔로우할 수 없습니다.")
    
    # 대상 사용자 정보 조회
    target_user = db.query(Users).filter(Users.user_id == following_id).first()
    if not target_user:
        raise ValueError("사용자를 찾을 수 없습니다.")
    
    # 이미 팔로우 중인지 확인
    if is_following(db, follower_id, following_id):
        # 언팔로우
        is_following_now, followers_count = toggle_follow(db, follower_id, following_id)
        return False, followers_count, "언팔로우했습니다."
    
    # 비공개 계정인 경우
    if target_user.is_private:
        # 이미 요청을 보냈는지 확인
        if has_pending_follow_request(db, follower_id, following_id):
            raise ValueError("이미 팔로우 요청을 보냈습니다.")
        
        # 팔로우 요청 생성
        create_follow_request(db, follower_id, following_id)
        followers_count = get_followers_count(db, following_id)
        return False, followers_count, "팔로우 요청을 보냈습니다."
    
    # 공개 계정인 경우 즉시 팔로우
    is_following_now, followers_count = toggle_follow(db, follower_id, following_id)
    return True, followers_count, "팔로우했습니다."

def get_user_followers_with_follow_status(db: Session, user_id: int, current_user_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[dict]:
    """팔로워 목록 조회 (현재 사용자의 팔로우 상태 포함)"""
    followers = get_user_followers(db, user_id, skip, limit)
    
    result = []
    for follower in followers:
        follower_data = {
            "user_id": follower.user_id,
            "nickname": follower.nickname,
            "email": follower.email,
            "profile_picture": follower.profile_picture,
            "is_following": False
        }
        
        # 현재 사용자가 이 팔로워를 팔로우하고 있는지 확인
        if current_user_id and current_user_id != follower.user_id:
            follower_data["is_following"] = is_following(db, current_user_id, follower.user_id)
        
        result.append(follower_data)
    
    return result

def get_user_following_with_follow_status(db: Session, user_id: int, current_user_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[dict]:
    """팔로잉 목록 조회 (현재 사용자의 팔로우 상태 포함)"""
    following = get_user_following(db, user_id, skip, limit)
    
    result = []
    for followed_user in following:
        following_data = {
            "user_id": followed_user.user_id,
            "nickname": followed_user.nickname,
            "email": followed_user.email,
            "profile_picture": followed_user.profile_picture,
            "is_following": False
        }
        
        # 현재 사용자가 이 사용자를 팔로우하고 있는지 확인
        if current_user_id and current_user_id != followed_user.user_id:
            following_data["is_following"] = is_following(db, current_user_id, followed_user.user_id)
        
        result.append(following_data)
    
    return result
