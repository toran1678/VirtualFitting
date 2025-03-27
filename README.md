# 안양대학교 캡스톤 디자인

### 실행 방법
```bash
# Frontend 실행 방법
/frontend 에서
npm install
npm start

# Backend 실행 방법
/backend 에서
python -m venv venv
source venv/Scripts/activate

# 윈도우 안 될 경우 ( cmd로 켜야함 난 그랬음 )
cd venv
cd Scripts
activate.bat

/backend 에서
pip install -r requirements.txt

cd backend
uvicorn app.main:app --reload

# 현재 오류 때문에
cd backend
cd app
uvicorn main:app --reload
```

### 설정
Mysql 포트 3307 사용 중  
테이블 명 capstone

### Frontend File Structure
#### assets
이미지, 아이콘, 폰트 등 정적 파일들
#### components
재사용 가능한 컴포넌트들
#### pages
각 페이지 컴포넌트
#### hooks
커스텀 훅 (재사용 가능한 로직)
#### utils
유틸리티 함수들 (데이터 포맷팅, 유효성 검사 등)
#### styles
스타일 관련 파일 CSS 등