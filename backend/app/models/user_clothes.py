from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.db.database import Base

# My Room Table
class UserClothes(Base):
    __tablename__ = "user_clothes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    brand = Column(String(50), nullable=True)
    category = Column(String(50), nullable=False)
    image_url = Column(String(255), nullable=False)
    color = Column(String(50))
    season = Column(String(20))
    style = Column(String(50))
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("Users", back_populates="user_clothes")