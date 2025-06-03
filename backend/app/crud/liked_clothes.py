from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.liked_clothes import LikedClothes
from app.models.clothing_items import ClothingItems
from typing import List

def get_user_liked_clothes_with_items(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    """사용자가 좋아요한 의류 목록과 의류 정보를 함께 조회"""
    return db.query(
        LikedClothes.clothing_id,
        LikedClothes.liked_at,
        ClothingItems.product_name,
        ClothingItems.product_image_url,
        ClothingItems.brand_name,
        ClothingItems.main_category,
        ClothingItems.sub_category,
        ClothingItems.gender
    ).join(
        ClothingItems, LikedClothes.clothing_id == ClothingItems.product_id
    ).filter(
        LikedClothes.user_id == user_id
    ).order_by(
        LikedClothes.liked_at.desc()  # 최근 좋아요한 순으로 정렬
    ).offset(skip).limit(limit).all()

def get_user_liked_clothes(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[LikedClothes]:
    """사용자가 좋아요한 의류 목록 조회"""
    return db.query(LikedClothes).filter(
        LikedClothes.user_id == user_id
    ).offset(skip).limit(limit).all()

def is_clothing_liked_by_user(db: Session, user_id: int, clothing_id: int) -> bool:
    """특정 의류가 사용자에 의해 좋아요 되었는지 확인"""
    liked = db.query(LikedClothes).filter(
        LikedClothes.user_id == user_id,
        LikedClothes.clothing_id == clothing_id
    ).first()
    return liked is not None

def get_clothing_likes_count(db: Session, clothing_id: int) -> int:
    """특정 의류의 총 좋아요 수 조회"""
    count = db.query(func.count(LikedClothes.user_id)).filter(
        LikedClothes.clothing_id == clothing_id
    ).scalar()
    return count or 0

def toggle_like(db: Session, user_id: int, clothing_id: int) -> tuple[bool, int]:
    """좋아요 토글 (추가/제거)"""
    # 기존 좋아요 확인
    existing_like = db.query(LikedClothes).filter(
        LikedClothes.user_id == user_id,
        LikedClothes.clothing_id == clothing_id
    ).first()
    
    if existing_like:
        # 좋아요 제거
        db.delete(existing_like)
        is_liked = False
    else:
        # 좋아요 추가
        new_like = LikedClothes(user_id=user_id, clothing_id=clothing_id)
        db.add(new_like)
        is_liked = True
    
    db.commit()
    
    # 업데이트된 좋아요 수 조회
    total_likes = get_clothing_likes_count(db, clothing_id)
    
    return is_liked, total_likes

def get_user_liked_clothing_ids(db: Session, user_id: int) -> List[int]:
    """사용자가 좋아요한 의류 ID 목록 조회"""
    liked_items = db.query(LikedClothes.clothing_id).filter(
        LikedClothes.user_id == user_id
    ).all()
    return [item.clothing_id for item in liked_items]
