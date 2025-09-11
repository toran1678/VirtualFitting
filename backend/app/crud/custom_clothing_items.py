from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.custom_clothing_items import CustomClothingItems
from app.schemas.custom_clothing_items import CustomClothingItemCreate, CustomClothingItemUpdate
from typing import List, Tuple, Optional
import os

class CustomClothingItemsCRUD:
    
    @staticmethod
    def create_custom_clothing_item(
        db: Session, 
        user_id: int, 
        image_url: str, 
        custom_data: CustomClothingItemCreate
    ) -> CustomClothingItems:
        """새 커스터마이징 의류 아이템 생성"""
        db_custom_clothing = CustomClothingItems(
            user_id=user_id,
            custom_image_url=image_url,
            custom_name=custom_data.custom_name
        )
        db.add(db_custom_clothing)
        db.commit()
        db.refresh(db_custom_clothing)
        return db_custom_clothing
    
    @staticmethod
    def get_user_custom_clothes(
        db: Session, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 20
    ) -> Tuple[List[CustomClothingItems], int]:
        """사용자의 커스터마이징 의류 목록 조회"""
        query = db.query(CustomClothingItems).filter(CustomClothingItems.user_id == user_id)
        
        total = query.count()
        custom_clothes = query.order_by(desc(CustomClothingItems.created_at)).offset(skip).limit(limit).all()
        
        return custom_clothes, total
    
    @staticmethod
    def get_custom_clothing_by_id(db: Session, custom_clothing_id: int, user_id: int) -> Optional[CustomClothingItems]:
        """특정 커스터마이징 의류 아이템 조회"""
        return db.query(CustomClothingItems).filter(
            CustomClothingItems.custom_clothing_id == custom_clothing_id,
            CustomClothingItems.user_id == user_id
        ).first()
    
    @staticmethod
    def update_custom_clothing_item(
        db: Session, 
        custom_clothing_id: int, 
        user_id: int, 
        custom_data: CustomClothingItemUpdate
    ) -> Optional[CustomClothingItems]:
        """커스터마이징 의류 아이템 정보 수정"""
        db_custom_clothing = db.query(CustomClothingItems).filter(
            CustomClothingItems.custom_clothing_id == custom_clothing_id,
            CustomClothingItems.user_id == user_id
        ).first()
        
        if not db_custom_clothing:
            return None
        
        # 업데이트할 필드만 수정
        update_data = custom_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_custom_clothing, field, value)
        
        db.commit()
        db.refresh(db_custom_clothing)
        return db_custom_clothing
    
    @staticmethod
    def delete_custom_clothing_item(db: Session, custom_clothing_id: int, user_id: int) -> bool:
        """커스터마이징 의류 아이템 삭제"""
        db_custom_clothing = db.query(CustomClothingItems).filter(
            CustomClothingItems.custom_clothing_id == custom_clothing_id,
            CustomClothingItems.user_id == user_id
        ).first()
        
        if not db_custom_clothing:
            return False
        
        # 파일 삭제
        if db_custom_clothing.custom_image_url and os.path.exists(db_custom_clothing.custom_image_url):
            try:
                os.remove(db_custom_clothing.custom_image_url)
            except Exception as e:
                print(f"파일 삭제 실패: {e}")
        
        db.delete(db_custom_clothing)
        db.commit()
        return True
    
    @staticmethod
    def get_user_custom_clothes_count(db: Session, user_id: int) -> int:
        """사용자의 총 커스터마이징 의류 개수"""
        return db.query(CustomClothingItems).filter(CustomClothingItems.user_id == user_id).count()
    
    @staticmethod
    def bulk_delete_custom_clothes(db: Session, custom_clothing_ids: List[int], user_id: int) -> int:
        """커스터마이징 의류 일괄 삭제"""
        custom_clothes_to_delete = db.query(CustomClothingItems).filter(
            CustomClothingItems.custom_clothing_id.in_(custom_clothing_ids),
            CustomClothingItems.user_id == user_id
        ).all()
        
        deleted_count = 0
        for custom_clothing in custom_clothes_to_delete:
            # 파일 삭제
            if custom_clothing.custom_image_url and os.path.exists(custom_clothing.custom_image_url):
                try:
                    os.remove(custom_clothing.custom_image_url)
                except Exception as e:
                    print(f"파일 삭제 실패: {e}")
            
            db.delete(custom_clothing)
            deleted_count += 1
        
        db.commit()
        return deleted_count

