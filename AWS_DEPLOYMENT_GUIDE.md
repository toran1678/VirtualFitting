# 🚀 AWS 배포 가이드

이 문서는 Capstone Project를 AWS에 배포하는 방법을 설명합니다.

## 📋 사전 준비사항

### 1. AWS 계정 및 도구 설치
- [AWS 계정 생성](https://aws.amazon.com/)
- [AWS CLI 설치](https://aws.amazon.com/cli/)
- [Docker 설치](https://www.docker.com/)
- [Terraform 설치](https://www.terraform.io/) (선택사항)

### 2. AWS 자격 증명 설정
```bash
aws configure
# AWS Access Key ID: [입력]
# AWS Secret Access Key: [입력]
# Default region name: ap-northeast-2
# Default output format: json
```

## 🏗️ 인프라 구성

### 옵션 1: AWS Console을 통한 수동 설정

#### 1. VPC 및 네트워킹
1. **VPC 생성**
   - IPv4 CIDR: `10.0.0.0/16`
   - DNS 호스트명 활성화

2. **서브넷 생성**
   - 퍼블릭 서브넷: `10.0.1.0/24`, `10.0.2.0/24`
   - 프라이빗 서브넷: `10.0.10.0/24`, `10.0.20.0/24`

3. **인터넷 게이트웨이 및 NAT 게이트웨이 설정**

#### 2. 데이터베이스 (RDS)
1. **MySQL 8.0 인스턴스 생성**
   - 인스턴스 클래스: `db.t3.micro` (프리티어)
   - 스토리지: 20GB
   - 마스터 사용자명: `admin`
   - 마스터 비밀번호: [안전한 비밀번호]

#### 3. 캐시 (ElastiCache)
1. **Redis 클러스터 생성**
   - 노드 타입: `cache.t3.micro`
   - 포트: 6379

#### 4. 컨테이너 레지스트리 (ECR)
1. **리포지토리 생성**
   - `capstone-project-backend`
   - `capstone-project-frontend`

#### 5. 컨테이너 오케스트레이션 (ECS)
1. **클러스터 생성**
   - 클러스터 이름: `capstone-cluster`
   - 인프라: Fargate

2. **태스크 정의 생성**
   - 백엔드 태스크 정의
   - 프론트엔드 태스크 정의

3. **서비스 생성**
   - 백엔드 서비스
   - 프론트엔드 서비스

#### 6. 로드 밸런서 (ALB)
1. **Application Load Balancer 생성**
   - 스키마: Internet-facing
   - IP 주소 타입: IPv4

2. **타겟 그룹 생성**
   - 백엔드 타겟 그룹 (포트 8000)
   - 프론트엔드 타겟 그룹 (포트 3000)

3. **리스너 규칙 설정**
   - `/api/*` → 백엔드 타겟 그룹
   - `/*` → 프론트엔드 타겟 그룹

### 옵션 2: Terraform을 통한 자동화 설정

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## 🐳 컨테이너 이미지 빌드 및 배포

### 1. 환경 변수 설정
```bash
# env.production 파일 수정
cp env.production .env
# 필요한 값들을 실제 AWS 리소스 정보로 수정
```

### 2. Docker 이미지 빌드 및 푸시
```bash
# ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin [ACCOUNT_ID].dkr.ecr.ap-northeast-2.amazonaws.com

# 백엔드 이미지 빌드 및 푸시
docker build -t capstone-backend ./backend
docker tag capstone-backend:latest [ACCOUNT_ID].dkr.ecr.ap-northeast-2.amazonaws.com/capstone-project-backend:latest
docker push [ACCOUNT_ID].dkr.ecr.ap-northeast-2.amazonaws.com/capstone-project-backend:latest

# 프론트엔드 이미지 빌드 및 푸시
docker build -t capstone-frontend ./frontend
docker tag capstone-frontend:latest [ACCOUNT_ID].dkr.ecr.ap-northeast-2.amazonaws.com/capstone-project-frontend:latest
docker push [ACCOUNT_ID].dkr.ecr.ap-northeast-2.amazonaws.com/capstone-project-frontend:latest
```

### 3. ECS 서비스 배포
1. **태스크 정의 생성**
   - ECR 이미지 URI 사용
   - 환경 변수 설정
   - 포트 매핑 설정

2. **서비스 생성**
   - 태스크 정의 연결
   - 로드 밸런서 연결
   - 자동 스케일링 설정

## 🔧 설정 및 최적화

### 1. 도메인 설정 (Route 53)
1. **호스팅 영역 생성**
2. **A 레코드 생성** (ALB DNS 이름으로)
3. **SSL 인증서 발급** (ACM)

### 2. 모니터링 설정 (CloudWatch)
1. **로그 그룹 생성**
2. **알람 설정**
3. **대시보드 생성**

### 3. 보안 강화
1. **WAF 설정** (선택사항)
2. **보안 그룹 규칙 최적화**
3. **IAM 역할 및 정책 설정**

## 📊 비용 최적화

### 1. 인스턴스 크기 조정
- 개발 환경: `t3.micro` (프리티어)
- 프로덕션 환경: `t3.small` 이상

### 2. 스토리지 최적화
- EBS 볼륨 타입: `gp3`
- 불필요한 스냅샷 정리

### 3. 데이터베이스 최적화
- RDS 인스턴스 크기 조정
- 읽기 전용 복제본 사용 (선택사항)

## 🚨 문제 해결

### 1. 일반적인 문제
- **컨테이너 시작 실패**: 로그 확인 및 환경 변수 검증
- **데이터베이스 연결 실패**: 보안 그룹 및 VPC 설정 확인
- **로드 밸런서 헬스 체크 실패**: 타겟 그룹 설정 확인

### 2. 로그 확인
```bash
# ECS 태스크 로그 확인
aws logs describe-log-groups
aws logs get-log-events --log-group-name /ecs/capstone-backend
```

### 3. 성능 모니터링
- CloudWatch 메트릭 확인
- X-Ray 트레이싱 설정 (선택사항)

## 🔄 CI/CD 파이프라인 (선택사항)

### GitHub Actions 설정
```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-2
      
      - name: Build and push images
        run: ./deploy-aws.sh production ap-northeast-2
      
      - name: Update ECS service
        run: |
          aws ecs update-service --cluster capstone-cluster --service capstone-backend --force-new-deployment
          aws ecs update-service --cluster capstone-cluster --service capstone-frontend --force-new-deployment
```

## 📝 체크리스트

- [ ] AWS 계정 및 도구 설치 완료
- [ ] VPC 및 네트워킹 설정 완료
- [ ] RDS 데이터베이스 생성 완료
- [ ] ElastiCache Redis 클러스터 생성 완료
- [ ] ECR 리포지토리 생성 완료
- [ ] ECS 클러스터 및 서비스 생성 완료
- [ ] ALB 설정 완료
- [ ] 도메인 및 SSL 인증서 설정 완료
- [ ] 모니터링 설정 완료
- [ ] 보안 설정 완료

## 💰 예상 비용 (월)

- **RDS (db.t3.micro)**: ~$15
- **ElastiCache (cache.t3.micro)**: ~$15
- **ECS Fargate**: ~$30-50
- **ALB**: ~$20
- **데이터 전송**: ~$10-20
- **총 예상 비용**: ~$90-120/월

*실제 비용은 사용량에 따라 달라질 수 있습니다.*

## 지원

문제가 발생하면 다음을 확인하세요:
1. AWS CloudWatch 로그
2. ECS 태스크 상태
3. 보안 그룹 설정
4. 환경 변수 설정
