from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
import os
import logging
from dotenv import load_dotenv

from app.models import *  # 테이블 생성용
from app.db.database import SessionLocal, engine, get_db

# from app.db.create_tables import create_tables # 테이블 생성 함수

# 라우터 임포트
from app.api.routes import auth_router
from app.api.routes import register_router
from app.api import kakao_auth_router
from app.api.routes import clothing_items_router
from app.api.routes import liked_clothes_router
from app.api.routes import feeds_router
from app.api.routes import comments_router
from app.api import user_profiles_router
from app.api import follow_system_router
from app.api.routes import user_profile_router  # 사용자 프로필 수정정
from app.api.routes import person_images_router
from app.api.routes import user_clothes_router

from app.api.routes import virtual_fitting_router
from app.api.routes import image_proxy_router
from app.api.routes import custom_clothing_items_router
from app.api.routes import background_custom_router

# 환경 변수 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# 데이터베이스 테이블 생성
# Base.metadata.drop_all(bind=engine) # 기존 테이블 삭제(테스트용)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Virtual Fitting API",
    description="가상 피팅 서비스를 위한 API",
    version="0.1.0",
)

# 세션 미들웨어 추가 (비밀 키 설정)
app.add_middleware(SessionMiddleware, secret_key="your_secret_key")

# CORS 설정
origins = [
    "http://localhost:4000",
    "http://localhost",
    "http://localhost:3000",  # React 프론트엔드
    "http://localhost:5173",  # Vite 사용 시
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    # allow_origins=origins,  # 허용할 도메인 목록
    allow_origins=["*"],  # 모든 도메인에서 요청을 허용
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

# 정적 파일 제공을 위한 디렉토리 생성
os.makedirs("uploads/profile_pictures", exist_ok=True)
os.makedirs("uploads/feeds", exist_ok=True)
os.makedirs("uploads/custom_clothing", exist_ok=True)
os.makedirs("uploads/backgrounds", exist_ok=True)
os.makedirs("uploads/custom_backgrounds", exist_ok=True)
os.makedirs("uploads/background_custom", exist_ok=True)

# 정적 파일 제공
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# 라우터 등록
app.include_router(auth_router)
app.include_router(register_router)
app.include_router(kakao_auth_router)
app.include_router(clothing_items_router)
app.include_router(liked_clothes_router)
app.include_router(user_profile_router)
app.include_router(person_images_router)
app.include_router(user_clothes_router)

app.include_router(feeds_router)
app.include_router(comments_router)

app.include_router(user_profiles_router)
app.include_router(follow_system_router)

app.include_router(virtual_fitting_router)
app.include_router(image_proxy_router)
app.include_router(
    custom_clothing_items_router,
    prefix="/api/custom-clothing",
    tags=["custom-clothing"],
)
app.include_router(background_custom_router)


# 서버 상태 확인 엔드포인트
@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# 루트 엔드포인트
@app.get("/")
async def root():
    return {"message": "Welcome to Virtual Fitting API"}


# print("🔥 app in main:", id(app))
