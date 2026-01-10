# Deployment Guide

EduResearch Project Manager supports one-click deployment to multiple platforms.

## Quick Deploy

| Platform | Deploy Button |
|----------|--------------|
| Render | [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR_ORG/eduresearch-project-manager) |
| Railway | [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/eduresearch) |
| Heroku | [![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/YOUR_ORG/eduresearch-project-manager) |

## Platform-Specific Guides

- [Render](render/README.md) - Recommended for beginners
- [Railway](railway/README.md) - Fast deployment with auto-scaling
- [Fly.io](flyio/README.md) - Edge deployment with global regions
- [Heroku](heroku/README.md) - Classic PaaS with add-ons
- [Docker](docker/README.md) - Self-hosted with docker-compose
- [Kubernetes](k8s/README.md) - Production-grade orchestration
- [AWS](aws/README.md) - CloudFormation stack (ECS Fargate + RDS)
- [GCP](gcp/README.md) - Cloud Run deployment
- [Azure](azure/README.md) - Container Instances + Azure DB

## Environment Variables

All platforms require these environment variables:

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SECRET_KEY` | JWT signing key (min 32 chars) | `your-super-secret-key-here` |
| `FRONTEND_URL` | Frontend app URL | `https://your-app.onrender.com` |
| `BACKEND_URL` | Backend API URL | `https://your-api.onrender.com` |

### Optional - OAuth
| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth secret |
| `MICROSOFT_TENANT_ID` | Microsoft tenant ID |

### Optional - Email (SMTP)
| Variable | Description | Default |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASSWORD` | SMTP password | - |
| `FROM_EMAIL` | Sender email address | - |
| `FROM_NAME` | Sender display name | `EduResearch` |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Load Balancer                       │
│                    (HTTPS termination)                   │
└─────────────────────────┬───────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌───────────────┐                   ┌───────────────┐
│   Frontend    │                   │   Backend     │
│  (Static/CDN) │                   │  (FastAPI)    │
│   React SPA   │                   │   Gunicorn    │
└───────────────┘                   └───────┬───────┘
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │  PostgreSQL   │
                                    │   Database    │
                                    └───────────────┘
```

## Database Migrations

All platforms automatically run migrations on startup via:
```bash
alembic upgrade head
```

For manual migration:
```bash
cd backend
alembic upgrade head
```

## SSL/TLS

- **PaaS platforms** (Render, Railway, Heroku, Fly.io): Automatic HTTPS
- **Docker/K8s**: Configure Traefik, nginx-ingress, or cert-manager
- **Cloud providers**: Use managed load balancers with ACM/Cloud Armor

## Scaling Recommendations

| Users | Backend Instances | Database Plan |
|-------|-------------------|---------------|
| < 100 | 1 | 256MB |
| 100-500 | 2 | 1GB |
| 500-2000 | 4 | 4GB |
| 2000+ | 8+ with autoscaling | 16GB+ |

## Support

- [GitHub Issues](https://github.com/YOUR_ORG/eduresearch-project-manager/issues)
- [Documentation](https://github.com/YOUR_ORG/eduresearch-project-manager#readme)
