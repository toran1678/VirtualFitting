from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from app.models.person_images import PersonImages
from app.schemas.person_images import PersonImageCreate, PersonImageUpdate
import os
from datetime import datetime

class PersonImageCRUD:
    
    @staticmethod
    def create_person_image(db: Session, user_id: int, image_url: str, image_data: PersonImageCreate) -> PersonImages:
        """인물 이미지 생성"""
        db_image = PersonImages(
            user_id=user_id,
            image_url=image_url,
            description=image_data.description
        )
        db.add(db_image)
        db.commit()
        db.refresh(db_image)
        return db_image
    
    @staticmethod
    def get_person_image_by_id(db: Session, image_id: int, user_id: int) -> Optional[PersonImages]:
        """ID로 인물 이미지 조회 (소유자 확인)"""
        return db.query(PersonImages).filter(
            PersonImages.id == image_id,
            PersonImages.user_id == user_id
        ).first()
    
    @staticmethod
    def get_user_person_images(
        db: Session, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 20
    ) -> tuple[List[PersonImages], int]:
        """사용자의 인물 이미지 목록 조회 (페이지네이션)"""
        # 전체 개수 조회
        total = db.query(func.count(PersonImages.id)).filter(
            PersonImages.user_id == user_id
        ).scalar()
        
        # 이미지 목록 조회 (최신순)
        images = db.query(PersonImages).filter(
            PersonImages.user_id == user_id
        ).order_by(desc(PersonImages.created_at)).offset(skip).limit(limit).all()
        
        return images, total
    
    @staticmethod
    def update_person_image(
        db: Session, 
        image_id: int, 
        user_id: int, 
        image_data: PersonImageUpdate
    ) -> Optional[PersonImages]:
        """인물 이미지 정보 업데이트"""
        db_image = db.query(PersonImages).filter(
            PersonImages.id == image_id,
            PersonImages.user_id == user_id
        ).first()
        
        if not db_image:
            return None
        
        # 업데이트할 필드만 수정
        if image_data.description is not None:
            db_image.description = image_data.description
        
        db_image.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_image)
        return db_image
    
    @staticmethod
    def delete_person_image(db: Session, image_id: int, user_id: int) -> bool:
        """인물 이미지 삭제"""
        db_image = db.query(PersonImages).filter(
            PersonImages.id == image_id,
            PersonImages.user_id == user_id
        ).first()
        
        if not db_image:
            return False
        
        # 파일 시스템에서 이미지 파일 삭제
        try:
            if db_image.image_url and os.path.exists(db_image.image_url):
                os.remove(db_image.image_url)
        except Exception as e:
            print(f"파일 삭제 실패: {e}")
        
        # 데이터베이스에서 레코드 삭제
        db.delete(db_image)
        db.commit()
        return True
    
    @staticmethod
    def get_user_image_count(db: Session, user_id: int) -> int:
        """사용자의 인물 이미지 총 개수"""
        return db.query(func.count(PersonImages.id)).filter(
            PersonImages.user_id == user_id
        ).scalar()
