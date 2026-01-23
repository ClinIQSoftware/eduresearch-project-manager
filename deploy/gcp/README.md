# Google Cloud Platform Deployment

## Prerequisites

1. GCP account with billing enabled
2. gcloud CLI installed and configured
3. Cloud Run, Cloud SQL, and Cloud Build APIs enabled

## Quick Start

### 1. Set Up Project

```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Enable APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com
```

### 2. Create Cloud SQL PostgreSQL

```bash
gcloud sql instances create eduresearch-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

gcloud sql databases create eduresearch --instance=eduresearch-db

gcloud sql users set-password postgres \
  --instance=eduresearch-db \
  --password=YOUR_PASSWORD
```

### 3. Create Secrets

```bash
echo -n "your-secret-key-min-32-chars" | \
  gcloud secrets create eduresearch-secret-key --data-file=-

echo -n "postgresql://postgres:PASSWORD@/eduresearch?host=/cloudsql/PROJECT:REGION:eduresearch-db" | \
  gcloud secrets create eduresearch-db-url --data-file=-
```

### 4. Create Frontend Bucket

```bash
gsutil mb -l us-central1 gs://eduresearch-frontend
gsutil web set -m index.html -e index.html gs://eduresearch-frontend
```

### 5. Deploy

```bash
# Trigger Cloud Build
gcloud builds submit --config=deploy/gcp/cloudbuild.yaml
```

Or deploy manually:

```bash
# Build and push
docker build -t gcr.io/YOUR_PROJECT/eduresearch-backend ./backend
docker push gcr.io/YOUR_PROJECT/eduresearch-backend

# Deploy to Cloud Run
gcloud run deploy eduresearch-api \
  --image gcr.io/YOUR_PROJECT/eduresearch-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances YOUR_PROJECT:us-central1:eduresearch-db \
  --set-secrets SECRET_KEY=eduresearch-secret-key:latest,DATABASE_URL=eduresearch-db-url:latest
```

## Architecture

- **Backend**: Cloud Run (serverless containers)
- **Database**: Cloud SQL PostgreSQL
- **Frontend**: Cloud Storage + Cloud CDN
- **Secrets**: Secret Manager

## Costs (Estimated)

- Cloud Run: ~$10/month (low traffic, scales to zero)
- Cloud SQL db-f1-micro: ~$10/month
- Cloud Storage: < $1/month
- Cloud CDN: < $5/month

Total: ~$25/month for small deployment
