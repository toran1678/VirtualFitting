from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
from datetime import datetime, timezone, timedelta

class EmailVerification(Base):
    __tablename__ = "email_verifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(100), nullable=False, index=True)
    code = Column(String(10), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    
    @classmethod
    def create_verification(cls, email, code, expiry_minutes=3):
        """새 인증 코드 생성"""
        return cls(
            email=email,
            code=code,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)
        )
    
    def is_expired(self):
        """인증 코드 만료 여부 확인"""
        return datetime.now(timezone.utc) > self.expires_at
