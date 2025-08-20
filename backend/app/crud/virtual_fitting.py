from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.virtual_fitting_process import VirtualFittingProcess
from app.models.virtual_fittings import VirtualFittings

class VirtualFittingCRUD:
    
    @staticmethod
    def get_user_fitting_processes(
        db: Session, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 20,
        status_filter: Optional[str] = None
    ) -> tuple[List[VirtualFittingProcess], int]:
        """사용자의 가상 피팅 처리 목록 조회 (상태 필터링 지원)"""
        query = db.query(VirtualFittingProcess).filter(
            VirtualFittingProcess.user_id == user_id
        )
        
        # 상태 필터 적용
        if status_filter:
            query = query.filter(VirtualFittingProcess.status == status_filter)
        
        total = query.count()
        processes = query.order_by(
            VirtualFittingProcess.started_at.desc()
        ).offset(skip).limit(limit).all()
        
        return processes, total
    
    @staticmethod
    def get_user_fitting_results(
        db: Session, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 20
    ) -> tuple[List[VirtualFittings], int]:
        """사용자의 가상 피팅 결과 목록 조회"""
        query = db.query(VirtualFittings).filter(
            VirtualFittings.user_id == user_id
        )
        
        total = query.count()
        results = query.order_by(
            VirtualFittings.created_at.desc()
        ).offset(skip).limit(limit).all()
        
        return results, total
    
    @staticmethod
    def get_fitting_process_by_id(
        db: Session, 
        process_id: int, 
        user_id: int
    ) -> Optional[VirtualFittingProcess]:
        """특정 가상 피팅 처리 조회"""
        return db.query(VirtualFittingProcess).filter(
            VirtualFittingProcess.id == process_id,
            VirtualFittingProcess.user_id == user_id
        ).first()
    
    @staticmethod
    def get_user_process_statistics(
        db: Session,
        user_id: int
    ) -> dict:
        """사용자의 프로세스 상태 통계 집계"""
        from sqlalchemy import func
        rows = db.query(
            VirtualFittingProcess.status,
            func.count()
        ).filter(
            VirtualFittingProcess.user_id == user_id
        ).group_by(
            VirtualFittingProcess.status
        ).all()
        stats = { status: count for status, count in rows }
        # 누락 상태 0으로 채우기
        for s in ['QUEUED','PROCESSING','COMPLETED','FAILED']:
            stats.setdefault(s, 0)
        return stats
    
    @staticmethod
    def delete_fitting_result(
        db: Session, 
        fitting_id: int, 
        user_id: int
    ) -> bool:
        """가상 피팅 결과 삭제"""
        result = db.query(VirtualFittings).filter(
            VirtualFittings.fitting_id == fitting_id,
            VirtualFittings.user_id == user_id
        ).first()
        
        if result:
            # 이미지 파일도 삭제
            import os
            if os.path.exists(result.fitting_image_url):
                try:
                    os.remove(result.fitting_image_url)
                except Exception as e:
                    print(f"이미지 파일 삭제 실패: {e}")
            
            db.delete(result)
            db.commit()
            return True
        
        return False
