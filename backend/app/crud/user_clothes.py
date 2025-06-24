from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.user_clothes import UserClothes
from app.schemas.user_clothes import UserClothesCreate, UserClothesUpdate
from typing import List, Tuple, Optional
import os

class UserClothesCRUD:
    
    @staticmethod
    def create_user_clothing(
        db: Session, 
        user_id: int, 
        image_url: str, 
        clothing_data: UserClothesCreate
    ) -> UserClothes:
        """새 의류 아이템 생성"""
        db_clothing = UserClothes(
            user_id=user_id,
            image_url=image_url,
            name=clothing_data.name,
            brand=clothing_data.brand,
            category=clothing_data.category,
            color=clothing_data.color,
            season=clothing_data.season,
            style=clothing_data.style
        )
        db.add(db_clothing)
        db.commit()
        db.refresh(db_clothing)
        return db_clothing
    
    @staticmethod
    def get_user_clothes(
        db: Session, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 20,
        category: Optional[str] = None,
        season: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[UserClothes], int]:
        """사용자의 의류 목록 조회 (필터링 지원)"""
        query = db.query(UserClothes).filter(UserClothes.user_id == user_id)
        
        # 필터링
        if category:
            query = query.filter(UserClothes.category == category)
        if season:
            query = query.filter(UserClothes.season == season)
        if search:
            query = query.filter(
                UserClothes.name.ilike(f"%{search}%") |
                UserClothes.brand.ilike(f"%{search}%")
            )
        
        total = query.count()
        clothes = query.order_by(desc(UserClothes.created_at)).offset(skip).limit(limit).all()
        
        return clothes, total
    
    @staticmethod
    def get_clothing_by_id(db: Session, clothing_id: int, user_id: int) -> Optional[UserClothes]:
        """특정 의류 아이템 조회"""
        return db.query(UserClothes).filter(
            UserClothes.id == clothing_id,
            UserClothes.user_id == user_id
        ).first()
    
    @staticmethod
    def update_user_clothing(
        db: Session, 
        clothing_id: int, 
        user_id: int, 
        clothing_data: UserClothesUpdate
    ) -> Optional[UserClothes]:
        """의류 아이템 정보 수정"""
        db_clothing = db.query(UserClothes).filter(
            UserClothes.id == clothing_id,
            UserClothes.user_id == user_id
        ).first()
        
        if not db_clothing:
            return None
        
        # 업데이트할 필드만 수정
        update_data = clothing_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_clothing, field, value)
        
        db.commit()
        db.refresh(db_clothing)
        return db_clothing
    
    @staticmethod
    def delete_user_clothing(db: Session, clothing_id: int, user_id: int) -> bool:
        """의류 아이템 삭제"""
        db_clothing = db.query(UserClothes).filter(
            UserClothes.id == clothing_id,
            UserClothes.user_id == user_id
        ).first()
        
        if not db_clothing:
            return False
        
        # 파일 삭제
        if db_clothing.image_url and os.path.exists(db_clothing.image_url):
            try:
                os.remove(db_clothing.image_url)
            except Exception as e:
                print(f"파일 삭제 실패: {e}")
        
        db.delete(db_clothing)
        db.commit()
        return True
    
    @staticmethod
    def get_user_clothes_count(db: Session, user_id: int) -> int:
        """사용자의 총 의류 개수"""
        return db.query(UserClothes).filter(UserClothes.user_id == user_id).count()
    
    @staticmethod
    def get_user_clothes_stats(db: Session, user_id: int) -> dict:
        """사용자의 의류 통계"""
        # 총 개수
        total_count = db.query(UserClothes).filter(UserClothes.user_id == user_id).count()
        
        # 카테고리별 개수
        category_counts = dict(
            db.query(UserClothes.category, func.count(UserClothes.id))
            .filter(UserClothes.user_id == user_id)
            .group_by(UserClothes.category)
            .all()
        )
        
        # 최근 7일간 업로드 개수
        from datetime import datetime, timedelta
        week_ago = datetime.now() - timedelta(days=7)
        recent_uploads = db.query(UserClothes).filter(
            UserClothes.user_id == user_id,
            UserClothes.created_at >= week_ago
        ).count()
        
        return {
            "total_count": total_count,
            "category_counts": category_counts,
            "recent_uploads": recent_uploads
        }
    
    @staticmethod
    def bulk_delete_clothes(db: Session, clothing_ids: List[int], user_id: int) -> int:
        """의류 일괄 삭제"""
        clothes_to_delete = db.query(UserClothes).filter(
            UserClothes.id.in_(clothing_ids),
            UserClothes.user_id == user_id
        ).all()
        
        deleted_count = 0
        for clothing in clothes_to_delete:
            # 파일 삭제
            if clothing.image_url and os.path.exists(clothing.image_url):
                try:
                    os.remove(clothing.image_url)
                except Exception as e:
                    print(f"파일 삭제 실패: {e}")
            
            db.delete(clothing)
            deleted_count += 1
        
        db.commit()
        return deleted_count
