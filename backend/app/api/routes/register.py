from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json
import logging
import os
import shutil
from pathlib import Path
from typing import Optional
import uuid
import hashlib  # 간단한 해싱을 위한 라이브러리

from app.db.database import get_db
from app.models.users import Users
from app.schemas.users import RegisterUserInfo, RegisterResponse

router = APIRouter(
    tags=["register"]
)
logger = logging.getLogger(__name__)

# 간단한 비밀번호 해싱 함수
def hash_password(password: str) -> str:
    """SHA-256을 사용한 간단한 비밀번호 해싱"""
    # 솔트 추가 (보안 강화)
    salt = "virtual_fitting_salt"  # 실제 환경에서는 환경 변수로 관리하는 것이 좋습니다
    salted_password = password + salt
    # SHA-256 해싱
    hashed = hashlib.sha256(salted_password.encode()).hexdigest()
    return hashed

# 프로필 이미지 저장 함수
def save_profile_image(profile_picture, user_id):
    """프로필 이미지를 저장하고 경로를 반환"""
    try:
        # 업로드 디렉토리 생성
        upload_dir = Path("uploads/profile_pictures")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # 고유한 파일명 생성 (사용자 ID + UUID + 확장자)
        file_extension = profile_picture.filename.split(".")[-1]
        file_name = f"{user_id}_{uuid.uuid4()}.{file_extension}"
        file_path = upload_dir / file_name
        
        # 파일 저장
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(profile_picture.file, buffer)
        
        # 저장된 파일의 경로 반환 (DB에 저장할 경로)
        return f"/uploads/profile_pictures/{file_name}"
    
    except Exception as e:
        logger.error(f"프로필 이미지 저장 오류: {str(e)}")
        return None

@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=RegisterResponse)
async def register_user(
    data: str = Form(...),
    profile_picture: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    회원가입 API
    
    - 사용자 정보와 선택적으로 프로필 이미지를 받아 처리
    - 프로필 이미지가 있는 경우 저장하고 경로 기록
    - 비밀번호 해싱 처리
    - 중복 검사 (아이디, 이메일, 닉네임, 전화번호)
    """
    try:
        logger.info("회원가입 요청 시작")
        
        # JSON 데이터 파싱
        user_data = json.loads(data)
        logger.info(f"사용자 데이터 수신: {user_data['id']}, {user_data['email']}")
        
        # 필수 필드 검증
        required_fields = ["id", "name", "password", "nickname", "email", "phone_number"]
        for field in required_fields:
            if field not in user_data or not user_data[field]:
                raise HTTPException(status_code=400, detail=f"{field} 필드는 필수입니다.")
        
        # 아이디 중복 확인
        if db.query(Users).filter(Users.id == user_data["id"]).first():
            raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다.")
        
        # 이메일 중복 확인
        if db.query(Users).filter(Users.email == user_data["email"]).first():
            raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")
        
        # 닉네임 중복 확인
        if db.query(Users).filter(Users.nickname == user_data["nickname"]).first():
            raise HTTPException(status_code=400, detail="이미 사용 중인 닉네임입니다.")
        
        # 전화번호 중복 확인 (하이픈 제거)
        phone_number = user_data["phone_number"].replace("-", "")
        if db.query(Users).filter(Users.phone_number == phone_number).first():
            raise HTTPException(status_code=400, detail="이미 등록된 전화번호입니다.")
        
        # 비밀번호 해싱 (간단한 방식)
        hashed_password = hash_password(user_data["password"])
        
        # 프로필 이미지 처리
        profile_picture_path = None
        if profile_picture:
            logger.info(f"프로필 이미지 처리: {profile_picture.filename}")
            profile_picture_path = save_profile_image(profile_picture, user_data["id"])
        
        # 생년월일 처리
        birth_date = None
        if "birth_date" in user_data and user_data["birth_date"]:
            birth_date = user_data["birth_date"]
        
        # 주소 처리
        address = None
        if "address" in user_data and user_data["address"]:
            address = user_data["address"]
        
        # 사용자 생성
        new_user = Users(
            id=user_data["id"],
            name=user_data["name"],
            password_hash=hashed_password,
            nickname=user_data["nickname"],
            email=user_data["email"],
            birth_date=birth_date,
            phone_number=phone_number,
            address=address,
            profile_picture=profile_picture_path,
            is_verified=user_data.get("is_verified", False),
            provider_type="local",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"회원가입 성공: {new_user.id}")
        
        # 응답 데이터 생성 (비밀번호 제외)
        return {
            "success": True,
            "message": "회원가입이 완료되었습니다.",
            "user": {
                "user_id": new_user.user_id,
                "id": new_user.id,
                "name": new_user.name,
                "nickname": new_user.nickname,
                "email": new_user.email,
                "phone_number": new_user.phone_number,
                "profile_picture": new_user.profile_picture,
                "is_verified": new_user.is_verified
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"회원가입 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"회원가입 처리 중 오류가 발생했습니다: {str(e)}")
