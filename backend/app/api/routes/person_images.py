from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
from datetime import datetime
import shutil
from PIL import Image

from app.db.database import get_db
from app.api.dependencies import get_current_user
from app.models.users import Users
from app.schemas.person_images import (
    PersonImageCreate, 
    PersonImageUpdate, 
    PersonImageResponse, 
    PersonImageListResponse,
    PersonImageUploadResponse
)
from app.crud.person_images import PersonImageCRUD

router = APIRouter(prefix="/api/person-images", tags=["person-images"])

# 업로드 설정
UPLOAD_DIR = "uploads/person_images"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# 업로드 디렉토리 생성
os.makedirs(UPLOAD_DIR, exist_ok=True)

def validate_image_file(file: UploadFile) -> None:
    """이미지 파일 유효성 검사"""
    # 파일 크기 검사
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하여야 합니다.")
    
    # 파일 확장자 검사
    file_ext = os.path.splitext(file.filename.lower())[1]
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식입니다. (JPG, PNG, WEBP만 가능)")
    
    # MIME 타입 검사
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

def save_uploaded_file(file: UploadFile, user_id: int) -> str:
    """업로드된 파일 저장"""
    # 고유한 파일명 생성
    file_ext = os.path.splitext(file.filename.lower())[1]
    unique_filename = f"{user_id}_{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # 파일 저장
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 이미지 최적화 (선택적)
    try:
        with Image.open(file_path) as img:
            # 이미지 크기가 너무 크면 리사이즈
            max_size = (1920, 1920)
            if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                img.save(file_path, optimize=True, quality=85)
    except Exception as e:
        print(f"이미지 최적화 실패: {e}")
    
    return file_path

@router.post("/upload", response_model=PersonImageUploadResponse)
async def upload_person_image(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """인물 이미지 업로드"""
    try:
        # 파일 유효성 검사
        validate_image_file(file)
        
        # 사용자 이미지 개수 제한 (예: 50개)
        current_count = PersonImageCRUD.get_user_image_count(db, current_user.user_id)
        if current_count >= 50:
            raise HTTPException(status_code=400, detail="최대 50개의 이미지만 업로드할 수 있습니다.")
        
        # 파일 저장
        file_path = save_uploaded_file(file, current_user.user_id)
        
        # 데이터베이스에 저장
        image_data = PersonImageCreate(description=description)
        db_image = PersonImageCRUD.create_person_image(
            db=db,
            user_id=current_user.user_id,
            image_url=file_path,
            image_data=image_data
        )
        
        return PersonImageUploadResponse(
            success=True,
            message="이미지가 성공적으로 업로드되었습니다.",
            image=PersonImageResponse.from_orm(db_image)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 업로드 중 오류가 발생했습니다: {str(e)}")

@router.get("/", response_model=PersonImageListResponse)
async def get_person_images(
    page: int = Query(1, ge=1, description="페이지 번호"),
    per_page: int = Query(20, ge=1, le=50, description="페이지당 항목 수"),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """사용자의 인물 이미지 목록 조회"""
    skip = (page - 1) * per_page
    
    images, total = PersonImageCRUD.get_user_person_images(
        db=db,
        user_id=current_user.user_id,
        skip=skip,
        limit=per_page
    )
    
    total_pages = (total + per_page - 1) // per_page
    
    return PersonImageListResponse(
        images=[PersonImageResponse.from_orm(img) for img in images],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )

@router.get("/{image_id}", response_model=PersonImageResponse)
async def get_person_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """특정 인물 이미지 조회"""
    db_image = PersonImageCRUD.get_person_image_by_id(
        db=db,
        image_id=image_id,
        user_id=current_user.user_id
    )
    
    if not db_image:
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")
    
    return PersonImageResponse.from_orm(db_image)

@router.put("/{image_id}", response_model=PersonImageResponse)
async def update_person_image(
    image_id: int,
    image_data: PersonImageUpdate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """인물 이미지 정보 수정"""
    db_image = PersonImageCRUD.update_person_image(
        db=db,
        image_id=image_id,
        user_id=current_user.user_id,
        image_data=image_data
    )
    
    if not db_image:
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")
    
    return PersonImageResponse.from_orm(db_image)

@router.delete("/{image_id}")
async def delete_person_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """인물 이미지 삭제"""
    success = PersonImageCRUD.delete_person_image(
        db=db,
        image_id=image_id,
        user_id=current_user.user_id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")
    
    return JSONResponse(
        status_code=200,
        content={"success": True, "message": "이미지가 성공적으로 삭제되었습니다."}
    )

@router.get("/count/total")
async def get_user_image_count(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """사용자의 총 이미지 개수 조회"""
    count = PersonImageCRUD.get_user_image_count(db, current_user.user_id)
    return {"total_count": count}
