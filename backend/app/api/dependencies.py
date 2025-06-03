from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.users import Users
from typing import Optional

async def get_current_user(request: Request, db: Session = Depends(get_db)) -> Users:
    """현재 로그인한 사용자 정보 반환 (세션 기반)"""
    user_id = request.session.get("user_id")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인이 필요합니다."
        )
    
    user = db.query(Users).filter(Users.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자 정보를 찾을 수 없습니다."
        )
    
    return user

async def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> Optional[Users]:
    """선택적 사용자 인증 (로그인하지 않아도 접근 가능한 API용)"""
    user_id = request.session.get("user_id")
    
    if not user_id:
        return None
    
    user = db.query(Users).filter(Users.user_id == user_id).first()
    return user
