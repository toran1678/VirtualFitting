from sqlalchemy import Column, Integer, ForeignKey, String, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.db.database import Base

# Feed Table
class Feeds(Base):
    __tablename__ = "feeds"

    feed_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    title = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(String(255), nullable=True) # 피드 이미지 URL
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # 댓글 관계 설정 (1:N)
    liked_feed = relationship("LikedFeeds", back_populates="feed", cascade="all, delete")
    feed_comment = relationship("FeedComments", back_populates="feed", cascade="all, delete")
    feed_images = relationship("FeedImages", back_populates="feed", cascade="all, delete")
    user = relationship("Users", back_populates="feed")