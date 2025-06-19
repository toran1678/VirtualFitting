from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json
import logging
import os
import shutil
from pathlib import Path
from typing import Optional
import uuid

from app.db.database import get_db
from app.crud.profile import (
    get_user_profile, 
    update_user_profile, 
    change_user_password, 
    update_privacy_settings
)
from app.schemas.profile import (
    ProfileResponse,
    ProfileUpdateResponse,
    PasswordChangeResponse,
    PrivacySettingsResponse,
    ProfileUpdateRequest,
    PasswordChangeRequest,
    PrivacySettingsRequest
)
from app.models.users import Users

router = APIRouter(
    prefix="/profile",
    tags=["profile"]
)
logger = logging.getLogger(__name__)

def get_current_user_from_session(request: Request, db: Session = Depends(get_db)) -> Users:
    """세션에서 현재 사용자 정보 가져오기"""
    try:
        # 세션에서 사용자 ID 가져오기
        user_id = request.session.get("user_id")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="로그인이 필요합니다."
            )
        
        # 사용자 조회
        user = db.query(Users).filter(Users.user_id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="사용자를 찾을 수 없습니다."
            )
        
        return user
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"세션 사용자 인증 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증에 실패했습니다."
        )

def save_profile_image(profile_picture: UploadFile, user_id: int) -> Optional[str]:
    """프로필 이미지를 저장하고 경로를 반환"""
    try:
        # 업로드 디렉토리 생성
        upload_dir = Path("uploads/profile_pictures")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # 파일 확장자 검증
        allowed_extensions = ["jpg", "jpeg", "png"]
        file_extension = profile_picture.filename.split(".")[-1].lower()
        if file_extension not in allowed_extensions:
            raise ValueError("JPG, JPEG, PNG 파일만 업로드 가능합니다.")
        
        # 파일 크기 검증 (5MB)
        if profile_picture.size > 5 * 1024 * 1024:
            raise ValueError("파일 크기는 5MB 이하여야 합니다.")
        
        # 고유한 파일명 생성
        file_name = f"{user_id}_{uuid.uuid4()}.{file_extension}"
        file_path = upload_dir / file_name
        
        # 파일 저장
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(profile_picture.file, buffer)
        
        return f"/uploads/profile_pictures/{file_name}"
    
    except Exception as e:
        logger.error(f"프로필 이미지 저장 오류: {str(e)}")
        raise ValueError(str(e))

@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    request: Request,
    db: Session = Depends(get_db)
):
    """현재 사용자의 프로필 정보 조회"""
    try:
        current_user = get_current_user_from_session(request, db)
        user = get_user_profile(db, current_user.user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        
        return user
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"프로필 조회 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="프로필 조회 중 오류가 발생했습니다.")

@router.put("/update", response_model=ProfileUpdateResponse)
async def update_profile(
    request: Request,
    data: str = Form(...),
    profile_picture: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """프로필 정보 수정"""
    try:
        current_user = get_current_user_from_session(request, db)
        
        # JSON 데이터 파싱
        profile_data_dict = json.loads(data)
        profile_data = ProfileUpdateRequest(**profile_data_dict)
        
        # 프로필 이미지 처리
        profile_picture_path = None
        if profile_picture:
            logger.info(f"프로필 이미지 처리: {profile_picture.filename}")
            profile_picture_path = save_profile_image(profile_picture, current_user.user_id)
        
        # 프로필 정보 업데이트
        updated_user = update_user_profile(
            db, 
            current_user.user_id, 
            profile_data, 
            profile_picture_path
        )
        
        if not updated_user:
            raise HTTPException(status_code=400, detail="프로필 수정에 실패했습니다.")
        
        return {
            "success": True,
            "message": "프로필이 성공적으로 수정되었습니다.",
            "user": updated_user
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"프로필 수정 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="프로필 수정 중 오류가 발생했습니다.")

@router.put("/change-password", response_model=PasswordChangeResponse)
async def change_password(
    request: Request,
    password_data: PasswordChangeRequest,
    db: Session = Depends(get_db)
):
    """비밀번호 변경"""
    try:
        current_user = get_current_user_from_session(request, db)
        
        success = change_user_password(db, current_user.user_id, password_data.new_password)
        
        if not success:
            raise HTTPException(status_code=400, detail="비밀번호 변경에 실패했습니다.")
        
        return {
            "success": True,
            "message": "비밀번호가 성공적으로 변경되었습니다."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"비밀번호 변경 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="비밀번호 변경 중 오류가 발생했습니다.")

@router.put("/privacy", response_model=PrivacySettingsResponse)
async def update_privacy(
    request: Request,
    privacy_data: PrivacySettingsRequest,
    db: Session = Depends(get_db)
):
    """프라이버시 설정 변경"""
    try:
        current_user = get_current_user_from_session(request, db)
        
        updated_user = update_privacy_settings(db, current_user.user_id, privacy_data)
        
        if not updated_user:
            raise HTTPException(status_code=400, detail="프라이버시 설정 변경에 실패했습니다.")
        
        return {
            "success": True,
            "message": "프라이버시 설정이 성공적으로 변경되었습니다.",
            "is_private": updated_user.is_private
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"프라이버시 설정 변경 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="프라이버시 설정 변경 중 오류가 발생했습니다.")
