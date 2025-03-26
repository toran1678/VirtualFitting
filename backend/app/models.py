from sqlalchemy import Column, Integer, String
from database import Base # Base 클래스 import

class Item(Base):
    __tablename__ = "items" # 테이블 이름

    id = Column(Integer, primary_key=True, index=True) # INTEGER, PRIMARY KEY
    name = Column(String(255), index=True) # VARCHAR(255)
    description = Column(String(255)) # VARCHAR(255)