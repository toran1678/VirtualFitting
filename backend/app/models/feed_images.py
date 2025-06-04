from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, func
from sqlalchemy.orm import relationship
from app.db.database import Base

# Feed Images Table
class FeedImages(Base):
    __tablename__ = "feed_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    feed_id = Column(Integer, ForeignKey("feeds.feed_id"), nullable=False)
    image_url = Column(String(255), nullable=False)
    image_order = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, server_default=func.now())

    # 피드와의 관계 설정 (N:1)
    feed = relationship("Feeds", back_populates="feed_images")