@echo off
chcp 65001 >nul

REM 도커 컴포즈 실행 스크립트

echo 🚀 가상 피팅 프로젝트 도커 컨테이너 시작 중...

REM 환경 변수 파일 확인
if not exist .env (
    echo ⚠️  .env 파일이 없습니다. env.example을 복사하여 .env 파일을 생성하세요.
    echo    copy env.example .env
    pause
    exit /b 1
)

REM 도커 컴포즈 실행
echo 📦 도커 컨테이너 빌드 및 시작...
docker-compose up --build -d

echo ✅ 모든 서비스가 시작되었습니다!
echo.
echo 🌐 서비스 접속 정보:
echo    - 프론트엔드: http://localhost:3000
echo    - 백엔드 API: http://localhost:8000
echo    - MySQL: localhost:3308
echo.
echo 📊 컨테이너 상태 확인:
echo    docker-compose ps
echo.
echo 📝 로그 확인:
echo    docker-compose logs -f [service_name]
echo.
echo 🛑 서비스 중지:
echo    docker-compose down
echo.
pause
