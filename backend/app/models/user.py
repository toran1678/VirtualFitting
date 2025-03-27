from sqlalchemy import Column, Integer, String
from backend.app.db.database import Base

# 1. Member Table
class Member(Base):
    __tablename__ = "users" # 테이블 이름

    user_id = Column(Integer, primary_key=True, autoincrement=True) # INTEGER, PRIMARY KEY, AUTOINCREMENT
    name = Column(String(10), index=True) # VARCHAR(10)
    password_hash = Column(String(255), nullable=False) # VARCHAR(255)
    nickname = Column(String(20), nullable=False, unique=True) # VARCHAR(10) UNIQUE
    password = Column(String(20))
    email = Column(String(30))