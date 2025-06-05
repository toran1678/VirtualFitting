from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class FollowRequests(Base):
    __tablename__ = "follow_requests"
    
    request_id = Column(Integer, primary_key=True, autoincrement=True)
    requester_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)  # 요청하는 사용자
    target_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)     # 요청받는 사용자
    status = Column(Enum('pending', 'accepted', 'rejected', name='request_status'), default='pending')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 관계 설정
    requester = relationship("Users", foreign_keys=[requester_id])
    target = relationship("Users", foreign_keys=[target_id])
    
    # 유니크 제약조건 (같은 사용자가 같은 대상에게 중복 요청 방지)
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )
