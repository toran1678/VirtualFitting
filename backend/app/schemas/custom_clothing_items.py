from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CustomClothingItemBase(BaseModel):
    custom_name: str = Field(..., min_length=1, max_length=100, description="커스터마이징 의류 이름")

class CustomClothingItemCreate(CustomClothingItemBase):
    pass

class CustomClothingItemUpdate(BaseModel):
    custom_name: Optional[str] = Field(None, min_length=1, max_length=100, description="커스터마이징 의류 이름")

class CustomClothingItemResponse(CustomClothingItemBase):
    custom_clothing_id: int
    user_id: int
    custom_image_url: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CustomClothingItemListResponse(BaseModel):
    custom_clothes: list[CustomClothingItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

