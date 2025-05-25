# 안양대학교 캡스톤 디자인
AI 기반 가상 피팅 서비스 + 사용자 피드 기능이 포함된 풀스택 웹 프로젝트입니다.

***

## ✅ 공통 환경 ( 수정 필요 )
|항목|버전|
|:-----:|:-----:|
|OS|Windows 10 / 11|
|Python|3.11|
|Node.js|18.18.0|
|npm|9.8.1|
|CUDA|10.1|

pip	최신 권장 (pip install --upgrade pip)

***

## 📁 프로젝트 구조
```bash
project-root/
├── frontend/     # React 기반 프론트엔드
├── backend/      # FastAPI 기반 백엔드
├── .env          # (선택) 환경변수 설정
```

***

## ✅ 실행 방법
### ▶️ Frontend (React)
```bash
# 1. frontend 디렉토리로 이동
cd frontend

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm start
```

### 💡 ``.env`` 파일 설정 (React용)
``frontend/`` 폴더 안에 ``.env`` 파일을 생성:
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

***

## ▶️ Backend (FastAPI)
```bash
# 1. backend 디렉토리로 이동
cd backend

# 2. 가상환경 생성
python -m venv venv

# 3. 가상환경 활성화 (Windows CMD 기준)
venv\Scripts\activate.bat

# 4. 의존성 설치
cd backend
pip install -r requirements.txt

# 5. 개발 서버 실행
uvicorn main:app --reload --port 8000
```

### 🛠 백엔드 .env
``.env`` 파일을 ``backend/`` 내부에 생성하고 아래처럼 작성합니다:
```bash
# 데이터베이스 설정
DB_USER=root
DB_PASSWORD=123456
DB_HOST=localhost
DB_PORT=3307
DB_NAME=capstone

# SMTP 설정
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_password  # Google 앱 비밀번호

# 앱 설정
BASE_URL=http://localhost:8000
SECRET_KEY=your-secret-key-for-token-generation

DEV_MODE=false
```

***

## 만든 사람들
| 이름 | 역할 | GitHub |
|-----|------|--------|
|김선빈|...|...|
|이규현|...|...|
|정현구|...|...|

> 📌 안양대학교 소프트웨어학과 2025 캡스톤 디자인 팀 - **Fashiony Guys**