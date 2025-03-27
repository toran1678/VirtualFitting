from sqlalchemy.orm import Session
from app.models.models import Item

# 데이터 추가
def create_item(db: Session, name: str, description: str):
    db_item = Item(name=name, description=description)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

# 데이터 조회
def get_items(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Item).offset(skip).limit(limit).all()
