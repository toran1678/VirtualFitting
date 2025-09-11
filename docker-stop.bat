@echo off
chcp 65001 >nul

REM 도커 컴포즈 중지 스크립트

echo 🛑 가상 피팅 프로젝트 도커 컨테이너 중지 중...

REM 도커 컴포즈 중지
docker-compose down

echo ✅ 모든 서비스가 중지되었습니다!
echo.
echo 🗑️  볼륨까지 삭제하려면:
echo    docker-compose down -v
echo.
echo 🧹 이미지까지 삭제하려면:
echo    docker-compose down --rmi all
echo.
pause
