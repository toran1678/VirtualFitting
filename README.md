# 🌟 Fashion Guys - AI 가상 피팅 플랫폼

**AI 기반 가상 피팅 서비스 + 소셜 네트워킹 기능을 갖춘 차세대 패션 플랫폼**

> 안양대학교 소프트웨어학과 2025 캡스톤 디자인 프로젝트

---

## 프로젝트 소개

AI 기술을 활용한 가상 피팅 서비스와 소셜 네트워킹 기능을 결합한 혁신적인 패션 플랫폼입니다. 사용자는 실제 의류를 착용하지 않고도 AI가 생성한 가상 피팅 결과를 미리 확인할 수 있으며, 다른 사용자들과 패션 콘텐츠를 공유하고 소통할 수 있습니다.

### 주요 특징

- **다중 AI 가상 피팅** 
  - OOTDiffusion 모델 - 고품질 정밀 피팅
  - Hugging Face Gradio API - 빠른 실시간 피팅 (2개 모델)
  - 3가지 피팅 옵션으로 속도와 품질 선택 가능
  
- **배경 커스터마이징** 
  - 가상 피팅 결과의 배경 변경
  - 단색, 이미지, 사용자 업로드 배경 지원
  - 실시간 미리보기 및 저장 기능
  
- **커스텀 의류 생성** 
  - 사용자가 직접 의류 이미지 업로드
  - AI 기반 자동 배경 제거
  - 개인 옷장에 저장 및 가상 피팅 활용
  
- **소셜 피드** 
  - 패션 콘텐츠 공유 및 소통
  - 댓글, 좋아요, 이미지 다중 업로드
  
- **팔로우 시스템** 
  - 공개/비공개 계정 지원
  - 팔로우 요청 승인/거부 시스템
  - 팔로잉 사용자 전용 피드
  
- **인증 시스템** 
  - 카카오 OAuth 소셜 로그인
  - 이메일 인증 회원가입
  - 안전한 세션 관리
  
- **실시간 처리** 
  - Redis 기반 비동기 작업 큐
  - 백그라운드 워커를 통한 무거운 작업 처리
  - 실시간 처리 상태 업데이트
  
- **반응형 디자인** 
  - 모든 디바이스 최적화
  - 모던 UI/UX
  - 다크모드 지원

---

## 🛠️ 기술 스택

### Backend
- **FastAPI** - 고성능 비동기 웹 프레임워크
- **Python 3.10+** - 메인 백엔드 언어
- **MySQL 8.0** - 관계형 데이터베이스
- **Redis** - 캐시 및 작업 큐 관리
- **SQLAlchemy** - ORM 및 데이터베이스 관리

### AI/ML
- **OOTDiffusion** - 로컬 고품질 가상 피팅 모델
- **Hugging Face Gradio Client** - 클라우드 기반 빠른 피팅
  - Change Clothes AI (`jallenjia/Change-Clothes-AI`)
  - Leffa AI (`franciszzj/Leffa`)
- **Rembg & Segment Anything** - 이미지 배경 제거
- **Pillow & OpenCV** - 이미지 전처리 및 후처리
- **PyTorch** - 딥러닝 프레임워크

### Frontend
- **React 19.0** - 최신 React 기능 활용
- **React Router DOM 7.4** - 클라이언트 사이드 라우팅
- **Axios** - HTTP 클라이언트
- **@gradio/client** - Gradio API 통신
- **Kakao SDK** - 소셜 로그인
- **React Image Crop** - 이미지 크롭 기능
- **Lucide React** - 모던 아이콘 라이브러리
- **CSS Modules** - 컴포넌트별 스타일 격리

### DevOps & Infrastructure
- **Docker & Docker Compose** - 컨테이너화
- **Uvicorn** - ASGI 서버
- **Nginx** - 리버스 프록시 및 정적 파일 서빙
- **Redis Worker** - 백그라운드 작업 처리

---

## 프로젝트 구조

