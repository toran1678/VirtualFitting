# Node.js 기반 이미지 사용
FROM node:18

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 복사
COPY package.json package-lock.json ./

# 의존성 설치
RUN npm install

# 소스 코드 복사
COPY . .

# 환경 변수 설정 (빌드 시점)
ARG REACT_APP_API_URL=http://localhost:8000
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# 앱 빌드
RUN npm run build

# 포트 노출
EXPOSE 3000

# React 앱 실행
CMD ["npm", "start"]
