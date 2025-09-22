# 🌟 AI 가상 피팅 플랫폼

**AI 기반 가상 피팅 서비스 + 소셜 피드 기능을 갖춘 현대적인 웹 애플리케이션**

---

## 프로젝트 소개

AI 기술을 활용한 가상 피팅 서비스와 소셜 네트워킹 기능을 결합한 혁신적인 패션 플랫폼입니다. 사용자는 실제 의류를 착용하지 않고도 AI가 생성한 가상 피팅 결과를 미리 확인할 수 있으며, 다른 사용자들과 패션 콘텐츠를 공유하고 소통할 수 있습니다.

### 주요 특징

- **AI 가상 피팅** - OOTDiffusion 모델을 활용한 고품질 가상 피팅 생성
- **소셜 피드** - 패션 콘텐츠 공유 및 소통 기능
- **팔로우 시스템** - 공개/비공개 계정 지원 및 팔로우 요청 관리
- **의류 관리** - 개인 옷장 및 커스텀 의류 생성 기능
- **인증 시스템** - 카카오 OAuth 및 이메일 인증
- **실시간 처리** - Redis 기반 비동기 작업 큐 시스템
- **반응형 디자인** - 모든 디바이스에서 최적화된 사용자 경험

---

## 🛠️ 기술 스택

### Backend
- **FastAPI** - 고성능 비동기 웹 프레임워크
- **MySQL 8.0** - 관계형 데이터베이스
- **Redis** - 캐시 및 작업 큐 관리
- **SQLAlchemy** - ORM 및 데이터베이스 관리
- **OOTDiffusion** - AI 가상 피팅 모델
- **Pillow, OpenCV** - 이미지 처리

### Frontend
- **React 19.0** - 최신 React 기능 활용
- **React Router DOM** - 클라이언트 사이드 라우팅
- **Axios** - HTTP 클라이언트
- **Kakao SDK** - 소셜 로그인
- **CSS Modules** - 컴포넌트별 스타일 격리

### DevOps & Infrastructure
- **Docker & Docker Compose** - 컨테이너화 및 배포
- **Uvicorn** - ASGI 서버
- **Nginx** - 리버스 프록시 (프로덕션)

---

## 프로젝트 구조

```
capstone_project/
├── backend/                    # FastAPI 백엔드
│   ├── app/
│   │   ├── api/               # API 라우터 및 엔드포인트
│   │   │   ├── routes/        # 각 기능별 라우터
│   │   │   └── ml_models/     # AI 모델 디렉토리
│   │   ├── core/              # 핵심 설정 (Redis, 작업큐)
│   │   ├── crud/              # 데이터베이스 CRUD 작업
│   │   ├── db/                # 데이터베이스 설정
│   │   ├── models/            # SQLAlchemy 모델
│   │   ├── schemas/           # Pydantic 스키마
│   │   ├── utils/             # 유틸리티 함수
│   │   └── workers/           # 백그라운드 작업 처리
│   ├── crawling/              # 의류 데이터 크롤링
│   └── scripts/               # 실행 스크립트
├── frontend/                   # React 프론트엔드
│   ├── src/
│   │   ├── api/               # API 호출 함수
│   │   ├── components/        # 재사용 가능한 컴포넌트
│   │   ├── context/           # React Context
│   │   ├── hooks/             # 커스텀 훅
│   │   ├── pages/             # 페이지 컴포넌트
│   │   └── utils/             # 유틸리티 함수
│   └── public/                # 정적 파일
├── docker-compose.yml         # 개발 환경 Docker 설정
├── docker-compose.prod.yml    # 프로덕션 환경 Docker 설정
└── README.md
```

---

## 빠른 시작

### 사전 요구사항

- **Docker Desktop** (Windows/Mac) 또는 **Docker Engine** (Linux)
- **Docker Compose**
- **Git**

### Docker를 사용한 실행 (권장)

1. **저장소 클론**
```bash
git clone <repository-url>
cd capstone_project
```

2. **환경 변수 설정**
```bash
# env.example을 복사하여 .env 파일 생성
copy env.example .env  # Windows
# 또는
cp env.example .env    # Linux/Mac
```

