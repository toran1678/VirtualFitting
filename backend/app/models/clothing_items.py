from sqlalchemy import Column, Integer, String, BLOB
from app.db.database import Base

# Clothing Items Table
class ClothingItems(Base):
    __tablename__ = "clothing_items"
    
    item_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    category = Column(String(20), nullable=False)
    sub_category = Column(String(30), nullable=False)
    image = Column(BLOB, nullable=False) # BLOB으로 사용하지 않을 듯?
    image_url = Column(String(255), nullable=False)