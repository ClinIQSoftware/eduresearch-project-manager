# AWS CloudFormation Deployment

## Prerequisites

1. AWS CLI installed and configured
2. Docker installed (for building images)
3. An ECR repository for the backend image

## Quick Start

### 1. Build and Push Docker Image

```bash
# Create ECR repository
aws ecr create-repository --repository-name eduresearch-backend

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t eduresearch-backend ./backend
docker tag eduresearch-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/eduresearch-backend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/eduresearch-backend:latest
```

### 2. Deploy CloudFormation Stack

```bash
aws cloudformation create-stack \
  --stack-name eduresearch \
  --template-body file://deploy/aws/cloudformation.yaml \
  --parameters \
    ParameterKey=DomainName,ParameterValue=eduresearch.yourdomain.com \
    ParameterKey=SecretKey,ParameterValue=your-secret-key-min-32-chars \
    ParameterKey=DBPassword,ParameterValue=your-db-password \
  --capabilities CAPABILITY_IAM
```

### 3. Deploy Frontend

```bash
# Build frontend
cd frontend
npm install
VITE_API_URL=https://your-alb-url.amazonaws.com/api npm run build

# Upload to S3
aws s3 sync dist/ s3://eduresearch-frontend/
```

## Architecture

- **VPC**: 2 public + 2 private subnets across 2 AZs
- **Backend**: ECS Fargate with Application Load Balancer
- **Database**: RDS PostgreSQL (db.t3.micro)
- **Frontend**: S3 + CloudFront CDN
- **Secrets**: AWS Secrets Manager

## Costs (Estimated)

- ECS Fargate: ~$30/month (1 task, 0.25 vCPU, 512MB)
- RDS db.t3.micro: ~$15/month
- CloudFront: ~$1/month (low traffic)
- S3: < $1/month

Total: ~$50/month for small deployment

## Scaling

Modify the ECS service desired count in the template or use auto-scaling.
