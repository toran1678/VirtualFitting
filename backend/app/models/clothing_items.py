from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.database import Base

# Clothing Items Table
class ClothingItems(Base):
    __tablename__ = "clothing_items"
    
    product_id = Column(Integer, primary_key=True, autoincrement=True)
    product_name = Column(String(100), nullable=False)
    product_url = Column(String(255), nullable=False)
    product_image_url = Column(String(255), nullable=False)
    brand_name = Column(String(50), nullable=False)
    likes = Column(Integer, default=0) # 크롤링 시 좋아요 수
    gender = Column(String(10), nullable=False) # 남성, 여성, 유니섹스 등
    main_category = Column(String(20), nullable=False)
    sub_category = Column(String(30), nullable=False)
    
    liked_clothes = relationship("LikedClothes", back_populates="clothing_item", cascade="all, delete")
