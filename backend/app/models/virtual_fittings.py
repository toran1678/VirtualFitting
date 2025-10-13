from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import pytz
from app.db.database import Base


class VirtualFittings(Base):
    __tablename__ = "virtual_fittings"

    fitting_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )

    fitting_image_url = Column(String(255), nullable=False)
    title = Column(String(200), nullable=True)  # 사용자가 결과에 붙인 이름
    # 선택 당시의 입력 이미지 경로(참조용)
    source_model_image_url = Column(String(500), nullable=True)
    source_cloth_image_url = Column(String(500), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(pytz.timezone("Asia/Seoul")),
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(pytz.timezone("Asia/Seoul")),
        onupdate=lambda: datetime.now(pytz.timezone("Asia/Seoul")),
    )

    # 관계 설정
    user = relationship("Users", back_populates="virtual_fitting")
    # clothing_item = relationship("ClothingItems", backref="virtual_fitting")
    background_customs = relationship(
        "BackgroundCustoms", back_populates="original_fitting", cascade="all, delete"
    )  # 배경 커스텀 관계 설정
