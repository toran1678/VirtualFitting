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

def get_clothing_items_with_filters(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    sort_by: str = "likes",
    order: str = "desc",
    main_category: Optional[str] = None,
    sub_category: Optional[str] = None,
    gender: Optional[str] = None,
    brand: Optional[str] = None,
    search: Optional[str] = None
):
    """필터와 검색을 포함한 의류 아이템 목록 조회"""
    from sqlalchemy import or_
    
    query = db.query(ClothingItems)
    
    # 필터링
    if main_category:
        query = query.filter(ClothingItems.main_category == main_category)
    if sub_category:
        query = query.filter(ClothingItems.sub_category == sub_category)
    if gender:
        query = query.filter(ClothingItems.gender == gender)
    if brand:
        query = query.filter(ClothingItems.brand_name == brand)
    if search:
        search_filter = or_(
            ClothingItems.product_name.contains(search),
            ClothingItems.brand_name.contains(search)
        )
        query = query.filter(search_filter)
    
    # 정렬
    if sort_by == "likes":
        if order == "desc":
            query = query.order_by(desc(ClothingItems.likes))
        else:
            query = query.order_by(asc(ClothingItems.likes))
    elif sort_by == "latest":
        if order == "desc":
            query = query.order_by(desc(ClothingItems.product_id))
        else:
            query = query.order_by(asc(ClothingItems.product_id))
    elif sort_by == "name":
        if order == "desc":
            query = query.order_by(desc(ClothingItems.product_name))
        else:
            query = query.order_by(asc(ClothingItems.product_name))
    
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    
    return items, total

def get_categories(db: Session):
    """카테고리 정보 조회"""
    # 메인 카테고리 조회
    main_categories = db.query(ClothingItems.main_category).distinct().all()
    main_categories = [cat[0] for cat in main_categories if cat[0]]
    
    # 서브 카테고리 조회
    sub_categories = db.query(ClothingItems.sub_category).distinct().all()
    sub_categories = [cat[0] for cat in sub_categories if cat[0]]
    
    # 성별 조회
    genders = db.query(ClothingItems.gender).distinct().all()
    genders = [gender[0] for gender in genders if gender[0]]
    
    # 브랜드 조회 (상위 50개)
    brands = db.query(ClothingItems.brand_name).distinct().limit(50).all()
    brands = [brand[0] for brand in brands if brand[0]]
    
    return {
        "main_categories": sorted(main_categories),
        "sub_categories": sorted(sub_categories),
        "genders": sorted(genders),
        "brands": sorted(brands)
    }

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