```
capstone_project/
├── backend/                        # FastAPI 백엔드
│   ├── app/
│   │   ├── api/                   # API 라우터 및 엔드포인트
│   │   │   ├── routes/            # 기능별 라우터
│   │   │   └── ml_models/         # AI 모델 디렉토리
│   │   ├── core/                  # 핵심 설정
│   │   │   ├── redis_config.py    # Redis 연결 설정
│   │   │   └── task_queue.py      # 작업 큐 관리
│   │   ├── crud/                  # 데이터베이스 CRUD
│   │   ├── db/                    # 데이터베이스 설정
│   │   ├── models/                # SQLAlchemy ORM 모델
│   │   ├── schemas/               # Pydantic 스키마
│   │   ├── utils/                 # 유틸리티
│   │   └── workers/               # 백그라운드 워커
│   ├── crawling/                  # 의류 데이터 크롤링
│   ├── uploads/                   # 업로드 파일 저장소
│   └── scripts/                   # 실행 스크립트
│       └── start_worker.py        # 워커 시작 스크립트
├── frontend/                       # React 프론트엔드
│   ├── src/
│   │   ├── api/                   # API 호출 함수
│   │   ├── components/            # 재사용 컴포넌트
│   │   ├── pages/                 # 페이지 컴포넌트
│   │   ├── context/               # React Context
│   │   ├── hooks/                 # 커스텀 훅
│   │   └── utils/                 # 유틸리티
│   └── public/                    # 정적 파일
├── nginx/                          # Nginx 설정
├── docker-compose.yml             # 개발 환경 Docker
├── env.example                    # 환경 변수 예시
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
git clone https://github.com/toran1678/VirtualFitting.git
cd VirtualFitting
```

2. **환경 변수 설정**
```bash
# env.example을 복사하여 .env 파일 생성
copy env.example .env  # Windows
# 또는
cp env.example .env    # Linux/Mac
```

3. **AI 모델 설치** (고품질 가상 피팅 사용 시 필수)

**옵션 A: 빠른 피팅만 사용**
- Hugging Face Gradio API를 사용하므로 별도 모델 설치 불필요
- Change Clothes AI, Leffa AI 바로 사용 가능

**옵션 B: 고품질 피팅 사용**
```bash
# OOTDiffusion 모델 설치
cd backend/app/api/ml_models/
git clone https://github.com/levihsu/OOTDiffusion.git

# 모델 가중치 다운로드 (Hugging Face)
# checkpoints 폴더에 모델 파일 배치 필요
# 자세한 내용: https://github.com/levihsu/OOTDiffusion
```

**PyTorch 설치** (GPU 사용 시)
```bash
# CUDA 12.1 버전
pip install torch==2.1.2 torchvision==0.16.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cu121
```

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

6. **초기 데이터 설정** (선택사항)
```bash
# 의류 데이터 삽입 (2만+ 크롤링 데이터)
docker-compose exec backend python crawling/insert_csv.py
```

### 로컬 개발 환경

#### Nginx 설정 (프록시 서버)

프로덕션 환경 또는 로컬에서 프록시 서버를 사용하려면 Nginx를 설치하고 설정하세요:

```bash
# Nginx 설치 (Ubuntu/Debian)
sudo apt update
sudo apt install nginx

# Nginx 설치 (macOS)
brew install nginx

# Nginx 설치 (Windows)
# Winget 또는 Chocolatey 사용
winget install nginx

# 설정 파일 복사
cp nginx/nginx.conf.example nginx/nginx.conf

# Nginx 시작
sudo systemctl start nginx   # Linux
# 또는
sudo nginx -s start          # macOS
```

**주의**: Nginx를 사용하면 프론트엔드는 3000번 포트, 백엔드는 8000번 포트를 직접 노출하지 않고 Nginx의 4000번 포트로 통합 접근할 수 있습니다.

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
# ===== 데이터베이스 설정 (MySQL) =====
DB_USER=root
DB_PASSWORD=123456
DB_HOST=localhost
DB_PORT=3306
DB_NAME=capstone

# 로컬 Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ===== 이메일 설정 (SMTP) =====
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# ===== 카카오 OAuth 설정 =====
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback

# 세션 만료 시간 (초 단위)
SESSION_EXPIRE_SECONDS=86400

# ===== 애플리케이션 설정 =====
DEV_MODE=false

# 앱 설정
BASE_URL=http://localhost:8000

# ===== 세션 및 보안 설정 =====
SECRET_KEY=your-secret-key-change-this-in-production
SESSION_SECRET_KEY=your-session-secret-key

# 서버 실행
uvicorn main:app --reload --port 8000
```

#### Frontend 설정
```bash
cd frontend

# 의존성 설치
npm install

# 환경 변수 설정 (.env.development 파일 생성)
REACT_APP_API_URL=http://localhost:8000

# 개발 서버 실행
npm start
```

#### Redis 설정
```bash
# Redis Docker 실행
docker run --name redis -p 6379:6379 redis

# 가상환경 활성화
cd backend

venv\Scripts\activate.bat  # Windows
# 또는
source venv/bin/activate   # Linux/Mac

