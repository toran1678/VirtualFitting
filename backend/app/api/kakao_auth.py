from fastapi import APIRouter, Request, Depends, HTTPException, status, Form, UploadFile, File
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.kakao_auth import (
    KakaoAuthRequest, 
    KakaoAuthResponse, 
    AuthorizationUrlResponse,
    KakaoUserInfo,
    KakaoUserCheckResponse
)
from app.crud import kakao_auth as kakao_crud
from app.utils.kakao_oauth import kakao_oauth
from typing import Optional
import uuid
import logging
import json
import shutil
from pathlib import Path
from app.models.users import Users

router = APIRouter(prefix="/auth/kakao", tags=["Kakao Authentication"])
logger = logging.getLogger(__name__)

# 프로필 이미지 저장 함수 (일반 회원가입과 동일)
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

@router.get("/authorization-url", response_model=AuthorizationUrlResponse)
async def get_kakao_authorization_url():
    """카카오 OAuth 인증 URL 생성"""
    state = str(uuid.uuid4())  # CSRF 방지를 위한 state 값
    authorization_url = kakao_oauth.get_authorization_url(state=state)
    
    return AuthorizationUrlResponse(
        authorization_url=authorization_url,
        state=state
    )

@router.post("/process-auth", response_model=KakaoAuthResponse)
async def process_kakao_auth(
    request: Request,
    auth_request: KakaoAuthRequest,
    db: Session = Depends(get_db)
):
    """카카오 인증 처리 - 사용자 확인 및 로그인/회원가입 안내를 한 번에 처리"""
    try:
        # 1. 인증 코드로 액세스 토큰 획득
        token_data = await kakao_oauth.get_access_token(auth_request.authorization_code)
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get access token from Kakao"
            )
        
        # 2. 사용자 정보 조회
        kakao_user_info = await kakao_oauth.get_user_info(access_token)
        user_data = kakao_oauth.extract_user_data(kakao_user_info)
        kakao_info = KakaoUserInfo(**user_data)
        
        # 3. 기존 사용자 확인
        existing_user = kakao_crud.get_user_by_kakao_id(db, kakao_info.kakao_id)
        
        if existing_user:
            # 기존 사용자 - 바로 로그인 처리
            updated_user = kakao_crud.update_user_from_kakao(db, existing_user, kakao_info)
            
            # 세션에 사용자 ID 저장
            request.session["user_id"] = updated_user.user_id
            
            # 사용자 정보 반환
            user_info = {
                "user_id": updated_user.user_id,
                "id": updated_user.id,
                "name": updated_user.name,
                "nickname": updated_user.nickname,
                "email": updated_user.email,
                "profile_picture": updated_user.profile_picture,
                "is_verified": updated_user.is_verified
            }
            
            logger.info(f"카카오 로그인 성공: {updated_user.email}")
            
            return KakaoAuthResponse(
                message="카카오 로그인 성공",
                user=user_info,
                is_new_user=False,
                needs_signup=False
            )
        else:
            # 신규 사용자 - 회원가입 필요
            logger.info(f"신규 카카오 사용자: {kakao_info.kakao_id}")
            
            return KakaoAuthResponse(
                message="회원가입이 필요합니다",
                user=None,
                is_new_user=True,
                needs_signup=True,
                kakao_info={
                    "id": kakao_info.kakao_id,
                    "kakao_id": kakao_info.kakao_id,
                    "nickname": kakao_info.nickname,
                    "email": kakao_info.email,
                    "profile_picture": kakao_info.profile_picture
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"카카오 인증 처리 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"카카오 인증 처리 실패: {str(e)}"
        )

@router.post("/check-user", response_model=KakaoUserCheckResponse)
async def check_kakao_user(
    request: KakaoAuthRequest,
    db: Session = Depends(get_db)
):
    """카카오 사용자 존재 여부 확인 및 정보 조회 (DEPRECATED - process-auth 사용 권장)"""
    try:
        # 1. 인증 코드로 액세스 토큰 획득
        token_data = await kakao_oauth.get_access_token(request.authorization_code)
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get access token from Kakao"
            )
        
        # 2. 사용자 정보 조회
        kakao_user_info = await kakao_oauth.get_user_info(access_token)
        user_data = kakao_oauth.extract_user_data(kakao_user_info)
        kakao_info = KakaoUserInfo(**user_data)
        
        # 3. 기존 사용자 확인
        existing_user = kakao_crud.get_user_by_kakao_id(db, kakao_info.kakao_id)
        
        return KakaoUserCheckResponse(
            user_exists=existing_user is not None,
            kakao_info={
                "id": kakao_info.kakao_id,  # 프론트엔드에서 id로 접근
                "kakao_id": kakao_info.kakao_id,
                "nickname": kakao_info.nickname,
                "email": kakao_info.email,
                "profile_picture": kakao_info.profile_picture
            },
            needs_additional_info=True  # 항상 추가 정보 필요
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Check user failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Check user failed: {str(e)}"
        )

