# AWS Deployment

Deploy EduResearch Project Manager on AWS using CloudFormation.

## Architecture

- **ECS Fargate**: Backend API (2 tasks)
- **RDS PostgreSQL**: Database (db.t3.micro)
- **S3 + CloudFront**: Frontend static hosting
- **ALB**: Load balancer for backend
- **VPC**: Isolated network with public/private subnets

## Prerequisites

1. AWS CLI installed and configured
2. Docker images pushed to a container registry (ECR or GHCR)

## Quick Start

### 1. Deploy the Stack

```bash
aws cloudformation create-stack \
  --stack-name eduresearch \
  --template-body file://cloudformation.yaml \
  --capabilities CAPABILITY_IAM \
  --parameters \
    ParameterKey=DBPassword,ParameterValue=YOUR_DB_PASSWORD \
    ParameterKey=SecretKey,ParameterValue=YOUR_SECRET_KEY_32_CHARS_MIN \
    ParameterKey=BackendImage,ParameterValue=ghcr.io/yourorg/eduresearch-backend:latest
```

### 2. Deploy Frontend to S3

After the stack is created, upload the frontend build:

```bash
# Build frontend
cd frontend
npm run build

# Get bucket name from CloudFormation outputs
BUCKET=$(aws cloudformation describe-stacks \
  --stack-name eduresearch \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

# Upload to S3
aws s3 sync dist/ s3://$BUCKET/ --delete

# Invalidate CloudFront cache
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[?DomainName=='${BUCKET}.s3.amazonaws.com']].Id" \
  --output text)
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

### 3. Run Database Migrations

Connect to the ECS task and run migrations:

```bash
# Get task ARN
TASK=$(aws ecs list-tasks \
  --cluster eduresearch-cluster \
  --service-name eduresearch-backend \
  --query 'taskArns[0]' \
  --output text)

# Execute migration
aws ecs execute-command \
  --cluster eduresearch-cluster \
  --task $TASK \
  --container backend \
  --interactive \
  --command "alembic upgrade head"
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `Environment` | No | `production` or `staging` (default: production) |
| `DBUsername` | No | Database username (default: eduresearch) |
| `DBPassword` | Yes | Database password (min 8 chars) |
| `SecretKey` | Yes | JWT signing key (min 32 chars) |
| `DomainName` | No | Custom domain for HTTPS |
| `BackendImage` | No | Backend container image |
| `FrontendImage` | No | Frontend container image |

## Outputs

After deployment, get the URLs:

```bash
aws cloudformation describe-stacks \
  --stack-name eduresearch \
  --query 'Stacks[0].Outputs'
```

## Cost Estimate

Monthly cost (us-east-1):
- ECS Fargate (2 tasks): ~$30
- RDS db.t3.micro: ~$15
- NAT Gateway: ~$32
- ALB: ~$20
- CloudFront: ~$1 (low traffic)
- S3: ~$1

**Total: ~$100/month**

## Scaling

Adjust the `DesiredCount` in the ECS service for horizontal scaling:

```bash
aws ecs update-service \
  --cluster eduresearch-cluster \
  --service eduresearch-backend \
  --desired-count 4
```

## Cleanup

```bash
# Empty the S3 bucket first
aws s3 rm s3://$BUCKET --recursive

# Delete the stack
aws cloudformation delete-stack --stack-name eduresearch
```
