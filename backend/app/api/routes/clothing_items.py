from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import get_db
from app.crud import clothing_items as clothing_crud
from app.schemas.clothing_items import ClothingItemsListResponse, ClothingItemResponse
import math

router = APIRouter(prefix="/api/clothing", tags=["clothing"])

@router.get("/", response_model=ClothingItemsListResponse)
async def get_clothing_items(
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    sort_by: str = Query("likes", description="정렬 기준 (likes, product_id, product_name)"),
    order: str = Query("desc", description="정렬 순서 (asc, desc)"),
    category: Optional[str] = Query(None, description="카테고리 필터"),
    gender: Optional[str] = Query(None, description="성별 필터"),
    db: Session = Depends(get_db)
):
    """의류 아이템 목록 조회"""
    try:
        skip = (page - 1) * size
        items, total = clothing_crud.get_clothing_items(
            db=db, 
            skip=skip, 
            limit=size,
            sort_by=sort_by,
            order=order,
            category=category,
            gender=gender
        )
        
        total_pages = math.ceil(total / size)
        
        return ClothingItemsListResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            total_pages=total_pages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"데이터 조회 중 오류가 발생했습니다: {str(e)}")
    
@router.get("/categories", response_model=dict)
async def get_categories(db: Session = Depends(get_db)):
    """카테고리 목록 조회"""
    try:
        categories = clothing_crud.get_categories(db=db)
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"카테고리 조회 중 오류가 발생했습니다: {str(e)}")
    
@router.get("/browse", response_model=ClothingItemsListResponse)
async def browse_clothing_items(
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    sort_by: str = Query("likes", description="정렬 기준 (likes, latest, name)"),
    order: str = Query("desc", description="정렬 순서 (asc, desc)"),
    main_category: Optional[str] = Query(None, description="메인 카테고리"),
    sub_category: Optional[str] = Query(None, description="서브 카테고리"),
    gender: Optional[str] = Query(None, description="성별"),
    brand: Optional[str] = Query(None, description="브랜드"),
    search: Optional[str] = Query(None, description="검색어"),
    db: Session = Depends(get_db)
):
    """필터링과 검색이 가능한 의류 아이템 브라우징"""
    try:
        skip = (page - 1) * size
        items, total = clothing_crud.get_clothing_items_with_filters(
            db=db,
            skip=skip,
            limit=size,
            sort_by=sort_by,
            order=order,
            main_category=main_category,
            sub_category=sub_category,
            gender=gender,
            brand=brand,
            search=search
        )
        
        total_pages = math.ceil(total / size)
        
        return ClothingItemsListResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            total_pages=total_pages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상품 브라우징 중 오류가 발생했습니다: {str(e)}")

@router.get("/popular", response_model=list[ClothingItemResponse])
async def get_popular_items(
    limit: int = Query(6, ge=1, le=20, description="조회할 상품 수"),
    db: Session = Depends(get_db)
):
    """인기 상품 조회"""
    try:
        items = clothing_crud.get_popular_items(db=db, limit=limit)
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"인기 상품 조회 중 오류가 발생했습니다: {str(e)}")

@router.get("/latest", response_model=list[ClothingItemResponse])
async def get_latest_items(
    limit: int = Query(6, ge=1, le=20, description="조회할 상품 수"),
    db: Session = Depends(get_db)
):
    """최신 상품 조회"""
    try:
        items = clothing_crud.get_latest_items(db=db, limit=limit)
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"최신 상품 조회 중 오류가 발생했습니다: {str(e)}")

@router.get("/search", response_model=ClothingItemsListResponse)
async def search_clothing_items(
    q: str = Query(..., description="검색어"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    db: Session = Depends(get_db)
):
    """의류 아이템 검색"""
    try:
        skip = (page - 1) * size
        items, total = clothing_crud.search_clothing_items(
            db=db, 
            query=q, 
            skip=skip, 
            limit=size
        )
        
        total_pages = math.ceil(total / size)
        
        return ClothingItemsListResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            total_pages=total_pages
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"검색 중 오류가 발생했습니다: {str(e)}")

@router.get("/{product_id}", response_model=ClothingItemResponse)
async def get_clothing_item(
    product_id: int,
    db: Session = Depends(get_db)
):
    """특정 의류 아이템 조회"""
    try:
        item = clothing_crud.get_clothing_item_by_id(db=db, product_id=product_id)
        if not item:
            raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")
        return item
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상품 조회 중 오류가 발생했습니다: {str(e)}")