@router.post("/signup", response_model=KakaoAuthResponse)
async def kakao_signup(
    request: Request,
    data: str = Form(...),  # JSON 데이터를 Form으로 받기
    profile_picture: Optional[UploadFile] = File(None),  # 프로필 사진 파일
    db: Session = Depends(get_db)
):
    """카카오 회원가입 - 프로필 사진 업로드 지원"""
    try:
        # JSON 데이터 파싱
        signup_data = json.loads(data)
        logger.info(f"카카오 회원가입 데이터: {signup_data}")
        
        # 1. kakao_id 확인
        kakao_id = signup_data.get("kakao_id")
        if not kakao_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="카카오 ID가 필요합니다."
            )
        
        # 2. 이미 가입된 카카오 사용자인지 확인
        existing_kakao_user = kakao_crud.get_user_by_kakao_id(db, kakao_id)
        if existing_kakao_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 가입된 카카오 계정입니다."
            )
        
        # 3. 필수 정보 확인
        name = signup_data.get("name")
        phone_number = signup_data.get("phone_number")
        email = signup_data.get("email")
        
        if not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이름은 필수 정보입니다."
            )
        
        if not phone_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="전화번호는 필수 정보입니다."
            )
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이메일은 필수 정보입니다."
            )
        
        # 4. 중복 체크
        duplicates = kakao_crud.check_duplicate_user_info(
            db, 
            email=email, 
            phone_number=phone_number,
            nickname=signup_data.get("custom_nickname")
        )
        
        if duplicates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=duplicates
            )
        
        # 5. 프로필 이미지 처리
        profile_picture_path = None
        if profile_picture:
            logger.info(f"카카오 회원가입 프로필 이미지 처리: {profile_picture.filename}")
            # 임시 사용자 ID 생성 (실제 저장 전)
            temp_user_id = f"kakao_{kakao_id}"
            profile_picture_path = save_profile_image(profile_picture, temp_user_id)
            if profile_picture_path:
                logger.info(f"프로필 이미지 저장 성공: {profile_picture_path}")
            else:
                logger.warning("프로필 이미지 저장 실패")
        
        # 6. 기존 이메일/전화번호 사용자가 있는 경우 카카오 연동 제안
        existing_email_user = kakao_crud.get_user_by_email(db, email)
        existing_phone_user = kakao_crud.get_user_by_phone(db, phone_number)
        
        if existing_email_user and not existing_email_user.kakao_id:
            # 기존 이메일 사용자에게 카카오 연동
            updated_user = kakao_crud.link_kakao_to_existing_user(
                db, existing_email_user, kakao_id, profile_picture_path
            )
            is_new_user = False
            message = "기존 계정에 카카오 계정이 연동되었습니다."
        elif existing_phone_user and not existing_phone_user.kakao_id:
            # 기존 전화번호 사용자에게 카카오 연동
            updated_user = kakao_crud.link_kakao_to_existing_user(
                db, existing_phone_user, kakao_id, profile_picture_path
            )
            is_new_user = False
            message = "기존 계정에 카카오 계정이 연동되었습니다."
        else:
            # 7. 새 사용자 생성
            kakao_info = KakaoUserInfo(
                kakao_id=kakao_id,
                nickname=signup_data.get("custom_nickname") or "카카오사용자",
                email=email,
                profile_picture=profile_picture_path  # 업로드된 프로필 사진 경로
            )
            
            updated_user = kakao_crud.create_kakao_user(
                db=db,
                kakao_info=kakao_info,
                name=name,
                phone_number=phone_number,
                email=email,
                birth_date=signup_data.get("birth_date"),
                address=signup_data.get("address"),
                custom_nickname=signup_data.get("custom_nickname")
            )
            is_new_user = True
            message = "카카오 계정으로 회원가입이 완료되었습니다."
        
        # 8. 세션에 사용자 ID 저장
        request.session["user_id"] = updated_user.user_id
        
        # 9. 사용자 정보 반환
        user_info = {
            "user_id": updated_user.user_id,
            "id": updated_user.id,
            "name": updated_user.name,
            "nickname": updated_user.nickname,
            "email": updated_user.email,
            "profile_picture": updated_user.profile_picture,
            "is_verified": updated_user.is_verified
        }
        
        logger.info(f"카카오 회원가입 성공: {updated_user.email}, 프로필 사진: {updated_user.profile_picture}")
        
        return KakaoAuthResponse(
            message=message,
            user=user_info,
            is_new_user=is_new_user
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"카카오 회원가입 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}"
        )

