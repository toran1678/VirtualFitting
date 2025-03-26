from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# MySQL 연결 정보
user = "root"
passwd = "123456"
host = "localhost"
port = "3307"
db = "capstone"

# MySQL 데이터베이스 연결 URL
DB_URL = "mysql+pymysql://{user}:{passwd}@{host}:{port}/{db}?charset=utf8".format(
    user=user, passwd=passwd, host=host, port=port, db=db
    )

# SQLAlchemy 엔진 생성
engine = create_engine(DB_URL)

# 세션 만들기
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스 생성 (모든 모델은 이 클래스를 상속)
Base = declarative_base()
