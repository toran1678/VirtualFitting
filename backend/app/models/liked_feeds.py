from sqlalchemy import Column, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.db.database import Base

class LikedFeeds(Base):
    __tablename__ = "liked_feeds"

    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    feed_id = Column(Integer, ForeignKey("feeds.feed_id", ondelete="CASCADE"), primary_key=True)
    liked_at = Column(DateTime, server_default=func.now())

    user = relationship("Users", back_populates="liked_feed")
    feed = relationship("Feeds", back_populates="liked_feed")