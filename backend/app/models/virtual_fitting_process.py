from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

# 가상 피팅 처리 상태 테이블 (Virtual Fitting Process Table)
class VirtualFittingProcess(Base):
    __tablename__ = "virtual_fitting_process"  # 테이블 이름
    
    id = Column(Integer, primary_key=True, autoincrement=True)  # 고유 아이디
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)  # 사용자 아이디
    
    # 처리 상태
    status = Column(Enum('PROCESSING', 'COMPLETED', 'FAILED', 'QUEUED', name='fitting_process_status'), default='PROCESSING')  # 처리 중/처리 완료/처리 실패
    
    # 에러 메시지 추가
    error_message = Column(String(1000), nullable=True)  # 에러 발생 시 메시지
    
    # 결과 이미지 (4-6장) - 처리 완료 후 선택하기 전까지 임시 저장
    result_image_1 = Column(String(500), nullable=True)  # 결과 이미지 1
    result_image_2 = Column(String(500), nullable=True)  # 결과 이미지 2
    result_image_3 = Column(String(500), nullable=True)  # 결과 이미지 3
    result_image_4 = Column(String(500), nullable=True)  # 결과 이미지 4
    result_image_5 = Column(String(500), nullable=True)  # 결과 이미지 5 (선택)
    result_image_6 = Column(String(500), nullable=True)  # 결과 이미지 6 (선택)
    
    # 시간 정보
    started_at = Column(DateTime(timezone=True), server_default=func.now())  # 처리 시작 시간
    completed_at = Column(DateTime(timezone=True), nullable=True)  # 처리 완료 시간
    
    # 관계 설정
    user = relationship("Users", back_populates="virtual_fitting_process")
