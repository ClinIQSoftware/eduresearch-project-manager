# Heroku Deployment

## One-Click Deploy

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/ClinIQSoftware/eduresearch-project-manager)

## Manual Deployment

1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Login: `heroku login`
3. Create app: `heroku create eduresearch-api`
4. Add PostgreSQL: `heroku addons:create heroku-postgresql:essential-0`
5. Set config vars:
   ```bash
   heroku config:set SECRET_KEY="your-secret-key" \
     FRONTEND_URL="https://your-frontend.com" \
     BACKEND_URL="https://eduresearch-api.herokuapp.com" \
     ENVIRONMENT="production"
   ```
6. Deploy: `git push heroku main`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | JWT secret (auto-generated) |
| `FRONTEND_URL` | Frontend URL for CORS |
| `BACKEND_URL` | Your Heroku app URL |
| `DATABASE_URL` | Auto-set by Heroku PostgreSQL |

## Frontend

Deploy the frontend separately to Heroku or use a static hosting service like Netlify/Vercel.

## Logs

View logs: `heroku logs --tail`
