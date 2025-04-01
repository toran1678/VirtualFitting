from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class GoodWishLists(Base):
    __tablename__ = "good_wish_lists"

    goods_list_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    clothing_id = Column(Integer, ForeignKey("clothing_items.clothing_id"), nullable=False)

    # 관계 설정
    users = relationship("Users", backref="good_wish_lists")
    clothing_items = relationship("ClothingItems", backref="good_wish_lists")
