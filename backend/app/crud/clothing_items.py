from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from app.models.clothing_items import ClothingItems
from app.schemas.clothing_items import ClothingItemCreate
from typing import Optional

def get_clothing_items(
    db: Session, 
    skip: int = 0, 
    limit: int = 20,
    sort_by: str = "likes",
    order: str = "desc",
    category: Optional[str] = None,
    gender: Optional[str] = None
):
    """의류 아이템 목록 조회"""
    query = db.query(ClothingItems)
    
    # 필터링
    if category:
        query = query.filter(ClothingItems.main_category == category)
    if gender:
        query = query.filter(ClothingItems.gender == gender)
    
    # 정렬
    if sort_by == "likes":
        if order == "desc":
            query = query.order_by(desc(ClothingItems.likes))
        else:
            query = query.order_by(asc(ClothingItems.likes))
    elif sort_by == "product_id":  # 최신순
        if order == "desc":
            query = query.order_by(desc(ClothingItems.product_id))
        else:
            query = query.order_by(asc(ClothingItems.product_id))
    elif sort_by == "product_name":
        if order == "desc":
            query = query.order_by(desc(ClothingItems.product_name))
        else:
            query = query.order_by(asc(ClothingItems.product_name))
    
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    
    return items, total

def get_clothing_item_by_id(db: Session, product_id: int):
    """특정 의류 아이템 조회"""
    return db.query(ClothingItems).filter(ClothingItems.product_id == product_id).first()

def create_clothing_item(db: Session, clothing_item: ClothingItemCreate):
    """의류 아이템 생성"""
    db_item = ClothingItems(**clothing_item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def get_popular_items(db: Session, limit: int = 6):
    """인기 상품 조회 (좋아요 순)"""
    return db.query(ClothingItems).order_by(desc(ClothingItems.likes)).limit(limit).all()

def get_latest_items(db: Session, limit: int = 6):
    """최신 상품 조회 (등록순)"""
    return db.query(ClothingItems).order_by(desc(ClothingItems.product_id)).limit(limit).all()

def search_clothing_items(db: Session, query: str, skip: int = 0, limit: int = 20):
    """의류 아이템 검색"""
    search_query = db.query(ClothingItems).filter(
        ClothingItems.product_name.contains(query) |
        ClothingItems.brand_name.contains(query)
    )
    
    total = search_query.count()
    items = search_query.offset(skip).limit(limit).all()
    
    return items, total