# 워커 실행 (별도 터미널)
python scripts/start_worker.py
```

---

## 주요 화면

### 가상 피팅
- **고품질 피팅**: OOTDiffusion 로컬 모델로 최고 품질
- **빠른 피팅**: Gradio API로 30초 내 실시간 결과
- **배경 커스터마이징**: 피팅 결과 배경 자유롭게 변경
 
### 소셜 기능
- **피드 페이지**: 패션 콘텐츠 공유 및 탐색
- **댓글 & 좋아요**: 실시간 소통
- **팔로우 시스템**: 관심 사용자 팔로우

### 의류 관리
- **의류 브라우징**: 2만+ 의류 데이터베이스
- **커스텀 의류**: 직접 업로드한 의류 관리
- **개인 옷장**: 좋아요한 의류 모음

---

## 주요 기능

### AI 가상 피팅 (3가지 옵션)

#### 1️고품질 가상 피팅 (OOTDiffusion)
- **로컬 AI 모델** - 최고 품질의 정밀한 피팅 결과
- **다양한 카테고리** - 상체, 하체, 드레스 지원
- **HD/DC 모델** - Half-body/Full-body 옵션
- **다중 결과 생성** - 4개의 결과 중 선택 가능
- **Redis 비동기 처리** - 백그라운드 작업으로 빠른 응답

#### 2️빠른 피팅 - Change Clothes AI
- **Hugging Face Gradio API** 활용
- **실시간 처리** - 30초 내 결과 생성
- **간편한 사용** - 별도 모델 설치 불필요
- **상체/하체/전신** 모두 지원

#### 3️빠른 피팅 - Leffa AI  
- **Hugging Face Gradio API** 활용
- **실시간 처리** - 30초 내 결과 생성
- **다양한 스타일** 지원
- **품질 우선** 옵션

### 배경 커스터마이징
- **가상 피팅 결과 배경 변경** - AI 기반 배경 제거 후 재합성
- **3가지 배경 옵션**
  - 단색 배경 (HEX 색상 선택)
  - 기본 제공 배경 이미지
  - 사용자 업로드 이미지
- **실시간 미리보기** - 저장 전 결과 확인
- **고품질 저장** - PNG 형식으로 저장

### 커스텀 의류 생성
- **이미지 업로드** - 사용자가 직접 의류 사진 업로드
- **AI 자동 배경 제거** - Rembg를 활용한 정확한 배경 제거
- **카테고리 분류** - 상의, 하의, 드레스 등 자동 분류
- **개인 옷장 저장** - 가상 피팅에 바로 활용 가능
- **템플릿 제공** - 커스텀 의류 생성 가이드

### 소셜 피드
- **패션 콘텐츠 공유** - 최대 10개 이미지 업로드
- **스티커 기능** - 87개 감정/동물/음식 스티커
- **댓글 시스템** - 실시간 댓글 및 답글
- **좋아요 기능** - 피드 좋아요 및 통계
- **피드 편집/삭제** - 작성자만 수정 가능
- **이미지 캐러셀** - 스와이프로 다중 이미지 탐색

### 팔로우 시스템
- **공개/비공개 계정** - 프로필 공개 여부 설정
- **팔로우 요청** - 비공개 계정 팔로우 승인 시스템
- **팔로워 관리** - 팔로워/팔로잉 목록 및 통계
- **요청 관리** - 받은/보낸 팔로우 요청 확인
- **팔로잉 전용 피드** - 팔로우한 사용자 피드만 필터링

### 의류 관리
- **개인 옷장** - 좋아요한 의류 및 커스텀 의류 모음
- **의류 브라우징** - 2만+ 의류 데이터 (크롤링)
- **카테고리 필터** - 상의/하의/드레스 분류
- **검색 기능** - 키워드로 의류 검색
- **좋아요 의류** - 관심 있는 의류 저장

### 인증 및 보안
- **카카오 OAuth 로그인** - 간편한 소셜 로그인
- **이메일 인증 회원가입** - SMTP 기반 이메일 인증
- **세션 관리** - 안전한 쿠키 기반 세션
- **비밀번호 암호화** - bcrypt 해시 암호화
- **파일 업로드 검증** - 이미지 타입 및 크기 제한

---

## 환경 설정

### 필수 환경 변수

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 설정하세요:

```env
# ===== 데이터베이스 설정 =====
MYSQL_USER=root
MYSQL_PASSWORD=123456
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=capstone

# ===== Redis 설정 =====
REDIS_HOST=localhost
REDIS_PORT=6379

# ===== 이메일 설정 (SMTP) =====
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

