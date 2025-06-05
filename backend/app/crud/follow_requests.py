from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from app.models.users import Users
from app.models.follow_requests import FollowRequests
from app.crud.followers import is_following, toggle_follow, create_follow_relationship
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime

def create_follow_request(db: Session, requester_id: int, target_id: int) -> FollowRequests:
    """팔로우 요청 생성"""
    if requester_id == target_id:
        raise ValueError("자기 자신에게 팔로우 요청을 보낼 수 없습니다.")
    
    # 이미 팔로우 중인지 확인
    if is_following(db, requester_id, target_id):
        raise ValueError("이미 팔로우 중인 사용자입니다.")
    
    # 기존 대기 중인 요청이 있는지 확인
    existing_request = db.query(FollowRequests).filter(
        and_(
            FollowRequests.requester_id == requester_id,
            FollowRequests.target_id == target_id,
            FollowRequests.status == 'pending'
        )
    ).first()
    
    if existing_request:
        raise ValueError("이미 팔로우 요청을 보냈습니다.")
    
    # 새 요청 생성
    new_request = FollowRequests(
        requester_id=requester_id,
        target_id=target_id,
        status='pending'
    )
    
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    return new_request

def get_follow_requests_for_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[dict]:
    """사용자가 받은 팔로우 요청 목록 조회"""
    requests = db.query(FollowRequests).filter(
        and_(
            FollowRequests.target_id == user_id,
            FollowRequests.status == 'pending'
        )
    ).order_by(FollowRequests.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for request in requests:
        requester = db.query(Users).filter(Users.user_id == request.requester_id).first()
        if requester:
            result.append({
                "request_id": request.request_id,
                "requester_id": request.requester_id,
                "target_id": request.target_id,
                "status": request.status,
                "created_at": request.created_at,
                "user": {
                    "user_id": requester.user_id,
                    "nickname": requester.nickname,
                    "email": requester.email,
                    "profile_picture": requester.profile_picture
                }
            })
    
    return result

def get_sent_follow_requests_for_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
    """사용자가 보낸 팔로우 요청 목록 조회"""
    requests = db.query(FollowRequests, Users).join(
        Users, FollowRequests.target_id == Users.user_id
    ).filter(
        and_(
            FollowRequests.requester_id == user_id,
            FollowRequests.status == "pending"
        )
    ).order_by(desc(FollowRequests.created_at)).offset(skip).limit(limit).all()
    
    result = []
    for request, user in requests:
        result.append({
            "request_id": request.request_id,
            "requester_id": request.requester_id,
            "target_id": request.target_id,
            "status": request.status,
            "created_at": request.created_at,
            "user": {
                "user_id": user.user_id,
                "nickname": user.nickname,
                "email": user.email,
                "profile_picture": user.profile_picture
            }
        })
    
    return result

def accept_follow_request(db: Session, request_id: int, target_user_id: int) -> Tuple[bool, dict]:
    """팔로우 요청 수락"""
    # 요청 조회 및 권한 확인
    request = db.query(FollowRequests).filter(
        and_(
            FollowRequests.request_id == request_id,
            FollowRequests.target_id == target_user_id,
            FollowRequests.status == 'pending'
        )
    ).first()
    
    if not request:
        raise ValueError("유효하지 않은 팔로우 요청입니다.")
    
    try:
        # 팔로우 관계 생성
        is_following_now, followers_count = toggle_follow(db, request.requester_id, request.target_id)
        
        if is_following_now:
            # 요청 상태를 수락으로 변경
            request.status = 'accepted'
            request.updated_at = datetime.now()
            db.commit()
            
            return True, {
                "message": "팔로우 요청을 수락했습니다.",
                "followers_count": followers_count
            }
        else:
            raise Exception("팔로우 관계 생성에 실패했습니다.")
            
    except Exception as e:
        db.rollback()
        raise e

def reject_follow_request(db: Session, request_id: int, target_user_id: int) -> dict:
    """팔로우 요청 거절"""
    # 요청 조회 및 권한 확인
    request = db.query(FollowRequests).filter(
        and_(
            FollowRequests.request_id == request_id,
            FollowRequests.target_id == target_user_id,
            FollowRequests.status == 'pending'
        )
    ).first()
    
    if not request:
        raise ValueError("유효하지 않은 팔로우 요청입니다.")
    
    # 요청 상태를 거절로 변경
    request.status = 'rejected'
    request.updated_at = datetime.now()
    db.commit()
    
    return {"message": "팔로우 요청을 거절했습니다."}

def cancel_follow_request(db: Session, requester_id: int, target_id: int) -> Dict[str, Any]:
    """팔로우 요청 취소"""
    request = db.query(FollowRequests).filter(
        and_(
            FollowRequests.requester_id == requester_id,
            FollowRequests.target_id == target_id,
            FollowRequests.status == "pending"
        )
    ).first()
    
    if not request:
        raise ValueError("취소할 팔로우 요청을 찾을 수 없습니다.")
    
    # 요청 삭제 (또는 상태를 cancelled로 변경)
    db.delete(request)
    db.commit()
    
    return {
        "message": "팔로우 요청을 취소했습니다."
    }

def has_pending_follow_request(db: Session, requester_id: int, target_id: int) -> bool:
    """대기 중인 팔로우 요청이 있는지 확인"""
    request = db.query(FollowRequests).filter(
        and_(
            FollowRequests.requester_id == requester_id,
            FollowRequests.target_id == target_id,
            FollowRequests.status == 'pending'
        )
    ).first()
    
    return request is not None

def get_follow_request_count(db: Session, user_id: int) -> int:
    """사용자가 받은 대기 중인 팔로우 요청 수"""
    return db.query(FollowRequests).filter(
        and_(
            FollowRequests.target_id == user_id,
            FollowRequests.status == 'pending'
        )
    ).count()
