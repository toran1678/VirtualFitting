#!/bin/bash

# AWS 배포 스크립트
# 사용법: ./deploy-aws.sh [environment] [region]

set -e

ENVIRONMENT=${1:-production}
AWS_REGION=${2:-ap-northeast-2}
ECR_REPOSITORY="capstone-project"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "🚀 AWS 배포 시작 - Environment: $ENVIRONMENT, Region: $AWS_REGION"

# AWS CLI 설치 확인
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI가 설치되지 않았습니다. https://aws.amazon.com/cli/ 에서 설치하세요."
    exit 1
fi

# Docker 설치 확인
if ! command -v docker &> /dev/null; then
    echo "❌ Docker가 설치되지 않았습니다. https://www.docker.com/ 에서 설치하세요."
    exit 1
fi

# AWS 자격 증명 확인
echo "🔐 AWS 자격 증명 확인 중..."
aws sts get-caller-identity

# ECR 로그인
echo "🐳 ECR 로그인 중..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# ECR 리포지토리 생성 (존재하지 않는 경우)
echo "📦 ECR 리포지토리 확인/생성 중..."
aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION || \
aws ecr create-repository --repository-name $ECR_REPOSITORY --region $AWS_REGION

# 이미지 빌드 및 푸시
echo "🔨 Docker 이미지 빌드 중..."

# 백엔드 이미지
echo "📦 백엔드 이미지 빌드 중..."
docker build -t $ECR_REGISTRY/$ECR_REPOSITORY-backend:latest ./backend
docker tag $ECR_REGISTRY/$ECR_REPOSITORY-backend:latest $ECR_REGISTRY/$ECR_REPOSITORY-backend:$ENVIRONMENT

echo "📤 백엔드 이미지 푸시 중..."
docker push $ECR_REGISTRY/$ECR_REPOSITORY-backend:latest
docker push $ECR_REGISTRY/$ECR_REPOSITORY-backend:$ENVIRONMENT

# 프론트엔드 이미지
echo "📦 프론트엔드 이미지 빌드 중..."
docker build -t $ECR_REGISTRY/$ECR_REPOSITORY-frontend:latest ./frontend
docker tag $ECR_REGISTRY/$ECR_REPOSITORY-frontend:latest $ECR_REGISTRY/$ECR_REPOSITORY-frontend:$ENVIRONMENT

echo "📤 프론트엔드 이미지 푸시 중..."
docker push $ECR_REGISTRY/$ECR_REPOSITORY-frontend:latest
docker push $ECR_REGISTRY/$ECR_REPOSITORY-frontend:$ENVIRONMENT

echo "✅ 배포 완료!"
echo "📋 다음 단계:"
echo "1. AWS ECS 클러스터 생성"
echo "2. ECS 서비스 생성 및 태스크 정의 설정"
echo "3. Application Load Balancer 설정"
echo "4. RDS 데이터베이스 생성"
echo "5. ElastiCache Redis 클러스터 생성"
echo "6. Route 53 도메인 설정"
