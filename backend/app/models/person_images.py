from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

# 인물 이미지 테이블 (Person Images Table)
class PersonImages(Base):
    __tablename__ = "person_images"  # 테이블 이름

    id = Column(Integer, primary_key=True, autoincrement=True)  # 고유 번호
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)  # 사용자 ID (외래키)
    image_url = Column(String(500), nullable=False)  # 이미지 파일 경로/URL
    description = Column(Text, nullable=True)  # 인물 설명
    
    # 메타데이터
    created_at = Column(DateTime(timezone=True), server_default=func.now())  # 생성 시간
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())  # 수정 시간
    
    # 관계 설정
    user = relationship("Users", back_populates="person_images")
