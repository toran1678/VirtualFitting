from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class BackgroundCustoms(Base):
    __tablename__ = "background_customs"

    custom_fitting_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    fitting_id = Column(
        Integer,
        ForeignKey("virtual_fittings.fitting_id", ondelete="CASCADE"),
        nullable=False,
    )
    custom_image_url = Column(String(255), nullable=False)
    background_image_url = Column(
        String(255), nullable=True
    )  # 사용자가 선택한 배경 이미지 URL
    title = Column(String(200), nullable=True)  # 커스텀 결과에 대한 제목
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # 관계 설정
    user = relationship("Users", back_populates="background_customs")
    original_fitting = relationship(
        "VirtualFittings", back_populates="background_customs"
    )
