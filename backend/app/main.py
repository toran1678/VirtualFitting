from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models, crud

# 데이터베이스 테이블 생성
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인에서 요청을 허용
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

@app.get('/')
def welcome_root():
    return "Welcome to root Hello!!!!"

def get_db_connection():
    return mysql.connector.connect(
        host="mysql",  # docker-compose에서 설정한 서비스명
        user="root",
        password="123456",
        database="capstone",
        port=3306
    )
    
# 의존성: 데이터베이스 세션 가져오기
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 새로운 아이템 생성
@app.post("/items/")
def create_item(name: str, description: str, db: Session = Depends(get_db)):
    return crud.create_item(db=db, name=name, description=description)

# 모든 아이템 조회
@app.get("/items/")
def get_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    items = crud.get_items(db=db, skip=skip, limit=limit)
    return items
    
class Item(BaseModel):
    name: str
    description: str

# 엔드포인트 정의
@app.post("/create-item/")
async def create_item(item: Item):
    return {"name": item.name, "description": item.description}