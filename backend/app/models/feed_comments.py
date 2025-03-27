from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

# Feed Comment Table
class FeedComment(Base):
    __tablename__ = "feed_comment"

    comment_id = Column(Integer, primary_key=True, autoincrement=True)
    feed_id = Column(Integer, ForeignKey("feed.feed_id"), nullable=False)
    nickname = Column(String(20), nullable=False)
    content = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    feed = relationship("Feed", back_populates="comments")
