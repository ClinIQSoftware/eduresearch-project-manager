# Railway Deployment

## Quick Start

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Add PostgreSQL: `railway add -d postgres`
5. Deploy: `railway up`

## Environment Variables

Set these in Railway Dashboard > Variables:

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | JWT secret (min 32 chars) |
| `FRONTEND_URL` | Your frontend URL |
| `BACKEND_URL` | Your Railway backend URL |
| `GOOGLE_CLIENT_ID` | Optional: Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Optional: Google OAuth |

`DATABASE_URL` is automatically set when you add PostgreSQL.

## Frontend

Deploy frontend separately as a static site or use Railway's static hosting.
