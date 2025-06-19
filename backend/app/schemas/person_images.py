from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# 인물 이미지 생성 스키마
class PersonImageCreate(BaseModel):
    description: Optional[str] = Field(None, max_length=1000, description="인물 설명")

# 인물 이미지 업데이트 스키마
class PersonImageUpdate(BaseModel):
    description: Optional[str] = Field(None, max_length=1000, description="인물 설명")

# 인물 이미지 응답 스키마
class PersonImageResponse(BaseModel):
    id: int
    user_id: int
    image_url: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# 인물 이미지 목록 응답 스키마
class PersonImageListResponse(BaseModel):
    images: list[PersonImageResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

# 업로드 응답 스키마
class PersonImageUploadResponse(BaseModel):
    success: bool
    message: str
    image: Optional[PersonImageResponse] = None
