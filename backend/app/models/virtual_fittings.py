from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

class VirtualFittings(Base):
    __tablename__ = "virtual_fittings"

    fitting_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    clothing_id = Column(Integer, ForeignKey("clothing_items.clothing_id"), nullable=False)
    fitting_image = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=datetime.now)

    # 관계 설정
    users = relationship("Users", backref="virtual_fittings")
    clothing_items = relationship("ClothingItems", backref="virtual_fittings")