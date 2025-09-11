# 🐳 Docker 배포 가이드

이 프로젝트는 Docker를 사용하여 쉽게 배포할 수 있습니다.

## 📋 사전 요구사항

- Docker Desktop (Windows/Mac) 또는 Docker Engine (Linux)
- Docker Compose

## 🚀 빠른 시작

### 1. 환경 변수 설정

```bash
# env.example을 복사하여 .env 파일 생성
copy env.example .env
```

`.env` 파일을 열어서 필요한 설정을 수정하세요:

> **중요**: `.env` 파일은 프로젝트 루트 디렉토리에 위치해야 합니다. 백엔드 디렉토리가 아닙니다!

```env
# 데이터베이스 설정
MYSQL_ROOT_PASSWORD=123456
MYSQL_DATABASE=capstone
MYSQL_PORT=3308

# Redis 설정
REDIS_PORT=6379

# 백엔드 설정
BACKEND_PORT=8000

# 프론트엔드 설정
FRONTEND_PORT=3000
REACT_APP_API_URL=http://localhost:8000
```

### 2. 서비스 시작

**Windows:**
```cmd
docker-start.bat
```

**또는 수동으로:**
```bash
docker-compose up --build -d
```

### 3. 서비스 중지

**Windows:**
```cmd
docker-stop.bat
```

**또는 수동으로:**
```bash
docker-compose down
```

## 🌐 서비스 접속

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8000
- **MySQL**: localhost:3308
- **Redis**: localhost:6379

## 📊 컨테이너 관리

### 컨테이너 상태 확인
```bash
docker-compose ps
```

### 로그 확인
```bash
# 모든 서비스 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f backend-worker
docker-compose logs -f redis
```

### 컨테이너 재시작
```bash
# 특정 서비스 재시작
docker-compose restart backend

# 모든 서비스 재시작
docker-compose restart
```

## 🏗️ 서비스 구성

### 1. MySQL 데이터베이스
- **포트**: 3308
- **데이터베이스**: capstone
- **사용자**: root
- **비밀번호**: 123456 (기본값)

### 2. Redis 캐시
- **포트**: 6379
- **기능**: 작업 큐, 세션 캐시, 가상 피팅 상태 관리

### 3. FastAPI 백엔드
- **포트**: 8000
- **기능**: API 서버, 파일 업로드 처리
- **의존성**: MySQL, Redis

### 4. 백엔드 워커
- **기능**: 가상 피팅 처리 (백그라운드 작업)
- **의존성**: MySQL, Redis

### 5. React 프론트엔드
- **포트**: 3000
- **기능**: 사용자 인터페이스
- **의존성**: 백엔드 API

## 🔧 프로덕션 배포

프로덕션 환경에서는 `docker-compose.prod.yml`을 사용하세요:

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

## 🗑️ 정리

### 볼륨까지 삭제
```bash
docker-compose down -v
```

### 이미지까지 삭제
```bash
docker-compose down --rmi all
```

### 모든 Docker 리소스 정리
```bash
docker system prune -a
```

## 🐛 문제 해결

### 포트 충돌
다른 서비스가 같은 포트를 사용하고 있다면 `.env` 파일에서 포트를 변경하세요.

### 데이터베이스 연결 오류
MySQL 컨테이너가 완전히 시작될 때까지 기다려주세요. 헬스체크가 완료된 후 백엔드가 시작됩니다.

### 환경 변수 문제
- `.env` 파일이 프로젝트 루트에 있는지 확인하세요
- 백엔드 디렉토리에 `.env` 파일이 있다면 프로젝트 루트로 이동하세요
- Docker Compose는 `env_file: - .env` 설정으로 루트의 `.env` 파일을 읽습니다

### 권한 문제 (Linux/Mac)
```bash
sudo chown -R $USER:$USER ./backend/uploads
```

## 📝 추가 정보

- 모든 업로드된 파일은 `./backend/uploads/` 디렉토리에 저장됩니다.
- 데이터베이스 데이터는 Docker 볼륨에 영구 저장됩니다.
- 개발 모드에서는 `--reload` 옵션으로 코드 변경 시 자동 재시작됩니다.
