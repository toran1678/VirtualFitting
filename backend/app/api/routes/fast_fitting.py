from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os
import logging
from pathlib import Path

from app.db.database import get_db
from app.api.dependencies import get_current_user
from app.models.users import Users
from app.models.person_images import PersonImages
from app.models.liked_clothes import LikedClothes
from app.models.custom_clothing_items import CustomClothingItems
from app.models.user_clothes import UserClothes
from app.models.clothing_items import ClothingItems
from app.utils.fast_fitting_service import fast_fitting_service
from app.schemas.virtual_fitting import (
    VirtualFittingStartResponse,
    VirtualFittingStatusResponse,
)

router = APIRouter(prefix="/api/fast-fitting", tags=["fast-fitting"])

logger = logging.getLogger(__name__)

async def save_temp_image(upload_file: UploadFile, prefix: str) -> str:
    """임시 이미지 저장"""
    import uuid
    from pathlib import Path
    
    # 프로젝트 루트 경로
    project_root = Path(__file__).parent.parent.parent.parent
    temp_dir = project_root / "uploads" / "temp_fitting"
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    # 파일 확장자 추출
    file_extension = upload_file.filename.split(".")[-1]
    # 고유한 파일명 생성
    filename = f"{prefix}_{uuid.uuid4()}.{file_extension}"
    file_path = temp_dir / filename
    
    # 파일 저장
    with open(file_path, "wb") as f:
        content = await upload_file.read()
        f.write(content)
    
    # 상대 경로 반환
    return f"uploads/temp_fitting/{filename}"

def get_clothing_image_by_source(clothing_id: int, source: str, db: Session, user_id: int) -> Optional[str]:
    """소스를 지정하여 의류 이미지 경로 조회"""
    
    logger.info(f"의류 이미지 경로 조회: clothing_id={clothing_id}, source={source}, user_id={user_id}")
    
    if source == "liked":
        # 좋아요한 의류
        clothing_item = db.query(ClothingItems).filter(
            ClothingItems.product_id == clothing_id
        ).first()
        
        if clothing_item:
            liked = db.query(LikedClothes).filter(
                LikedClothes.clothing_id == clothing_id,
                LikedClothes.user_id == user_id
            ).first()
            if liked:
                logger.info(f"좋아요한 의류에서 발견: {clothing_item.product_image_url}")
                return clothing_item.product_image_url
    
    elif source == "custom":
        # 커스터마이징 의류
        custom = db.query(CustomClothingItems).filter(
            CustomClothingItems.custom_clothing_id == clothing_id,
            CustomClothingItems.user_id == user_id
        ).first()
        
        if custom and custom.custom_image_url:
            logger.info(f"커스텀 의류에서 발견: {custom.custom_image_url}")
            return custom.custom_image_url
    
    elif source == "closet":
        # 내 옷장
        user_cloth = db.query(UserClothes).filter(
            UserClothes.id == clothing_id,
            UserClothes.user_id == user_id
        ).first()
        
        if user_cloth and user_cloth.image_url:
            logger.info(f"내 옷장에서 발견: {user_cloth.image_url}")
            return user_cloth.image_url
    
    logger.warning(f"의류 이미지를 찾을 수 없음: clothing_id={clothing_id}, source={source}")
    return None

def get_clothing_image_path(clothing_id: int, db: Session, user_id: int) -> Optional[str]:
    """의류 ID로 이미지 경로 조회 (좋아요한 의류, 커스텀 의류, 내 옷장) - 하위 호환성"""
    
    logger.info(f"의류 이미지 경로 조회 (자동 탐색): clothing_id={clothing_id}, user_id={user_id}")
    
    # 1. ClothingItems에서 찾기 (좋아요한 의류)
    clothing_item = db.query(ClothingItems).filter(
        ClothingItems.product_id == clothing_id
    ).first()
    
    if clothing_item:
        liked = db.query(LikedClothes).filter(
            LikedClothes.clothing_id == clothing_id,
            LikedClothes.user_id == user_id
        ).first()
        if liked:
            logger.info(f"좋아요한 의류에서 발견: {clothing_item.product_image_url}")
            return clothing_item.product_image_url
    
    # 2. 커스터마이징 의류에서 찾기
    custom = db.query(CustomClothingItems).filter(
        CustomClothingItems.custom_clothing_id == clothing_id,
        CustomClothingItems.user_id == user_id
    ).first()
    
    if custom and custom.custom_image_url:
        logger.info(f"커스텀 의류에서 발견: {custom.custom_image_url}")
        return custom.custom_image_url
    
    # 3. 내 옷장에서 찾기
    user_cloth = db.query(UserClothes).filter(
        UserClothes.id == clothing_id,
        UserClothes.user_id == user_id
    ).first()
    
    if user_cloth and user_cloth.image_url:
        logger.info(f"내 옷장에서 발견: {user_cloth.image_url}")
        return user_cloth.image_url
    
    logger.warning(f"의류 이미지를 찾을 수 없음: clothing_id={clothing_id}")
    return None

