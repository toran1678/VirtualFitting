from sqlalchemy import Column, String, BLOB, DateTime
from app.db.database import Base
from datetime import datetime, timezone

# My Room Table
class MyRoom(Base):
    __tablename__ = "my_room"
    
    nickname = Column(String(20), primary_key=True)
    title = Column(String(100), nullable=False)
    image = Column(BLOB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))