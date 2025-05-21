from fastapi import APIRouter, Depends, HTTPException, status, Query, Form, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import secrets
import string
import json
import logging
from typing import Optional

from app.db.database import get_db
from app.models.users import Users
from app.models.verification import EmailVerification
from app.schemas.verification import VerificationResponse, VerificationVerifyResponse
from app.utils.email import send_verification_email

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)
logger = logging.getLogger(__name__)

# 이메일 인증 코드 요청 (쿼리 파라미터)
@router.post("/request-verification", status_code=status.HTTP_200_OK, response_model=VerificationResponse)
async def request_verification_query(
    email: str = Query(..., description="인증 코드를 받을 이메일 주소"),
    db: Session = Depends(get_db)
):
    """이메일 인증 코드 요청 (쿼리 파라미터)"""
    try:
        logger.info(f"이메일 인증 코드 요청 (쿼리): {email}")
        
        # 이메일 중복 확인
        user = db.query(Users).filter(Users.email == email).first()
        if user:
            logger.warning(f"이미 등록된 이메일: {email}")
            raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")
        
        # 기존 인증 코드 삭제
        db.query(EmailVerification).filter(EmailVerification.email == email).delete()
        db.commit()
        
        # 인증 코드 생성 (6자리 숫자)
        verification_code = ''.join(secrets.choice(string.digits) for _ in range(6))
        
        # 만료 시간 설정 (3분)
        # 중요: timezone 정보를 포함한 datetime 객체 사용
        expiration_time = datetime.now(timezone.utc) + timedelta(minutes=3)
        
        # 인증 코드 저장
        verification = EmailVerification(
            email=email,
            code=verification_code,
            expires_at=expiration_time
        )
        db.add(verification)
        db.commit()
        
        # 이메일 발송
        try:
            send_verification_email(email, verification_code)
            logger.info(f"인증 코드 이메일 발송 성공: {email}")
        except Exception as e:
            logger.error(f"이메일 발송 오류: {str(e)}")
            db.delete(verification)
            db.commit()
            raise HTTPException(status_code=500, detail="이메일 발송 중 오류가 발생했습니다.")
        
        # 개발 모드에서는 인증 코드 반환 (테스트용)
        import os
        if os.getenv("DEV_MODE", "False").lower() == "true":
            return {"message": "인증 코드가 발송되었습니다.", "code": verification_code}
        
        return {"message": "인증 코드가 발송되었습니다."}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"이메일 인증 코드 요청 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")

# 이메일 인증 코드 확인 (쿼리 파라미터)
@router.post("/verify-email", status_code=status.HTTP_200_OK, response_model=VerificationVerifyResponse)
async def verify_email(
    email: str = Query(..., description="인증할 이메일 주소"),
    code: str = Query(..., description="인증 코드"),
    db: Session = Depends(get_db)
):
    """이메일 인증 코드 확인"""
    try:
        logger.info(f"이메일 인증 코드 확인: {email}, 코드: {code}")
        
        # 인증 정보 조회
        verification = db.query(EmailVerification).filter(
            EmailVerification.email == email,
            EmailVerification.code == code
        ).first()
        
        if not verification:
            logger.warning(f"인증 정보 없음: {email}")
            raise HTTPException(status_code=400, detail="인증 코드가 일치하지 않습니다.")
        
        # 현재 시간 (timezone 정보 포함)
        now = datetime.now(timezone.utc)
        
        # 만료 시간 확인 - 중요: 두 datetime 객체 모두 timezone 정보를 가지고 있어야 함
        # verification.expires_at에 timezone 정보가 없는 경우 추가
        expires_at = verification.expires_at
        if expires_at.tzinfo is None:
            # timezone 정보가 없는 경우 UTC로 가정하고 추가
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if now > expires_at:
            logger.warning(f"인증 코드 만료: {email}")
            db.delete(verification)
            db.commit()
            raise HTTPException(status_code=400, detail="인증 코드가 만료되었습니다.")
        
        # 인증 성공 - 인증 정보 삭제
        db.delete(verification)
        db.commit()
        
        logger.info(f"이메일 인증 성공: {email}")
        return {"success": True, "message": "이메일 인증이 완료되었습니다."}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"이메일 인증 코드 확인 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")
