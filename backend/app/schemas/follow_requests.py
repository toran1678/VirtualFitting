from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FollowRequestBase(BaseModel):
    requester_id: int
    target_id: int

class FollowRequestCreate(FollowRequestBase):
    pass

class FollowRequestResponse(BaseModel):
    request_id: int
    requester_id: int
    target_id: int
    status: str
    created_at: datetime
    user: dict  # 요청자 정보

    class Config:
        from_attributes = True

class FollowRequestAction(BaseModel):
    message: str
    followers_count: Optional[int] = None

class FollowStatusResponse(BaseModel):
    is_following: bool
    followers_count: int
    message: str
    has_pending_request: Optional[bool] = False
