from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# 댓글 기본 스키마
class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    parent_id: Optional[int] = None  # 대댓글인 경우 부모 댓글 ID

class CommentUpdate(BaseModel):
    content: str 

# 사용자 간단 정보 (댓글용)
class CommentUserBrief(BaseModel):
    user_id: int
    nickname: str
    profile_picture: Optional[str] = None

    class Config:
        from_attributes = True

# 댓글 응답 스키마 (재귀적 구조)
class CommentResponse(BaseModel):
    comment_id: int
    user_id: int
    feed_id: int
    parent_id: Optional[int] = None
    content: str
    created_at: datetime
    user: CommentUserBrief
    replies: List['CommentResponse'] = []  # 대댓글 목록
    reply_count: int = 0  # 대댓글 수

    class Config:
        from_attributes = True

# 재귀적 참조를 위한 모델 업데이트
CommentResponse.model_rebuild()

# 댓글 목록 응답 스키마
class CommentListResponse(BaseModel):
    comments: List[CommentResponse]
    total: int
    page: int
    size: int
    total_pages: int
