# Azure Deployment

## Prerequisites

1. Azure account with active subscription
2. Azure CLI installed and logged in
3. Docker image published to a container registry

## Quick Start

### 1. Create Resource Group

```bash
az group create --name eduresearch-rg --location eastus
```

### 2. Deploy ARM Template

```bash
az deployment group create \
  --resource-group eduresearch-rg \
  --template-file deploy/azure/azuredeploy.json \
  --parameters \
    appName=eduresearch \
    secretKey="your-secret-key-min-32-chars" \
    dbAdminPassword="your-db-password" \
    frontendUrl="https://your-frontend.azurestaticapps.net"
```

### 3. Deploy Frontend to Static Web Apps

```bash
# Build frontend
cd frontend
npm install
VITE_API_URL=https://eduresearch-api.azurecontainerapps.io/api npm run build

# Deploy using Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli
swa deploy ./dist --deployment-token YOUR_DEPLOYMENT_TOKEN
```

## Architecture

- **Backend**: Azure Container Apps (serverless containers)
- **Database**: Azure Database for PostgreSQL Flexible Server
- **Frontend**: Azure Static Web Apps or Blob Storage + CDN

## One-Click Deploy

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2FClinIQSoftware%2Feduresearch-project-manager%2Fmain%2Fdeploy%2Fazure%2Fazuredeploy.json)

## Costs (Estimated)

- Container Apps: ~$15/month (scales to zero)
- PostgreSQL Flexible Server (B1ms): ~$15/month
- Static Web Apps: Free tier available

Total: ~$30/month for small deployment

## Scaling

Azure Container Apps automatically scales based on HTTP traffic. Configure min/max replicas in the template.
