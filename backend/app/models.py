from sqlalchemy import Column, Integer, String
from database import Base

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)  # VARCHAR(255)로 수정
    description = Column(String(255))  # VARCHAR(255)로 수정