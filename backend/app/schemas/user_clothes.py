from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class UserClothesBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="의류명")
    brand: Optional[str] = Field(None, max_length=50, description="브랜드명")
    category: str = Field(..., description="카테고리 (top, bottom, outer, dress, shoes, accessories)")
    color: Optional[str] = Field(None, max_length=50, description="색상")
    season: Optional[str] = Field(None, description="계절 (spring, summer, fall, winter, all)")
    style: Optional[str] = Field(None, max_length=50, description="스타일")

class UserClothesCreate(UserClothesBase):
    pass

class UserClothesUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    brand: Optional[str] = Field(None, max_length=50)
    category: Optional[str] = None
    color: Optional[str] = Field(None, max_length=50)
    season: Optional[str] = None
    style: Optional[str] = Field(None, max_length=50)

class UserClothesResponse(UserClothesBase):
    id: int
    user_id: int
    image_url: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserClothesListResponse(BaseModel):
    clothes: List[UserClothesResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class UserClothesUploadResponse(BaseModel):
    success: bool
    message: str
    clothing: UserClothesResponse

class UserClothesStatsResponse(BaseModel):
    total_count: int
    category_counts: dict
    recent_uploads: int