@router.post("/login", response_model=KakaoAuthResponse)
async def kakao_login(
    request: Request,
    login_request: KakaoAuthRequest,
    db: Session = Depends(get_db)
):
    """카카오 로그인 (기존 사용자) - DEPRECATED: process-auth 사용 권장"""
    try:
        # 1. 인증 코드로 액세스 토큰 획득
        token_data = await kakao_oauth.get_access_token(login_request.authorization_code)
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get access token from Kakao"
            )
        
        # 2. 액세스 토큰으로 사용자 정보 조회
        kakao_user_info = await kakao_oauth.get_user_info(access_token)
        user_data = kakao_oauth.extract_user_data(kakao_user_info)
        kakao_info = KakaoUserInfo(**user_data)
        
        # 3. 기존 사용자 확인
        existing_user = kakao_crud.get_user_by_kakao_id(db, kakao_info.kakao_id)
        
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="등록되지 않은 카카오 계정입니다. 회원가입을 먼저 진행해주세요."
            )
        
        # 4. 사용자 정보 업데이트 (프로필 사진 등)
        updated_user = kakao_crud.update_user_from_kakao(db, existing_user, kakao_info)
        
        # 5. 세션에 사용자 ID 저장
        request.session["user_id"] = updated_user.user_id
        
        # 6. 사용자 정보 반환
        user_info = {
            "user_id": updated_user.user_id,
            "id": updated_user.id,
            "name": updated_user.name,
            "nickname": updated_user.nickname,
            "email": updated_user.email,
            "profile_picture": updated_user.profile_picture,
            "is_verified": updated_user.is_verified
        }
        
        logger.info(f"카카오 로그인 성공: {updated_user.email}")
        
        return KakaoAuthResponse(
            message="카카오 로그인 성공",
            user=user_info,
            is_new_user=False
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

# 기존 auth 라우터와 통합하기 위한 현재 사용자 조회
@router.get("/me")
async def get_current_kakao_user(request: Request, db: Session = Depends(get_db)):
    """현재 로그인된 사용자 정보 조회 (세션 기반)"""
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    
    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    
    return {
        "user_id": user.user_id,
        "id": user.id,
        "name": user.name,
        "nickname": user.nickname,
        "email": user.email,
        "profile_picture": user.profile_picture,
        "is_verified": user.is_verified,
        "provider_type": user.provider_type
    }
