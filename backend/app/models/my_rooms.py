from sqlalchemy import Column, String, BLOB
from app.db.database import Base

# My Room Table
class MyRoom(Base):
    __tablename__ = "my_room"
    
    nickname = Column(String(20), primary_key=True)
    title = Column(String(100), nullable=False)
    image = Column(BLOB, nullable=False)