# custom_clothing_item.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

class CustomClothingItems(Base):
    __tablename__ = "custom_clothing_items"

    custom_clothing_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    custom_name = Column(String(100), nullable=False)
    custom_image_url = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=datetime.now)

    # 관계 설정
    user = relationship("Users", back_populates="custom_clothing_item")