@router.post("/start", response_model=VirtualFittingStartResponse)
async def start_fast_fitting(
    person_image_id: Optional[int] = Form(None),
    person_image: Optional[UploadFile] = File(None),
    upper_clothing_id: Optional[int] = Form(None),
    lower_clothing_id: Optional[int] = Form(None),
    upper_clothing_source: Optional[str] = Form(None),  # "liked", "custom", "closet"
    lower_clothing_source: Optional[str] = Form(None),  # "liked", "custom", "closet"
    upper_cloth_image: Optional[UploadFile] = File(None),
    lower_cloth_image: Optional[UploadFile] = File(None),
    upper_category: Optional[str] = Form(None),
    lower_category: Optional[str] = Form(None),
    fitting_type: str = Form(...),  # "상의", "하의", "드레스", "상의+하의"
    garment_description: str = Form("Fast virtual fitting"),
    # 모델 선택 및 Leffa 옵션
    model_type: str = Form("change-clothes"),  # "change-clothes" or "leffa"
    leffa_model_type: Optional[str] = Form("viton_hd"),  # "viton_hd" or "dress_code"
    leffa_steps: Optional[int] = Form(30),
    leffa_scale: Optional[float] = Form(2.5),
    leffa_seed: Optional[int] = Form(42),
    leffa_repaint: Optional[bool] = Form(False),
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """빠른 가상 피팅 시작 (Redis 큐 사용)"""
    try:
        logger.info(f"빠른 가상 피팅 시작 요청: user_id={current_user.user_id}, fitting_type={fitting_type}")
        logger.info(f"person_image_id={person_image_id}, upper_clothing_id={upper_clothing_id}, lower_clothing_id={lower_clothing_id}")
        
        # 피팅 타입 유효성 검사
        if fitting_type not in ["상의", "하의", "드레스", "상의+하의"]:
            raise HTTPException(status_code=400, detail="잘못된 피팅 타입입니다.")
        
        # 인물 이미지 경로 확인
        person_image_path = None
        
        if person_image_id:
            # DB에서 인물 이미지 조회
            # PersonImages의 PK는 id, 이미지는 image_url
            person_img = db.query(PersonImages).filter(
                PersonImages.id == person_image_id,
                PersonImages.user_id == current_user.user_id
            ).first()
            
            if not person_img:
                raise HTTPException(status_code=404, detail="인물 이미지를 찾을 수 없습니다.")
            
            person_image_path = person_img.image_url
            logger.info(f"인물 이미지 경로: {person_image_path}")
        
        elif person_image:
            # 직접 첨부한 인물 이미지 저장
            person_image_path = await save_temp_image(person_image, "person")
            logger.info(f"직접 첨부한 인물 이미지 저장: {person_image_path}")
        
        else:
            raise HTTPException(status_code=400, detail="인물 이미지를 제공해야 합니다.")
        
        # 의류 이미지 경로 확인
        upper_cloth_path = None
        lower_cloth_path = None
        
        # 상의 이미지
        if upper_clothing_id:
            if upper_clothing_source:
                # 소스가 지정된 경우
                upper_cloth_path = get_clothing_image_by_source(upper_clothing_id, upper_clothing_source, db, current_user.user_id)
            else:
                # 하위 호환성: 자동 탐색
                upper_cloth_path = get_clothing_image_path(upper_clothing_id, db, current_user.user_id)
            
            if not upper_cloth_path:
                raise HTTPException(status_code=404, detail="상의 이미지를 찾을 수 없습니다.")
        elif upper_cloth_image:
            upper_cloth_path = await save_temp_image(upper_cloth_image, "upper_cloth")
            logger.info(f"직접 첨부한 상의 이미지 저장: {upper_cloth_path}")
        
        # 하의 이미지
        if lower_clothing_id:
            if lower_clothing_source:
                # 소스가 지정된 경우
                lower_cloth_path = get_clothing_image_by_source(lower_clothing_id, lower_clothing_source, db, current_user.user_id)
            else:
                # 하위 호환성: 자동 탐색
                lower_cloth_path = get_clothing_image_path(lower_clothing_id, db, current_user.user_id)
            
            if not lower_cloth_path:
                raise HTTPException(status_code=404, detail="하의 이미지를 찾을 수 없습니다.")
        elif lower_cloth_image:
            lower_cloth_path = await save_temp_image(lower_cloth_image, "lower_cloth")
            logger.info(f"직접 첨부한 하의 이미지 저장: {lower_cloth_path}")
        
        # 피팅 타입에 따른 검증
        if fitting_type == "상의" and not upper_cloth_path:
            raise HTTPException(status_code=400, detail="상의 이미지를 제공해야 합니다.")
        
        if fitting_type == "하의" and not lower_cloth_path:
            raise HTTPException(status_code=400, detail="하의 이미지를 제공해야 합니다.")
        
        if fitting_type == "드레스" and not (upper_cloth_path or lower_cloth_path):
            raise HTTPException(status_code=400, detail="드레스 이미지를 제공해야 합니다.")
        
        if fitting_type == "상의+하의" and (not upper_cloth_path or not lower_cloth_path):
            raise HTTPException(status_code=400, detail="상의와 하의 이미지를 모두 제공해야 합니다.")
        
        # Leffa 옵션 구성
        leffa_options = {
            "model_type": leffa_model_type,
            "steps": leffa_steps,
            "scale": leffa_scale,
            "seed": leffa_seed,
            "repaint": leffa_repaint
        } if model_type == "leffa" else None
        
        # 빠른 가상 피팅 시작 (Redis 큐 사용)
        process_id = await fast_fitting_service.start_fast_fitting(
            db=db,
            user_id=current_user.user_id,
            person_image_path=person_image_path,
            upper_cloth_image_path=upper_cloth_path,
            lower_cloth_image_path=lower_cloth_path,
            fitting_type=fitting_type,
            garment_description=garment_description,
            model_type=model_type,
            leffa_options=leffa_options
        )
        
        logger.info(f"빠른 가상 피팅 프로세스 생성 완료: process_id={process_id}")
        
        return VirtualFittingStartResponse(
            success=True,
            message="빠른 가상 피팅이 큐에 추가되었습니다.",
            process_id=process_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"빠른 가상 피팅 시작 중 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"빠른 가상 피팅 시작 중 오류가 발생했습니다: {str(e)}")

@router.get("/status/{process_id}", response_model=VirtualFittingStatusResponse)
async def get_fast_fitting_status(
    process_id: int,
    db: Session = Depends(get_db),
    current_user: Users = Depends(get_current_user)
):
    """빠른 가상 피팅 처리 상태 조회"""
    process = fast_fitting_service.get_fitting_status(db, process_id, current_user.user_id)
    
    if not process:
        raise HTTPException(status_code=404, detail="빠른 가상 피팅 처리를 찾을 수 없습니다.")
    
    # 결과 이미지 URL 생성
    result_images = []
    if process.status == 'COMPLETED':
        if process.result_image_1:
            url = f"/{process.result_image_1}"
            result_images.append(url)
    
    return VirtualFittingStatusResponse(
        process_id=process.id,
        status=process.status,
        progress=100 if process.status == 'COMPLETED' else 50 if process.status == 'PROCESSING' else 0,
        result_images=result_images,
        error_message=process.error_message,
        started_at=process.started_at,
        completed_at=process.completed_at
    )
