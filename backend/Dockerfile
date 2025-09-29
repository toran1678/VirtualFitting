FROM python:3.9

WORKDIR /app

# 시스템 패키지 업데이트 및 필요한 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# 애플리케이션 코드 복사
COPY . .

# 업로드 디렉토리 생성
RUN mkdir -p uploads/profile_pictures uploads/feeds uploads/custom_clothing uploads/user_clothes

# 포트 노출
EXPOSE 8000

# 기본 명령어 (메인 앱 실행 - 프로덕션)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]