3. **AI 모델 설치** (필수)
```
backend/app/api/ml_models/OOTDiffusion/
```
[OOTDiffusion](https://github.com/levihsu/OOTDiffusion) 모델 파일을 위 경로에 배치하세요.

4. **서비스 시작**
```bash
# Windows
docker-start.bat

# 또는 수동으로
docker-compose up --build -d
```

5. **서비스 접속**
- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

### 로컬 개발 환경

#### Backend 설정
```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate.bat  # Windows
# 또는
source venv/bin/activate   # Linux/Mac

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정 (.env 파일 생성)
# 데이터베이스 설정
DB_USER=root
DB_PASSWORD=123456
DB_HOST=localhost
DB_PORT=3306
DB_NAME=capstone

# 카카오 OAuth 설정
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_JAVASCRIPT_KEY=your-kakao-javascript-key
KAKAO_CLIENT_SECRET=your-kakao-client-secret
KAKAO_REDIRECT_URI=http://localhost:3000/oauth/kakao/callback

# SMTP 설정
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_password

# 앱 설정
BASE_URL=http://localhost:8000
SECRET_KEY=your-secret-key-for-token-generation
DEV_MODE=false

# 서버 실행
uvicorn main:app --reload --port 8000
```

#### Frontend 설정
```bash
cd frontend

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
REACT_APP_API_URL=http://localhost:8000
REACT_APP_KAKAO_JAVASCRIPT_KEY=your-kakao-javascript-key
REACT_APP_KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback

# 개발 서버 실행
npm start
```

#### Redis 설정
```bash
# Redis Docker 실행
docker run --name redis -p 6379:6379 redis

# 워커 실행 (별도 터미널)
cd backend
python scripts/start_worker.py
```

---

## 주요 기능

### AI 가상 피팅
- **OOTDiffusion 모델** 기반 고품질 가상 피팅
- **실시간 처리** - Redis 큐를 통한 비동기 처리
- **다양한 카테고리** - 상체, 하체, 드레스 지원
- **HD/DC 모델** - 다양한 해상도 옵션
- **결과 선택** - 생성된 여러 결과 중 선택 가능

### 소셜 피드
- **피드 작성** - 이미지와 함께 패션 콘텐츠 공유
- **댓글 시스템** - 실시간 댓글 작성 및 관리
- **좋아요 기능** - 피드에 대한 반응 표현
- **피드 편집** - 작성한 피드 수정 및 삭제

### 팔로우 시스템
- **공개/비공개 계정** - 계정 공개 설정
- **팔로우 요청** - 비공개 계정 팔로우 요청
- **팔로워 관리** - 팔로워 목록 및 요청 승인/거부
- **팔로잉 피드** - 팔로우한 사용자들의 피드 확인

### 의류 관리
- **개인 옷장** - 사용자별 의류 수집
- **커스텀 의류** - 직접 업로드한 의류 관리
- **의류 브라우징** - 카테고리별 의류 탐색
- **좋아요 의류** - 관심 있는 의류 저장

### 인증 및 보안
- **카카오 OAuth** - 소셜 로그인
- **이메일 인증** - 계정 생성 및 비밀번호 재설정
- **파일 업로드** - 안전한 이미지 업로드 및 처리

---

## API 문서

### 주요 엔드포인트

#### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/kakao` - 카카오 로그인

#### 가상 피팅
- `POST /api/virtual-fitting-redis/start` - 가상 피팅 시작
- `GET /api/virtual-fitting-redis/status/{process_id}` - 처리 상태 확인
- `POST /api/virtual-fitting-redis/select/{process_id}` - 결과 선택

#### 피드
- `GET /api/feeds` - 피드 목록 조회
- `POST /api/feeds` - 피드 작성
- `GET /api/feeds/{feed_id}` - 피드 상세 조회
- `PUT /api/feeds/{feed_id}` - 피드 수정
- `DELETE /api/feeds/{feed_id}` - 피드 삭제

#### 팔로우
- `POST /api/follow/{email}/follow` - 팔로우/언팔로우
- `GET /api/follow/{email}/followers` - 팔로워 목록
- `GET /api/follow/{email}/following` - 팔로잉 목록

자세한 API 문서는 http://localhost:8000/docs 에서 확인할 수 있습니다.

---

## 환경 설정

### 필수 환경 변수

#### Backend (.env)
```env
# 데이터베이스
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=capstone

# 카카오 OAuth
KAKAO_CLIENT_ID=your-client-id
KAKAO_JAVASCRIPT_KEY=your-javascript-key
KAKAO_CLIENT_SECRET=your-client-secret
KAKAO_REDIRECT_URI=http://localhost:3000/oauth/kakao/callback

# SMTP (이메일)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# 앱 설정
BASE_URL=http://localhost:8000
SECRET_KEY=your-secret-key
DEV_MODE=false
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_KAKAO_JAVASCRIPT_KEY=your-javascript-key
REACT_APP_KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback
```

---

## Docker 배포

### 개발 환경
```bash
docker-compose up --build -d
```

### 프로덕션 환경
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

### 서비스 관리
```bash
# 서비스 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 서비스 재시작
docker-compose restart

# 서비스 중지
docker-compose down
```

---

## 데이터베이스

### 주요 테이블
- **users** - 사용자 정보
- **feeds** - 피드 데이터
- **followers** - 팔로우 관계
- **follow_requests** - 팔로우 요청
- **virtual_fittings** - 가상 피팅 결과
- **virtual_fitting_process** - 가상 피팅 처리 상태
- **clothing_items** - 의류 데이터
- **user_clothes** - 사용자 의류 수집
- **custom_clothing_items** - 커스텀 의류

### 데이터 초기화
```bash
# 크롤링 데이터 삽입
cd backend/crawling
python insert_csv.py
```

---

## 성능 최적화

### 백엔드 최적화
- **비동기 처리** - FastAPI의 async/await 활용
- **Redis 캐싱** - 자주 조회되는 데이터 캐싱
- **작업 큐** - 무거운 작업의 백그라운드 처리
- **이미지 최적화** - Pillow를 통한 이미지 압축

### 프론트엔드 최적화
- **코드 분할** - React.lazy를 통한 지연 로딩
- **이미지 최적화** - 적응형 이미지 로딩
- **상태 관리** - 효율적인 상태 업데이트

---

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 팀원

| 이름 | 역할 | GitHub |
|------|------|--------|
| 김선빈 | 1 | [@toran1678](https://github.com/toran1678) |
| 이규현 | 1 | [@leekyuhyun](https://github.com/leekyuhyun) |
| 정현구 | 1 | [@lhjjhg](https://github.com/lhjjhg) |

> **안양대학교 소프트웨어학과 2025 캡스톤 디자인 팀 - Fashiony Guys**