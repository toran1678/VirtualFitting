from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# 피드 이미지 스키마
class FeedImageBase(BaseModel):
    image_url: str
    image_order: int = 1

class FeedImageCreate(FeedImageBase):
    pass

class FeedImageResponse(FeedImageBase):
    id: int
    feed_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# 피드 스키마
class FeedBase(BaseModel):
    title: str
    content: str

class FeedCreate(FeedBase):
    pass

class FeedUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

# 사용자 간단 정보
class UserBrief(BaseModel):
    user_id: int
    nickname: str
    email: str
    profile_picture: Optional[str] = None
    isFollowing: Optional[bool] = False

    class Config:
        from_attributes = True

# 피드 응답 스키마
class FeedResponse(BaseModel):
    feed_id: int
    user_id: int
    title: str
    content: str
    created_at: datetime
    updated_at: datetime
    user: UserBrief
    images: List[dict] = []
    like_count: Optional[int] = 0
    comment_count: Optional[int] = 0
    is_liked: Optional[bool] = False

    class Config:
        from_attributes = True

# 피드 목록 응답 스키마
class FeedListResponse(BaseModel):
    feeds: List[FeedResponse]
    total: int
    page: int
    size: int
    total_pages: int
