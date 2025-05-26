from sqlalchemy import Column, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.db.database import Base

class LikedClothes(Base):
    __tablename__ = "liked_clothes"

    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True, nullable=False)
    clothing_id = Column(Integer, ForeignKey("clothing_items.product_id"), primary_key=True, nullable=False)
    liked_at = Column(DateTime, server_default=func.now())

    # 관계 설정
    user = relationship("Users", back_populates="liked_clothes")
    clothing_item = relationship("ClothingItems", back_populates="liked_clothes")
