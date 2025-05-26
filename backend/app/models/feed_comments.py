from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship, backref
from datetime import datetime, timezone
from app.db.database import Base

# Feed Comment Table
class FeedComments(Base):
    __tablename__ = "feed_comments"

    comment_id = Column(Integer, primary_key=True, autoincrement=True) # 댓글 ID값
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False) # 댓글 작성자 ID값
    feed_id = Column(Integer, ForeignKey("feeds.feed_id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("feed_comments.comment_id"), nullable=True) # 부모 댓글 ID값
    
    content = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    feed = relationship("Feeds", back_populates="feed_comment")
    user = relationship("Users", back_populates="feed_comment")
    
    parent = relationship("FeedComments", remote_side=[comment_id], backref=backref("replies", cascade="all, delete"))