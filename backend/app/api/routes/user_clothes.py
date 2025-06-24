from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import os
import uuid
from datetime import datetime
import shutil
from PIL import Image

from app.db.database import get_db
from app.api.dependencies import get_current_user
from app.models.users import Users
from app.schemas.user_clothes import (
    UserClothesCreate, 
    UserClothesUpdate, 
    UserClothesResponse, 
    UserClothesListResponse,
    UserClothesUploadResponse,
    UserClothesStatsResponse
)
from app.crud.user_clothes import UserClothesCRUD

router = APIRouter(prefix="/api/user-clothes", tags=["user-clothes"])

# 업로드 설정
UPLOAD_DIR = "uploads/user_clothes"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
VALID_CATEGORIES = {"top", "bottom", "outer", "dress", "shoes", "accessories"}
VALID_SEASONS = {"spring", "summer", "fall", "winter", "all"}

# 업로드 디렉토리 생성
os.makedirs(UPLOAD_DIR, exist_ok=True)

def validate_clothing_file(file: UploadFile) -> None:
    """의류 이미지 파일 유효성 검사"""
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하여야 합니다.")
    
    file_ext = os.path.splitext(file.filename.lower())[1]
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식입니다. (JPG, PNG, WEBP만 가능)")
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

def save_clothing_file(file: UploadFile, user_id: int) -> str:
    """의류 이미지 파일 저장"""
    file_ext = os.path.splitext(file.filename.lower())[1]
    unique_filename = f"{user_id}_{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # 파일 저장
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 이미지 최적화
    try:
        with Image.open(file_path) as img:
            max_size = (1920, 1920)
            if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                img.save(file_path, optimize=True, quality=85)
    except Exception as e:
        print(f"이미지 최적화 실패: {e}")
    
    return file_path

@router.post("/upload", response_model=UserClothesUploadResponse)
async def upload_clothing(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form(...),
    brand: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    season: Optional[str] = Form(None),
    style: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """의류 이미지 업로드"""
    try:
        # 파일 유효성 검사
        validate_clothing_file(file)
        
        # 카테고리 유효성 검사
        if category not in VALID_CATEGORIES:
            raise HTTPException(status_code=400, detail=f"유효하지 않은 카테고리입니다. 가능한 값: {', '.join(VALID_CATEGORIES)}")
        
        # 계절 유효성 검사
        if season and season not in VALID_SEASONS:
            raise HTTPException(status_code=400, detail=f"유효하지 않은 계절입니다. 가능한 값: {', '.join(VALID_SEASONS)}")
        
        # 사용자 의류 개수 제한 (예: 200개)
        current_count = UserClothesCRUD.get_user_clothes_count(db, current_user.user_id)
        if current_count >= 200:
            raise HTTPException(status_code=400, detail="최대 200개의 의류만 등록할 수 있습니다.")
        
        # 파일 저장
        file_path = save_clothing_file(file, current_user.user_id)
        
        # 데이터베이스에 저장
        clothing_data = UserClothesCreate(
            name=name,
            brand=brand,
            category=category,
            color=color,
            season=season,
            style=style
        )
        
        db_clothing = UserClothesCRUD.create_user_clothing(
            db=db,
            user_id=current_user.user_id,
            image_url=file_path,
            clothing_data=clothing_data
        )
        
        return UserClothesUploadResponse(
            success=True,
            message="의류가 성공적으로 등록되었습니다.",
            clothing=UserClothesResponse.from_orm(db_clothing)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"의류 등록 중 오류가 발생했습니다: {str(e)}")

@router.get("/", response_model=UserClothesListResponse)
async def get_user_clothes(
    page: int = Query(1, ge=1, description="페이지 번호"),
    per_page: int = Query(20, ge=1, le=50, description="페이지당 항목 수"),
    category: Optional[str] = Query(None, description="카테고리 필터"),
    season: Optional[str] = Query(None, description="계절 필터"),
    search: Optional[str] = Query(None, description="검색어 (이름, 브랜드)"),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """사용자의 의류 목록 조회"""
    skip = (page - 1) * per_page
    
    clothes, total = UserClothesCRUD.get_user_clothes(
        db=db,
        user_id=current_user.user_id,
        skip=skip,
        limit=per_page,
        category=category,
        season=season,
        search=search
    )
    
    total_pages = (total + per_page - 1) // per_page
    
    return UserClothesListResponse(
        clothes=[UserClothesResponse.from_orm(item) for item in clothes],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )

@router.get("/stats", response_model=UserClothesStatsResponse)
async def get_user_clothes_stats(
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """사용자의 의류 통계 조회"""
    stats = UserClothesCRUD.get_user_clothes_stats(db, current_user.user_id)
    return UserClothesStatsResponse(**stats)

@router.get("/{clothing_id}", response_model=UserClothesResponse)
async def get_clothing(
    clothing_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """특정 의류 아이템 조회"""
    db_clothing = UserClothesCRUD.get_clothing_by_id(
        db=db,
        clothing_id=clothing_id,
        user_id=current_user.user_id
    )
    
    if not db_clothing:
        raise HTTPException(status_code=404, detail="의류를 찾을 수 없습니다.")
    
    return UserClothesResponse.from_orm(db_clothing)

@router.put("/{clothing_id}", response_model=UserClothesResponse)
async def update_clothing(
    clothing_id: int,
    clothing_data: UserClothesUpdate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """의류 아이템 정보 수정"""
    # 카테고리 유효성 검사
    if clothing_data.category and clothing_data.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"유효하지 않은 카테고리입니다. 가능한 값: {', '.join(VALID_CATEGORIES)}")
    
    # 계절 유효성 검사
    if clothing_data.season and clothing_data.season not in VALID_SEASONS:
        raise HTTPException(status_code=400, detail=f"유효하지 않은 계절입니다. 가능한 값: {', '.join(VALID_SEASONS)}")
    
    db_clothing = UserClothesCRUD.update_user_clothing(
        db=db,
        clothing_id=clothing_id,
        user_id=current_user.user_id,
        clothing_data=clothing_data
    )
    
    if not db_clothing:
        raise HTTPException(status_code=404, detail="의류를 찾을 수 없습니다.")
    
    return UserClothesResponse.from_orm(db_clothing)

@router.delete("/{clothing_id}")
async def delete_clothing(
    clothing_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """의류 아이템 삭제"""
    success = UserClothesCRUD.delete_user_clothing(
        db=db,
        clothing_id=clothing_id,
        user_id=current_user.user_id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="의류를 찾을 수 없습니다.")
    
    return JSONResponse(
        status_code=200,
        content={"success": True, "message": "의류가 성공적으로 삭제되었습니다."}
    )

@router.delete("/bulk")
async def bulk_delete_clothes(
    clothing_ids: List[int],
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """의류 일괄 삭제"""
    if not clothing_ids:
        raise HTTPException(status_code=400, detail="삭제할 의류 ID가 필요합니다.")
    
    deleted_count = UserClothesCRUD.bulk_delete_clothes(
        db=db,
        clothing_ids=clothing_ids,
        user_id=current_user.user_id
    )
    
    return JSONResponse(
        status_code=200,
        content={
            "success": True, 
            "message": f"{deleted_count}개의 의류가 삭제되었습니다.",
            "deleted_count": deleted_count
        }
    )
