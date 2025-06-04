from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.models.users import Users
from app.models.feeds import Feeds
from app.schemas.comments import (
    CommentCreate, 
    CommentUpdate, 
    CommentResponse, 
    CommentListResponse
)
from app.crud import comments as comment_crud
from app.api.dependencies import get_current_user

router = APIRouter(
    prefix="/api/feeds/{feed_id}/comments",
    tags=["comments"]
)

@router.get("/", response_model=CommentListResponse)
async def get_feed_comments(
    feed_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    tree_structure: bool = Query(True, description="트리 구조로 반환할지 여부"),
    db: Session = Depends(get_db)
):
    """피드의 댓글 목록 조회"""
    try:
        # 피드 존재 확인
        feed = db.query(Feeds).filter(Feeds.feed_id == feed_id).first()
        if not feed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="피드를 찾을 수 없습니다."
            )
        
        skip = (page - 1) * size
        
        if tree_structure:
            # 트리 구조로 반환
            comments, total = comment_crud.get_comment_tree_by_feed_id(
                db, feed_id, skip, size
            )
            
            return {
                "comments": comments,
                "total": total,
                "page": page,
                "size": size,
                "total_pages": (total + size - 1) // size
            }
        else:
            # 평면 구조로 반환 (모든 댓글)
            comments = comment_crud.get_comments_by_feed_id(
                db, feed_id, skip, size, include_replies=True
            )
            total = comment_crud.count_comments_by_feed_id(db, feed_id)
            
            # 댓글 데이터 변환
            comment_responses = []
            for comment in comments:
                comment_data = {
                    "comment_id": comment.comment_id,
                    "user_id": comment.user_id,
                    "feed_id": comment.feed_id,
                    "parent_id": comment.parent_id,
                    "content": comment.content,
                    "created_at": comment.created_at,
                    "user": {
                        "user_id": comment.user.user_id,
                        "nickname": comment.user.nickname,
                        "profile_picture": comment.user.profile_picture
                    } if comment.user else None,
                    "replies": [],
                    "reply_count": comment_crud.count_replies_by_parent_id(db, comment.comment_id)
                }
                comment_responses.append(comment_data)
            
            return {
                "comments": comment_responses,
                "total": total,
                "page": page,
                "size": size,
                "total_pages": (total + size - 1) // size
            }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"댓글 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/", response_model=CommentResponse)
