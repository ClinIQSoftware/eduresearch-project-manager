# EduResearch Deployment Guide

Choose your preferred deployment platform from the options below.

## One-Click Deploy Buttons

| Platform | Deploy | Notes |
|----------|--------|-------|
| **Render** | [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ClinIQSoftware/eduresearch-project-manager) | Recommended for getting started |
| **Heroku** | [![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/ClinIQSoftware/eduresearch-project-manager) | Requires Heroku account |
| **Azure** | [![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2FClinIQSoftware%2Feduresearch-project-manager%2Fmain%2Fdeploy%2Fazure%2Fazuredeploy.json) | Enterprise ready |

## Platform Comparison

| Platform | Difficulty | Cost/Month | Scale | Best For |
|----------|------------|------------|-------|----------|
| **Render** | Easy | $0-25 | Auto | Quick start, small teams |
| **Railway** | Easy | $5-20 | Auto | Developers, startups |
| **Fly.io** | Medium | $5-30 | Manual | Global edge, performance |
| **Heroku** | Easy | $7-50 | Auto | Enterprise, support |
| **Docker** | Medium | Self-hosted | Manual | Full control, on-premise |
| **AWS** | Hard | $50+ | Auto | Enterprise, compliance |
| **GCP** | Medium | $25+ | Auto | Google ecosystem |
| **Azure** | Medium | $30+ | Auto | Microsoft ecosystem |

## Environment Variables Reference

### Required Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT secret (min 32 characters) |
| `FRONTEND_URL` | Frontend URL for CORS |
| `BACKEND_URL` | Backend URL for OAuth callbacks |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENVIRONMENT` | `development` | Set to `production` for prod |
| `GOOGLE_CLIENT_ID` | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | - | Google OAuth client secret |
| `MICROSOFT_CLIENT_ID` | - | Microsoft OAuth client ID |
| `MICROSOFT_CLIENT_SECRET` | - | Microsoft OAuth client secret |
| `SMTP_HOST` | `smtp.gmail.com` | Email server host |
| `SMTP_PORT` | `587` | Email server port |
| `SMTP_USER` | - | Email username |
| `SMTP_PASSWORD` | - | Email password |
| `FROM_EMAIL` | - | Sender email address |
| `FROM_NAME` | `EduResearch` | Sender display name |

## Quick Start by Platform

### Render (Recommended)
```bash
# Just click the deploy button above!
# Or connect your GitHub repo in the Render dashboard
```

### Railway
```bash
railway login
railway init
railway add -d postgres
railway up
```

### Fly.io
```bash
fly launch --config deploy/flyio/fly.toml
fly postgres create --name eduresearch-db
fly postgres attach eduresearch-db
fly secrets set SECRET_KEY="your-secret-key"
fly deploy
```

### Docker Compose
```bash
cd deploy/docker
cp .env.example .env
# Edit .env with your values
docker-compose -f docker-compose.prod.yml up -d
```

### AWS
```bash
aws cloudformation create-stack \
  --stack-name eduresearch \
  --template-body file://deploy/aws/cloudformation.yaml \
  --parameters ParameterKey=SecretKey,ParameterValue=your-key
```

## Post-Deployment Checklist

After deploying for the first time:

### 1. Change Platform Admin Password

The platform admin is created on first startup with credentials from environment variables.

1. Log in at `https://your-domain.com/login` with the admin credentials
2. You'll be prompted to change your password immediately
3. Use a strong, unique password

### 2. Configure Email (Optional)

Email notifications are optional but recommended. To enable:

1. Set SMTP environment variables (see backend/.env.example for Gmail instructions)
2. Check setup status: GET /api/platform/setup-status
3. Send a test email from Admin > Email Templates

### 3. Configure OAuth (Optional)

To enable social login:

1. Create OAuth credentials (Google Console / Azure Portal)
2. Set CLIENT_ID and CLIENT_SECRET environment variables
3. Redeploy to pick up new settings

### 4. Verify Setup

Check `/health?detailed=true` to verify:
- Database connection
- Email configuration status

## Architecture

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │    (Traefik/    │
                    │    Platform)    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │ Frontend │   │ Backend  │   │ Backend  │
       │  (Nginx) │   │ (Gunicorn│   │ (replica)│
       │          │   │ +Uvicorn)│   │          │
       └──────────┘   └────┬─────┘   └────┬─────┘
                           │              │
                           └──────┬───────┘
                                  │
                                  ▼
                         ┌───────────────┐
                         │  PostgreSQL   │
                         │   Database    │
                         └───────────────┘
```

## Scaling Recommendations

| Users | Backend Instances | DB Size | Notes |
|-------|-------------------|---------|-------|
| 1-50 | 1 | 1GB | Free tier works |
| 50-500 | 2 | 4GB | Add caching |
| 500-5000 | 3-5 | 16GB+ | Add CDN, read replicas |

## Support

For deployment issues, open an issue on GitHub or check the platform-specific README in each subdirectory.