# ===== 카카오 OAuth 설정 =====
KAKAO_CLIENT_ID=your-kakao-rest-api-key
KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback

# ===== 앱 설정 =====
SECRET_KEY=your-secret-key-change-in-production
BACKEND_PORT=8000
FRONTEND_PORT=3000

# ===== 프론트엔드 API URL =====
REACT_APP_API_URL=http://localhost:8000
```

### Gmail SMTP 설정 방법

1. Google 계정 관리 → 보안
2. 2단계 인증 활성화
3. 앱 비밀번호 생성
4. 생성된 16자리 비밀번호를 `EMAIL_PASSWORD`에 입력

### 카카오 OAuth 설정 방법

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. **내 애플리케이션** → 앱 추가
3. **앱 키** → REST API 키 복사 → `KAKAO_CLIENT_ID`에 입력
4. **플랫폼 설정** → Web 플랫폼 추가
   - 사이트 도메인: `http://localhost:3000`
5. **카카오 로그인** → 활성화 설정
6. **Redirect URI 등록**
   - `http://localhost:3000/auth/kakao/callback`
7. **동의 항목** 설정
   - 이메일, 프로필 정보 (닉네임, 프로필 사진) 필수 동의

---


## 데이터베이스

### 주요 테이블 (MySQL)
- **users** - 사용자 정보 및 프로필
- **feeds** - 소셜 피드 게시글
- **feed_images** - 피드 이미지 (다중 이미지)
- **feed_comments** - 피드 댓글
- **liked_feeds** - 피드 좋아요
- **followers** - 팔로우 관계
- **follow_requests** - 팔로우 요청
- **virtual_fittings** - 가상 피팅 결과
- **virtual_fitting_process** - 가상 피팅 처리 상태
- **background_customs** - 배경 커스터마이징 결과
- **clothing_items** - 의류 데이터 (크롤링)
- **custom_clothing_items** - 커스텀 의류
- **user_clothes** - 사용자 의류 수집 (옷장)
- **liked_clothes** - 의류 좋아요
- **person_images** - 인물 이미지
- **verification** - 이메일 인증 코드

### 데이터 초기화
```bash
# 의류 데이터 삽입 (크롤링 CSV)
cd backend/crawling
python insert_csv.py

```

---

## 성능 최적화

### 백엔드 최적화
- **비동기 처리** - FastAPI의 async/await 활용
- **Redis 작업 큐** - 백그라운드 워커를 통한 무거운 작업 처리
- **Gradio API 활용** - 로컬 모델 대신 클라우드 API로 서버 부하 감소
- **이미지 최적화** - Pillow를 통한 자동 리사이징 및 압축
- **세션 캐싱** - Redis를 통한 세션 관리

### 프론트엔드 최적화
- **지연 로딩** - React.lazy를 통한 코드 분할
- **이미지 프록시** - 외부 이미지 캐싱 및 최적화
- **무한 스크롤** - 피드 페이지네이션
- **상태 관리 최적화** - Context API를 통한 효율적인 상태 관리
- **CSS Modules** - 스타일 격리 및 번들 크기 최적화

### AI 모델 최적화
- **3단계 피팅 옵션** - 사용자가 속도/품질 선택 가능
  1. 고품질 (OOTDiffusion) - 2-3분
  2. 빠른 피팅 (Change Clothes AI) - 30초
  3. 빠른 피팅 (Leffa AI) - 30초
- **결과 캐싱** - Redis를 통한 중복 요청 방지

---

## 주의사항 및 제한사항

### AI 모델 관련
- **OOTDiffusion 모델 설치 필수** - 고품질 가상 피팅 사용 시 필요
- **GPU 권장** - CUDA 지원 GPU가 있으면 처리 속도 향상
- **Gradio API 제한** - Hugging Face Gradio 서비스의 트래픽 제한 가능
- **처리 시간**
  - OOTDiffusion: 2-3분 (GPU) / 10분+ (CPU)
  - Change Clothes AI: 30초-1분
  - Leffa AI: 30초-1분

---

## 참고 자료

### AI 모델
- [OOTDiffusion GitHub](https://github.com/levihsu/OOTDiffusion)
- [Change Clothes AI - Hugging Face](https://huggingface.co/spaces/jallenjia/Change-Clothes-AI)
- [Leffa AI - Hugging Face](https://huggingface.co/spaces/franciszzj/Leffa)

### 기술 문서
- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [React 공식 문서](https://react.dev/)
- [Gradio Client 문서](https://www.gradio.app/docs/python-client/introduction)

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