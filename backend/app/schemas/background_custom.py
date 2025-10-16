from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class BackgroundCustomRequest(BaseModel):
    fitting_id: int
    background_image_url: Optional[str] = None


class BackgroundCustomResponse(BaseModel):
    success: bool
    message: str
    custom_fitting_id: int
    image_url: str
    title: str


class BackgroundCustomPreviewResponse(BaseModel):
    success: bool
    message: str
    image_url: str


class BackgroundCustomItem(BaseModel):
    custom_fitting_id: int
    title: str
    image_url: str
    created_at: datetime


class BackgroundCustomListResponse(BaseModel):
    custom_fittings: List[BackgroundCustomItem]
    total: int
    page: int
    per_page: int
    total_pages: int
