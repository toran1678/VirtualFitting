from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, BLOB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

# 1. Users Table
class Users(Base):
    __tablename__ = "users" # 테이블 이름

    user_id = Column(Integer, primary_key=True, autoincrement=True) # INTEGER, PRIMARY KEY, AUTOINCREMENT
    name = Column(String(10), index=True) # VARCHAR(10)
    password_hash = Column(String(255), nullable=False) # VARCHAR(255)
    nickname = Column(String(20), nullable=False, unique=True) # VARCHAR(10) UNIQUE
    password = Column(String(20))
    email = Column(String(30))

# 2. My Room Table
class MyRoom(Base):
    __tablename__ = "my_room"
    
    nickname = Column(String(20), primary_key=True)
    title = Column(String(100), nullable=False)
    image = Column(BLOB, nullable=False)
    
# 3. Clothing Items Table
class ClothingItems(Base):
    __tablename__ = "clothing_items"
    
    item_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    category = Column(String(20), nullable=False)
    subCategory = Column(String(30), nullable=False)
    image = Column(BLOB, nullable=False)

# 4. Feed Table
class Feed(Base):
    __tablename__ = "feed"

    feed_id = Column(Integer, primary_key=True, autoincrement=True)
    nickname = Column(String(20), nullable=False)
    title = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    good = Column(Integer, nullable=False, default=0)
    bad = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # 댓글 관계 설정 (1:N)
    comments = relationship("FeedComent", back_populates="feed", cascade="all, delete")

# 5. Feed Comment Table
class FeedComment(Base):
    __tablename__ = "feed_comment"

    comment_id = Column(Integer, primary_key=True, autoincrement=True)
    feed_id = Column(Integer, ForeignKey("feed.feed_id"), nullable=False)
    nickname = Column(String(20), nullable=False)
    content = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # 역참조
    feed = relationship("Feed", back_populates="comments")

class Item(Base):
    __tablename__ = "items" # 테이블 이름

    id = Column(Integer, primary_key=True, index=True) # INTEGER, PRIMARY KEY
    name = Column(String(255), index=True) # VARCHAR(255)
    description = Column(String(255)) # VARCHAR(255)
    
