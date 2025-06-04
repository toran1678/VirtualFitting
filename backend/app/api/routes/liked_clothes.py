from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.schemas.liked_clothes import (
    LikedClothesResponse, 
    LikedClothesWithItemResponse,
    LikeToggleRequest, 
    LikeToggleResponse
)
from app.crud import liked_clothes as crud_liked_clothes
from app.api.dependencies import get_current_user
from app.models.users import Users

router = APIRouter(
    prefix="/api/liked-clothes",
    tags=["liked-clothes"]
)

@router.post("/toggle", response_model=LikeToggleResponse)
async def toggle_clothing_like(
    request: LikeToggleRequest,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """의류 좋아요 토글"""
    try:
        is_liked, total_likes = crud_liked_clothes.toggle_like(
            db=db, 
            user_id=current_user.user_id, 
            clothing_id=request.clothing_id
        )
        
        message = "좋아요를 추가했습니다." if is_liked else "좋아요를 취소했습니다."
        
        return LikeToggleResponse(
            is_liked=is_liked,
            total_likes=total_likes,
            message=message
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"좋아요 처리 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/my-likes", response_model=List[LikedClothesWithItemResponse])
async def get_my_liked_clothes(
    skip: int = 0,
    limit: int = 100,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """내가 좋아요한 의류 목록과 의류 정보를 함께 조회"""
    try:
        liked_clothes_data = crud_liked_clothes.get_user_liked_clothes_with_items(
            db=db, 
            user_id=current_user.user_id, 
            skip=skip, 
            limit=limit
        )
        
        # 결과를 LikedClothesWithItemResponse 형태로 변환
        result = []
        for item in liked_clothes_data:
            result.append(LikedClothesWithItemResponse(
                clothing_id=item.clothing_id,
                liked_at=item.liked_at,
                product_name=item.product_name,
                product_url=item.product_url,
                product_image_url=item.product_image_url,
                brand_name=item.brand_name,
                main_category=item.main_category,
                sub_category=item.sub_category,
                gender=item.gender
            ))
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"좋아요한 의류 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/check/{clothing_id}")
async def check_clothing_like_status(
    clothing_id: int,
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """특정 의류의 좋아요 상태 확인"""
    is_liked = crud_liked_clothes.is_clothing_liked_by_user(
        db=db, 
        user_id=current_user.user_id, 
        clothing_id=clothing_id
    )
    total_likes = crud_liked_clothes.get_clothing_likes_count(
        db=db, 
        clothing_id=clothing_id
    )
    
    return {
        "is_liked": is_liked,
        "total_likes": total_likes
    }

@router.get("/my-liked-ids")
async def get_my_liked_clothing_ids(
    current_user: Users = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """내가 좋아요한 의류 ID 목록 조회"""
    liked_ids = crud_liked_clothes.get_user_liked_clothing_ids(
        db=db, 
        user_id=current_user.user_id
    )
    return {"liked_clothing_ids": liked_ids}
