from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

# Feed Comment Table
class FeedComments(Base):
    __tablename__ = "feed_comments"

    comment_id = Column(Integer, primary_key=True, autoincrement=True) # 댓글 ID값
    parent_id = Column(Integer, ForeignKey("feed_comments.comment_id"), nullable=True) # 부모 댓글 ID값
    feed_id = Column(Integer, ForeignKey("feeds.feed_id"), nullable=False)
    nickname = Column(String(20), nullable=False)
    content = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    feeds = relationship("Feeds", back_populates="comments")
