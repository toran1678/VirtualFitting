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

# 앱 빌드
RUN npm run build

# React 앱 실행
CMD ["npm", "start"]
