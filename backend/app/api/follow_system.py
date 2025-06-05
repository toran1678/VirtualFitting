from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import traceback

from app.db.database import get_db
from app.models.users import Users
from app.schemas.follow_requests import (
    FollowRequestResponse, 
    FollowRequestAction, 
    FollowStatusResponse
)
from app.schemas.users import UserProfileResponse
from app.crud.users import get_user_by_email
from app.crud.followers_enhanced import (
    enhanced_toggle_follow,
    get_user_followers_with_follow_status,
    get_user_following_with_follow_status
)
from app.crud.follow_requests import (
    get_follow_requests_for_user,
    get_sent_follow_requests_for_user,
    accept_follow_request,
    reject_follow_request,
    cancel_follow_request,
    get_follow_request_count,
    has_pending_follow_request
)
from app.api.dependencies import get_current_user, get_current_user_optional

# 라우터 생성
router = APIRouter(
    prefix="/api/follow",
    tags=["follow-system"]
)

@router.post("/{email}/follow", response_model=FollowStatusResponse)
async def toggle_user_follow(
    email: str,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """사용자 팔로우/언팔로우 토글 (비공개 계정 고려)"""
    try:
        # 대상 사용자 확인
        target_user = get_user_by_email(db, email)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다."
            )
        
        if current_user.user_id == target_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="자기 자신을 팔로우할 수 없습니다."
            )
        
        # 비공개 계정 여부 확인 및 팔로우 요청 여부 확인
        has_pending = False
        if target_user.is_private:
            has_pending = has_pending_follow_request(db, current_user.user_id, target_user.user_id)
        
        is_following, followers_count, message = enhanced_toggle_follow(
            db, current_user.user_id, target_user.user_id
        )
        
        # 팔로우 요청을 보낸 경우인지 확인
        has_pending_request = not is_following and "요청을 보냈습니다" in message
        
        return FollowStatusResponse(
            is_following=is_following,
            followers_count=followers_count,
            message=message,
            has_pending_request=has_pending_request or has_pending
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"팔로우 처리 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/{email}/followers", response_model=List[dict])
async def get_user_followers_endpoint(
    email: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[Users] = Depends(get_current_user_optional)
):
    """사용자의 팔로워 목록 조회"""
    try:
        # 사용자 존재 확인
        user = get_user_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다."
            )
        
        # 비공개 계정 확인
        if user.is_private and (not current_user or current_user.user_id != user.user_id):
            if current_user:
                from app.crud.followers import is_following
                if not is_following(db, current_user.user_id, user.user_id):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="비공개 계정입니다."
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="비공개 계정입니다."
                )
        
        current_user_id = current_user.user_id if current_user else None
        followers = get_user_followers_with_follow_status(db, user.user_id, current_user_id, skip, limit)
        
        return followers
    
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"팔로워 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/{email}/following", response_model=List[dict])
async def get_user_following_endpoint(
    email: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[Users] = Depends(get_current_user_optional)
):
    """사용자의 팔로잉 목록 조회"""
    try:
        # 사용자 존재 확인
        user = get_user_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다."
            )
        
        # 비공개 계정 확인
        if user.is_private and (not current_user or current_user.user_id != user.user_id):
            if current_user:
                from app.crud.followers import is_following
                if not is_following(db, current_user.user_id, user.user_id):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="비공개 계정입니다."
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="비공개 계정입니다."
                )
        
        current_user_id = current_user.user_id if current_user else None
        following = get_user_following_with_follow_status(db, user.user_id, current_user_id, skip, limit)
        
        return following
    
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"팔로잉 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/requests", response_model=List[FollowRequestResponse])
async def get_follow_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """현재 사용자가 받은 팔로우 요청 목록 조회"""
    try:
        requests = get_follow_requests_for_user(db, current_user.user_id, skip, limit)
        return requests
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"팔로우 요청 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/requests/sent", response_model=List[FollowRequestResponse])
async def get_sent_follow_requests(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """보낸 팔로우 요청 목록 조회"""
    try:
        requests = get_sent_follow_requests_for_user(
            db=db, 
            user_id=current_user.user_id, 
            skip=skip, 
            limit=limit
        )
        return requests
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"보낸 팔로우 요청 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/requests/{request_id}/accept", response_model=FollowRequestAction)
async def accept_follow_request_endpoint(
    request_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """팔로우 요청 수락"""
    try:
        success, result = accept_follow_request(db, request_id, current_user.user_id)
        return FollowRequestAction(**result)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"팔로우 요청 수락 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/requests/{request_id}/reject", response_model=FollowRequestAction)
async def reject_follow_request_endpoint(
    request_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """팔로우 요청 거절"""
    try:
        result = reject_follow_request(db, request_id, current_user.user_id)
        return FollowRequestAction(**result)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"팔로우 요청 거절 중 오류가 발생했습니다: {str(e)}"
        )

@router.delete("/requests/{target_email}/cancel", response_model=FollowRequestAction)
async def cancel_follow_request_endpoint(
    target_email: str,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """팔로우 요청 취소"""
    try:
        # 대상 사용자 확인
        target_user = get_user_by_email(db, target_email)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다."
            )
        
        result = cancel_follow_request(db, current_user.user_id, target_user.user_id)
        return FollowRequestAction(**result)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"팔로우 요청 취소 중 오류가 발생했습니다: {str(e)}"
        )
