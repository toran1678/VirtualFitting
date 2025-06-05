from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.feeds import Feeds
from app.models.users import Users
from app.models.feed_images import FeedImages
from typing import List, Tuple, Optional

def get_user_feeds(db: Session, user_id: int, skip: int = 0, limit: int = 20) -> Tuple[List[dict], int]:
    """특정 사용자의 피드 목록 조회"""
    # 피드 목록 조회
    feeds = db.query(Feeds).filter(
        Feeds.user_id == user_id
    ).order_by(Feeds.created_at.desc()).offset(skip).limit(limit).all()
    
    # 총 개수
    total = db.query(Feeds).filter(Feeds.user_id == user_id).count()
    
    # 피드 데이터 포맷팅
    feed_list = []
    for feed in feeds:
        # 사용자 정보
        user = db.query(Users).filter(Users.user_id == feed.user_id).first()
        
        # 이미지 정보
        images = db.query(FeedImages).filter(
            FeedImages.feed_id == feed.feed_id
        ).order_by(FeedImages.image_order).all()
        
        # 좋아요 수와 댓글 수 계산
        like_count = 0
        comment_count = 0
        
        try:
            from app.models.liked_feeds import LikedFeeds
            like_count = db.query(LikedFeeds).filter(LikedFeeds.feed_id == feed.feed_id).count()
        except ImportError:
            pass
        
        try:
            from app.models.feed_comments import FeedComments
            comment_count = db.query(FeedComments).filter(FeedComments.feed_id == feed.feed_id).count()
        except ImportError:
            pass
        
        feed_data = {
            "feed_id": feed.feed_id,
            "user_id": feed.user_id,
            "title": feed.title,
            "content": feed.content,
            "created_at": feed.created_at,
            "updated_at": feed.updated_at,
            "user": {
                "user_id": user.user_id,
                "nickname": user.nickname,
                "email": user.email,  # 이메일 필드 명시적으로 추가
                "profile_picture": user.profile_picture,
                "isFollowing": False  # 다른 사용자 프로필에서는 기본값
            } if user else {
                "user_id": feed.user_id,
                "nickname": "알 수 없는 사용자",
                "email": "unknown@example.com",  # 기본 이메일 추가
                "profile_picture": None,
                "isFollowing": False
            },
            "images": [
                {
                    "id": img.id,
                    "image_url": img.image_url,
                    "image_order": img.image_order
                }
                for img in images
            ],
            "like_count": like_count,
            "comment_count": comment_count,
            "is_liked": False  # 다른 사용자 프로필에서는 기본값
        }
        feed_list.append(feed_data)
    
    return feed_list, total

def get_user_liked_clothes(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    """특정 사용자의 좋아요한 의류 목록 조회"""
    from app.crud.liked_clothes import get_user_liked_clothes_with_items
    return get_user_liked_clothes_with_items(db, user_id, skip, limit)

# 가상 피팅과 커스텀 의류 조회 함수들도 필요에 따라 추가
def get_user_virtual_fittings(db: Session, user_id: int, skip: int = 0, limit: int = 20):
    """특정 사용자의 가상 피팅 목록 조회 (모델이 있다면)"""
    # 가상 피팅 모델이 구현되면 여기에 추가
    return [], 0

def get_user_custom_clothes(db: Session, user_id: int, skip: int = 0, limit: int = 20):
    """특정 사용자의 커스텀 의류 목록 조회 (모델이 있다면)"""
    # 커스텀 의류 모델이 구현되면 여기에 추가
    return [], 0
