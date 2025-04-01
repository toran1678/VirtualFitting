from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

# Feed Table
class Feeds(Base):
    __tablename__ = "feeds"

    feed_id = Column(Integer, primary_key=True, autoincrement=True)
    nickname = Column(String(20), nullable=False)
    title = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    likes = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=datetime.now)

    # 댓글 관계 설정 (1:N)
    comments = relationship("FeedComments", back_populates="feeds", cascade="all, delete")