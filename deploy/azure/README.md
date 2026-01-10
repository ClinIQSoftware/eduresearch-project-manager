# Azure Deployment

Deploy EduResearch Project Manager on Microsoft Azure using Container Apps.

## Architecture

- **Azure Container Apps**: Backend and frontend (serverless containers)
- **Azure Database for PostgreSQL**: Flexible Server
- **Log Analytics**: Centralized logging

## Prerequisites

1. Azure CLI installed and authenticated
2. Docker images pushed to a container registry (ACR, GHCR, or Docker Hub)

## Quick Start

### 1. Create Resource Group

```bash
az group create \
  --name eduresearch-rg \
  --location eastus
```

### 2. Deploy with ARM Template

```bash
az deployment group create \
  --resource-group eduresearch-rg \
  --template-file deploy/azure/arm-template.json \
  --parameters \
    postgresAdminPassword='YOUR_DB_PASSWORD' \
    secretKey='your-secret-key-at-least-32-characters' \
    backendImage='ghcr.io/yourorg/eduresearch-backend:latest' \
    frontendImage='ghcr.io/yourorg/eduresearch-frontend:latest'
```

### 3. Get Deployment Outputs

```bash
az deployment group show \
  --resource-group eduresearch-rg \
  --name arm-template \
  --query properties.outputs
```

### 4. Run Database Migrations

```bash
# Get backend app name
BACKEND_APP=$(az containerapp list \
  --resource-group eduresearch-rg \
  --query "[?contains(name, 'backend')].name" \
  --output tsv)

# Execute migration command
az containerapp exec \
  --resource-group eduresearch-rg \
  --name $BACKEND_APP \
  --command "alembic upgrade head"
```

## Using Azure Container Registry (ACR)

### Create ACR

```bash
az acr create \
  --resource-group eduresearch-rg \
  --name eduresearchacr \
  --sku Basic
```

### Build and Push Images

```bash
# Login to ACR
az acr login --name eduresearchacr

# Build and push backend
az acr build \
  --registry eduresearchacr \
  --image eduresearch-backend:latest \
  --file backend/Dockerfile \
  ./backend

# Build and push frontend
az acr build \
  --registry eduresearchacr \
  --image eduresearch-frontend:latest \
  --file frontend/Dockerfile \
  ./frontend
```

### Deploy with ACR Images

```bash
az deployment group create \
  --resource-group eduresearch-rg \
  --template-file deploy/azure/arm-template.json \
  --parameters \
    postgresAdminPassword='YOUR_DB_PASSWORD' \
    secretKey='your-secret-key-32-chars' \
    backendImage='eduresearchacr.azurecr.io/eduresearch-backend:latest' \
    frontendImage='eduresearchacr.azurecr.io/eduresearch-frontend:latest'
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `location` | No | Azure region (default: resource group location) |
| `environmentName` | No | Name prefix (default: eduresearch) |
| `postgresAdminUser` | No | DB username (default: eduresearch) |
| `postgresAdminPassword` | Yes | DB password |
| `secretKey` | Yes | JWT signing key |
| `backendImage` | No | Backend container image |
| `frontendImage` | No | Frontend container image |

## Cost Estimate

Monthly cost (East US, low traffic):
- Container Apps: ~$20-40 (consumption-based)
- PostgreSQL Flexible (B1ms): ~$15
- Log Analytics: ~$2-5

**Total: ~$40-60/month**

## Scaling

Container Apps automatically scale based on HTTP traffic. To adjust scaling:

```bash
# Update backend scaling
az containerapp update \
  --resource-group eduresearch-rg \
  --name eduresearch-backend \
  --min-replicas 2 \
  --max-replicas 20
```

## Custom Domain

```bash
# Add custom domain
az containerapp hostname add \
  --resource-group eduresearch-rg \
  --name eduresearch-frontend \
  --hostname app.yourdomain.com

# Configure managed certificate
az containerapp hostname bind \
  --resource-group eduresearch-rg \
  --name eduresearch-frontend \
  --hostname app.yourdomain.com \
  --environment eduresearch-env \
  --validation-method CNAME
```

## Cleanup

```bash
az group delete --name eduresearch-rg --yes --no-wait
```