async def create_feed_comment(
    feed_id: int,
    comment: CommentCreate,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """댓글 작성 (댓글 또는 대댓글)"""
    try:
        # 피드 존재 확인
        feed = db.query(Feeds).filter(Feeds.feed_id == feed_id).first()
        if not feed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="피드를 찾을 수 없습니다."
            )
        
        # 댓글 생성
        new_comment = comment_crud.create_comment(
            db, comment, current_user.user_id, feed_id
        )
        
        # 응답 데이터 구성
        response_data = {
            "comment_id": new_comment.comment_id,
            "user_id": new_comment.user_id,
            "feed_id": new_comment.feed_id,
            "parent_id": new_comment.parent_id,
            "content": new_comment.content,
            "created_at": new_comment.created_at,
            "user": {
                "user_id": current_user.user_id,
                "nickname": current_user.nickname,
                "profile_picture": current_user.profile_picture
            },
            "replies": [],
            "reply_count": 0
        }
        
        return response_data
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"댓글 작성 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/{comment_id}", response_model=CommentResponse)
async def get_comment(
    feed_id: int,
    comment_id: int,
    db: Session = Depends(get_db)
):
    """특정 댓글 조회"""
    try:
        comment = comment_crud.get_comment_by_id(db, comment_id)
        if not comment or comment.feed_id != feed_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="댓글을 찾을 수 없습니다."
            )
        
        # 대댓글 조회
        replies = comment_crud.get_replies_by_parent_id(db, comment_id)
        reply_data = []
        for reply in replies:
            reply_data.append({
                "comment_id": reply.comment_id,
                "user_id": reply.user_id,
                "feed_id": reply.feed_id,
                "parent_id": reply.parent_id,
                "content": reply.content,
                "created_at": reply.created_at,
                "user": {
                    "user_id": reply.user.user_id,
                    "nickname": reply.user.nickname,
                    "profile_picture": reply.user.profile_picture
                } if reply.user else None,
                "replies": [],
                "reply_count": 0
            })
        
        response_data = {
            "comment_id": comment.comment_id,
            "user_id": comment.user_id,
            "feed_id": comment.feed_id,
            "parent_id": comment.parent_id,
            "content": comment.content,
            "created_at": comment.created_at,
            "user": {
                "user_id": comment.user.user_id,
                "nickname": comment.user.nickname,
                "profile_picture": comment.user.profile_picture
            } if comment.user else None,
            "replies": reply_data,
            "reply_count": len(reply_data)
        }
        
        return response_data
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"댓글 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.put("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    feed_id: int,
    comment_id: int,
    comment_update: CommentUpdate,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """댓글 수정"""
    try:
        updated_comment = comment_crud.update_comment(
            db, comment_id, comment_update, current_user.user_id
        )
        
        if not updated_comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="댓글을 찾을 수 없습니다."
            )
        
        if updated_comment.feed_id != feed_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="잘못된 피드 ID입니다."
            )
        
        response_data = {
            "comment_id": updated_comment.comment_id,
            "user_id": updated_comment.user_id,
            "feed_id": updated_comment.feed_id,
            "parent_id": updated_comment.parent_id,
            "content": updated_comment.content,
            "created_at": updated_comment.created_at,
            "user": {
                "user_id": current_user.user_id,
                "nickname": current_user.nickname,
                "profile_picture": current_user.profile_picture
            },
            "replies": [],
            "reply_count": comment_crud.count_replies_by_parent_id(db, comment_id)
        }
        
        return response_data
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"댓글 수정 중 오류가 발생했습니다: {str(e)}"
        )

@router.delete("/{comment_id}")
async def delete_comment(
    feed_id: int,
    comment_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """댓글 삭제"""
    try:
        # 댓글 존재 및 권한 확인
        comment = comment_crud.get_comment_by_id(db, comment_id)
        if not comment or comment.feed_id != feed_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="댓글을 찾을 수 없습니다."
            )
        
        success = comment_crud.delete_comment(db, comment_id, current_user.user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="댓글을 찾을 수 없습니다."
            )
        
        return {"message": "댓글이 성공적으로 삭제되었습니다."}
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"댓글 삭제 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/{comment_id}/replies", response_model=CommentListResponse)
async def get_comment_replies(
    feed_id: int,
    comment_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """특정 댓글의 대댓글 목록 조회"""
    try:
        # 부모 댓글 존재 확인
        parent_comment = comment_crud.get_comment_by_id(db, comment_id)
        if not parent_comment or parent_comment.feed_id != feed_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="댓글을 찾을 수 없습니다."
            )
        
        skip = (page - 1) * size
        replies = comment_crud.get_replies_by_parent_id(db, comment_id, skip, size)
        total = comment_crud.count_replies_by_parent_id(db, comment_id)
        
        # 대댓글 데이터 변환
        reply_responses = []
        for reply in replies:
            reply_data = {
                "comment_id": reply.comment_id,
                "user_id": reply.user_id,
                "feed_id": reply.feed_id,
                "parent_id": reply.parent_id,
                "content": reply.content,
                "created_at": reply.created_at,
                "user": {
                    "user_id": reply.user.user_id,
                    "nickname": reply.user.nickname,
                    "profile_picture": reply.user.profile_picture
                } if reply.user else None,
                "replies": [],
                "reply_count": 0
            }
            reply_responses.append(reply_data)
        
        return {
            "comments": reply_responses,
            "total": total,
            "page": page,
            "size": size,
            "total_pages": (total + size - 1) // size
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"대댓글 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )
