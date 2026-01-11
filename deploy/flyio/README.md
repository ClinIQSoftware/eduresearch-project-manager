# Fly.io Deployment

## Quick Start

1. Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
2. Login: `fly auth login`
3. Create app: `fly apps create eduresearch-api`
4. Create PostgreSQL: `fly postgres create --name eduresearch-db`
5. Attach database: `fly postgres attach eduresearch-db --app eduresearch-api`
6. Set secrets:
   ```bash
   fly secrets set SECRET_KEY="your-secret-key" \
     FRONTEND_URL="https://your-frontend.fly.dev" \
     BACKEND_URL="https://eduresearch-api.fly.dev"
   ```
7. Deploy: `fly deploy --config deploy/flyio/fly.toml`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | JWT secret (min 32 chars) |
| `FRONTEND_URL` | Frontend URL for CORS |
| `BACKEND_URL` | Backend URL for OAuth callbacks |
| `GOOGLE_CLIENT_ID` | Optional: Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Optional: Google OAuth |

`DATABASE_URL` is automatically set when you attach PostgreSQL.

## Frontend Deployment

For the frontend, create a separate Fly app:
```bash
fly apps create eduresearch-frontend
fly deploy --config deploy/flyio/fly.frontend.toml
```

## Scaling

Scale up for production:
```bash
fly scale count 2 --app eduresearch-api
fly scale vm shared-cpu-1x --memory 512 --app eduresearch-api
```
