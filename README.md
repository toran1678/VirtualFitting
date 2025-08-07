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
### 1️⃣ Redis 서버 실행
```bash
# Redis Docker 이미지 다운로드
docker pull redis

# Redis 서버 실행(포트 6379)
docker run -p 6379:6379 redis

cd backend/scripts
# 워커 실행
python scripts/start_worker.py
```

***

### 2️⃣ AI 모델 설치 (필수)
OOTDiffusion 모델을 다음 경로에 설치해야 합니다:
```
backend/app/api/ml_models/OOTDiffusion/
```
OOTDiffusion 모델 파일은 용량이 크므로 별도로 다운로드하여 위 경로에 배치

***

### 3️⃣ Frontend (React)
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
```bash
# 백엔드 API URL
REACT_APP_API_URL=http://localhost:8000

# 카카오 OAuth 설정 (프론트엔드용)
REACT_APP_KAKAO_JAVASCRIPT_KEY=your-kakao-javascript-key
REACT_APP_KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback
```

***

## 4️⃣ Backend (FastAPI)
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

# 카카오 API 설정
KAKAO_CLIENT_ID=your-kakao-client-id # 카카오 앱의 REST API 키
KAKAO_JAVASCRIPT_KEY=your-kakao-javascript-key # 카카오 앱의 JavaScript 키
KAKAO_CLIENT_SECRET=your-kakao-client-secret # 카카오 앱의 클라이언트 시크릿 키
KAKAO_REDIRECT_URI=http://localhost:3000/oauth/kakao/callback

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

## 👨‍💻 만든 사람들
| 이름 | 역할 | GitHub |
|-----|------|--------|
|김선빈|...|...|
|이규현|...|...|
|정현구|...|...|

> 📌 안양대학교 소프트웨어학과 2025 캡스톤 디자인 팀 - **Fashiony Guys**