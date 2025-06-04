from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class LikedClothesBase(BaseModel):
    user_id: int
    clothing_id: int

class LikedClothesCreate(LikedClothesBase):
    pass

class LikedClothesResponse(LikedClothesBase):
    liked_at: datetime
    
    class Config:
        from_attributes = True
        
class LikedClothesWithItemResponse(BaseModel):
    """좋아요한 의류 정보와 의류 아이템 정보를 함께 반환"""
    clothing_id: int
    liked_at: datetime
    product_name: str
    product_url: str
    product_image_url: str
    brand_name: str
    main_category: str
    sub_category: str
    gender: str
    
    class Config:
        from_attributes = True

class LikeToggleRequest(BaseModel):
    clothing_id: int

class LikeToggleResponse(BaseModel):
    is_liked: bool
    total_likes: int
    message: str
