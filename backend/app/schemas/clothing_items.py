from pydantic import BaseModel
from typing import Optional

class ClothingItemBase(BaseModel):
    product_name: str
    product_url: str
    product_image_url: str
    brand_name: str
    likes: int = 0
    gender: str
    main_category: str
    sub_category: str

class ClothingItemCreate(ClothingItemBase):
    pass

class ClothingItemResponse(ClothingItemBase):
    product_id: int
    
    class Config:
        from_attributes = True

class ClothingItemsListResponse(BaseModel):
    items: list[ClothingItemResponse]
    total: int
    page: int
    size: int
    total_pages: int
