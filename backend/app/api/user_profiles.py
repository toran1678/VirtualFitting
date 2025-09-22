from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.schemas.users import UserProfileResponse
from app.schemas.feeds import FeedListResponse
from app.schemas.liked_clothes import LikedClothesWithItemResponse
from app.crud.users import get_user_profile_by_email
from app.crud.user_data import get_user_feeds, get_user_liked_clothes
from app.crud.virtual_fitting import VirtualFittingCRUD
from app.crud.custom_clothing_items import CustomClothingItemsCRUD
from app.api.dependencies import get_current_user_optional
from app.models.users import Users
from typing import List

router = APIRouter(
    prefix="/api/users/profile",
    tags=["user-profiles"]
)

@router.get("/{email}", response_model=UserProfileResponse)
async def get_user_profile_by_email_endpoint(
    email: str,
    db: Session = Depends(get_db),
    current_user: Optional[Users] = Depends(get_current_user_optional)
):
    """이메일로 사용자 프로필 조회 API"""
    try:
        current_user_id = current_user.user_id if current_user else None
        
        profile = get_user_profile_by_email(db, email, current_user_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다."
            )
        
        return profile
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"프로필 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/{email}/feeds", response_model=FeedListResponse)
async def get_user_feeds_endpoint(
    email: str,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[Users] = Depends(get_current_user_optional)
):
    """특정 사용자의 피드 목록 조회 API"""
    try:
        # 사용자 존재 확인
        from app.crud.users import get_user_by_email
        user = get_user_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다."
            )
        
        # 비공개 계정 확인
        if user.is_private and (not current_user or current_user.user_id != user.user_id):
            # 팔로우 관계 확인 (팔로우하고 있으면 볼 수 있음)
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
        
        skip = (page - 1) * size
        feeds, total = get_user_feeds(db, user.user_id, skip, size)
        
        # 피드 데이터 검증 및 보정
        validated_feeds = []
        for feed in feeds:
            # 사용자 정보가 없거나 이메일이 없는 경우 보정
            if not feed.get("user") or not feed["user"].get("email"):
                feed["user"] = {
                    "user_id": feed.get("user_id", 0),
                    "nickname": feed.get("user", {}).get("nickname", "알 수 없는 사용자"),
                    "email": user.email,  # 프로필 소유자의 이메일 사용
                    "profile_picture": feed.get("user", {}).get("profile_picture"),
                    "isFollowing": False
                }
            validated_feeds.append(feed)
        
        return {
            "feeds": validated_feeds,
            "total": total,
            "page": page,
            "size": size,
            "total_pages": (total + size - 1) // size
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"피드 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/{email}/liked-clothes", response_model=List[LikedClothesWithItemResponse])
async def get_user_liked_clothes_endpoint(
    email: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: Optional[Users] = Depends(get_current_user_optional)
):
    """특정 사용자의 좋아요한 의류 목록 조회 API"""
    try:
        # 사용자 존재 확인
        from app.crud.users import get_user_by_email
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
        
        liked_clothes_data = get_user_liked_clothes(db, user.user_id, skip, limit)
        
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
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"좋아요한 의류 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/{email}/virtual-fittings")
async def get_user_virtual_fittings_endpoint(
    email: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Optional[Users] = Depends(get_current_user_optional)
):
    """특정 사용자의 가상 피팅 목록 조회 API"""
    try:
        print(f"🔍 가상 피팅 API 호출: email={email}, page={page}, per_page={per_page}")
        print(f"🔍 현재 사용자: {current_user.email if current_user else 'None'}")
        # 사용자 존재 확인
        from app.crud.users import get_user_by_email
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
        
        skip = (page - 1) * per_page
        results, total = VirtualFittingCRUD.get_user_virtual_fittings(
            db=db,
            user_id=user.user_id,
            skip=skip,
            limit=per_page
        )
        
        print(f"🔍 가상 피팅 결과: {len(results)}개, 총 {total}개")
        
        total_pages = (total + per_page - 1) // per_page
        
        # 결과를 VirtualFittingItem 형태로 변환
        formatted_results = []
        for result in results:
            print(f"🔍 가상 피팅 아이템: {result.fitting_id}, 이미지 URL: {result.fitting_image_url}")
            formatted_results.append({
                "fitting_id": result.fitting_id,
                "title": result.title,
                "fitting_image_url": result.fitting_image_url,
                "source_model_image_url": result.source_model_image_url,
                "source_cloth_image_url": result.source_cloth_image_url,
                "created_at": result.created_at
            })
        
        response_data = {
            "fittings": formatted_results,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }
        
        print(f"✅ 가상 피팅 응답 데이터: {response_data}")
        return response_data
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"가상 피팅 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/{email}/custom-clothes")
async def get_user_custom_clothes_endpoint(
    email: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: Optional[Users] = Depends(get_current_user_optional)
):
    """특정 사용자의 커스텀 의류 목록 조회 API"""
    try:
        print(f"🔍 커스텀 의류 API 호출: email={email}, skip={skip}, limit={limit}")
        print(f"🔍 현재 사용자: {current_user.email if current_user else 'None'}")
        # 사용자 존재 확인
        from app.crud.users import get_user_by_email
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
        
        custom_clothes, total = CustomClothingItemsCRUD.get_user_custom_clothes(
            db=db,
            user_id=user.user_id,
            skip=skip,
            limit=limit
        )
        
        print(f"🔍 커스텀 의류 결과: {len(custom_clothes)}개, 총 {total}개")
        
        # 결과를 CustomClothingItemResponse 형태로 변환
        result = []
        for item in custom_clothes:
            print(f"🔍 커스텀 의류 아이템: {item.custom_clothing_id}, 이미지 URL: {item.custom_image_url}")
            result.append({
                "id": item.custom_clothing_id,
                "name": item.custom_name,
                "image_url": item.custom_image_url,
                "category": getattr(item, 'category', None),
                "brand": getattr(item, 'brand', None),
                "color": getattr(item, 'color', None),
                "season": getattr(item, 'season', None),
                "style": getattr(item, 'style', None),
                "created_at": item.created_at,
                "updated_at": item.updated_at
            })
        
        print(f"✅ 커스텀 의류 응답 데이터: {len(result)}개 항목")
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"커스텀 의류 조회 중 오류가 발생했습니다: {str(e)}"
        )