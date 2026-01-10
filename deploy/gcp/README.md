# GCP Cloud Run Deployment

Deploy EduResearch Project Manager on Google Cloud Platform using Cloud Run.

## Architecture

- **Cloud Run**: Backend API and frontend (serverless)
- **Cloud SQL**: PostgreSQL database
- **Secret Manager**: Secure credential storage
- **Cloud Build**: CI/CD pipeline

## Prerequisites

1. GCP account with billing enabled
2. `gcloud` CLI installed and authenticated
3. Enable required APIs:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com
```

## Quick Start

### 1. Set Variables

```bash
export PROJECT_ID=$(gcloud config get-value project)
export REGION=us-central1
```

### 2. Create Cloud SQL Instance

```bash
# Create PostgreSQL instance
gcloud sql instances create eduresearch-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password=YOUR_DB_PASSWORD

# Create database
gcloud sql databases create eduresearch \
  --instance=eduresearch-db
```

### 3. Store Secrets

```bash
# Database URL
echo -n "postgresql://postgres:YOUR_DB_PASSWORD@/eduresearch?host=/cloudsql/$PROJECT_ID:$REGION:eduresearch-db" | \
  gcloud secrets create database-url --data-file=-

# Secret key
echo -n "your-secret-key-at-least-32-characters" | \
  gcloud secrets create secret-key --data-file=-
```

### 4. Create Service Account

```bash
# Create service account
gcloud iam service-accounts create eduresearch-sa

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:eduresearch-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:eduresearch-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding secret-key \
  --member="serviceAccount:eduresearch-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 5. Build and Deploy

```bash
# Submit build
gcloud builds submit --config=deploy/gcp/cloudbuild.yaml

# Or deploy manually:

# Build and push backend
docker build -t gcr.io/$PROJECT_ID/eduresearch-backend:latest -f backend/Dockerfile backend/
docker push gcr.io/$PROJECT_ID/eduresearch-backend:latest

# Deploy backend
gcloud run deploy eduresearch-backend \
  --image gcr.io/$PROJECT_ID/eduresearch-backend:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets DATABASE_URL=database-url:latest,SECRET_KEY=secret-key:latest \
  --add-cloudsql-instances $PROJECT_ID:$REGION:eduresearch-db \
  --service-account eduresearch-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1

# Get backend URL
BACKEND_URL=$(gcloud run services describe eduresearch-backend --region $REGION --format='value(status.url)')

# Build and push frontend
docker build -t gcr.io/$PROJECT_ID/eduresearch-frontend:latest \
  --build-arg VITE_API_URL=$BACKEND_URL \
  -f frontend/Dockerfile frontend/
docker push gcr.io/$PROJECT_ID/eduresearch-frontend:latest

# Deploy frontend
gcloud run deploy eduresearch-frontend \
  --image gcr.io/$PROJECT_ID/eduresearch-frontend:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 256Mi
```

### 6. Run Migrations

```bash
# Create a Cloud Run job for migrations
gcloud run jobs create eduresearch-migrations \
  --image gcr.io/$PROJECT_ID/eduresearch-backend:latest \
  --region $REGION \
  --set-secrets DATABASE_URL=database-url:latest \
  --add-cloudsql-instances $PROJECT_ID:$REGION:eduresearch-db \
  --service-account eduresearch-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --command "alembic" \
  --args "upgrade,head"

# Execute the job
gcloud run jobs execute eduresearch-migrations --region $REGION --wait
```

## Cost Estimate

Monthly cost (us-central1, low traffic):
- Cloud Run: ~$5-20 (pay per use)
- Cloud SQL db-f1-micro: ~$10
- Secret Manager: ~$0.06
- Cloud Build: Free tier

**Total: ~$15-30/month**

## Auto-Deploy with Cloud Build

Connect your GitHub repository:

1. Go to Cloud Build > Triggers
2. Create trigger from GitHub
3. Set build configuration to `deploy/gcp/cloudbuild.yaml`
4. Select branch pattern (e.g., `^main$`)

## Cleanup

```bash
# Delete Cloud Run services
gcloud run services delete eduresearch-backend --region $REGION -q
gcloud run services delete eduresearch-frontend --region $REGION -q

# Delete Cloud SQL
gcloud sql instances delete eduresearch-db -q

# Delete secrets
gcloud secrets delete database-url -q
gcloud secrets delete secret-key -q

# Delete images
gcloud container images delete gcr.io/$PROJECT_ID/eduresearch-backend -q
gcloud container images delete gcr.io/$PROJECT_ID/eduresearch-frontend -q
```
