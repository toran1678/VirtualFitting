from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from datetime import datetime

from app.db.database import get_db
from app.api.dependencies import get_current_user
from app.models.users import Users
from app.crud.custom_clothing_items import CustomClothingItemsCRUD
from app.schemas.custom_clothing_items import (
    CustomClothingItemCreate, 
    CustomClothingItemUpdate, 
    CustomClothingItemResponse,
    CustomClothingItemListResponse
)
from app.utils.file_upload import save_upload_file

router = APIRouter()

# 업로드 디렉토리 설정
UPLOAD_DIR = "uploads/custom_clothing"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=CustomClothingItemResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_clothing_item(
    custom_name: str = Form(..., min_length=1, max_length=100),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """커스터마이징 의류 생성"""
    
    # 이미지 파일 검증
    if not image.content_type or not image.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미지 파일만 업로드 가능합니다."
        )
    
    # 파일 크기 제한 (10MB)
    if image.size and image.size > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="파일 크기는 10MB 이하여야 합니다."
        )
    
    try:
        # 고유한 파일명 생성
        file_extension = os.path.splitext(image.filename)[1] if image.filename else '.jpg'
        unique_filename = f"custom_{current_user.user_id}_{uuid.uuid4().hex}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # 파일 저장
        saved_path = await save_upload_file(image, file_path)
        
        # 데이터베이스에 저장
        custom_data = CustomClothingItemCreate(custom_name=custom_name)
        custom_clothing_item = CustomClothingItemsCRUD.create_custom_clothing_item(
            db=db,
            user_id=current_user.user_id,
            image_url=saved_path,
            custom_data=custom_data
        )
        
        return custom_clothing_item
        
    except Exception as e:
        # 파일 저장 실패 시 생성된 파일 삭제
        if 'saved_path' in locals() and os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"커스터마이징 의류 생성 실패: {str(e)}"
        )

@router.get("/", response_model=CustomClothingItemListResponse)
async def get_user_custom_clothes(
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """사용자의 커스터마이징 의류 목록 조회"""
    
    if page < 1:
        page = 1
    if per_page < 1 or per_page > 100:
        per_page = 20
    
    skip = (page - 1) * per_page
    
    try:
        custom_clothes, total = CustomClothingItemsCRUD.get_user_custom_clothes(
            db=db,
            user_id=current_user.user_id,
            skip=skip,
            limit=per_page
        )
        
        total_pages = (total + per_page - 1) // per_page
        
        return CustomClothingItemListResponse(
            custom_clothes=custom_clothes,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"커스터마이징 의류 목록 조회 실패: {str(e)}"
        )

@router.get("/{custom_clothing_id}", response_model=CustomClothingItemResponse)
async def get_custom_clothing_item(
    custom_clothing_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """특정 커스터마이징 의류 조회"""
    
    custom_clothing_item = CustomClothingItemsCRUD.get_custom_clothing_by_id(
        db=db,
        custom_clothing_id=custom_clothing_id,
        user_id=current_user.user_id
    )
    
    if not custom_clothing_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="커스터마이징 의류를 찾을 수 없습니다."
        )
    
    return custom_clothing_item

@router.put("/{custom_clothing_id}", response_model=CustomClothingItemResponse)
async def update_custom_clothing_item(
    custom_clothing_id: int,
    custom_data: CustomClothingItemUpdate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """커스터마이징 의류 정보 수정"""
    
    updated_custom_clothing = CustomClothingItemsCRUD.update_custom_clothing_item(
        db=db,
        custom_clothing_id=custom_clothing_id,
        user_id=current_user.user_id,
        custom_data=custom_data
    )
    
    if not updated_custom_clothing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="커스터마이징 의류를 찾을 수 없습니다."
        )
    
    return updated_custom_clothing

@router.delete("/{custom_clothing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_clothing_item(
    custom_clothing_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """커스터마이징 의류 삭제"""
    
    success = CustomClothingItemsCRUD.delete_custom_clothing_item(
        db=db,
        custom_clothing_id=custom_clothing_id,
        user_id=current_user.user_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="커스터마이징 의류를 찾을 수 없습니다."
        )

@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_delete_custom_clothes(
    custom_clothing_ids: List[int],
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """커스터마이징 의류 일괄 삭제"""
    
    if not custom_clothing_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="삭제할 커스터마이징 의류 ID가 필요합니다."
        )
    
    deleted_count = CustomClothingItemsCRUD.bulk_delete_custom_clothes(
        db=db,
        custom_clothing_ids=custom_clothing_ids,
        user_id=current_user.user_id
    )
    
    if deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="삭제할 커스터마이징 의류를 찾을 수 없습니다."
        )

@router.get("/stats/count")
async def get_custom_clothes_count(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """사용자의 커스터마이징 의류 개수 조회"""
    
    count = CustomClothingItemsCRUD.get_user_custom_clothes_count(
        db=db,
        user_id=current_user.user_id
    )
    
    return {"count": count}
