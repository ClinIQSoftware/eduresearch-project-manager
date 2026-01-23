# Local Docker VM Deployment Workflow

## Status: Waiting for Docker Desktop to fully initialize

After restarting, continue from Step 2.

---

## Step 1: Docker Desktop Setup (COMPLETED)
- Docker Desktop installed
- Need to restart system or wait for Docker to fully initialize

## Step 2: Verify Docker is Running
Open PowerShell and run:
```powershell
docker ps
```
If this returns without error (even if empty), Docker is ready.

## Step 3: Deploy the Application
Navigate to the project directory and run:
```powershell
cd "E:\Dropbox\Professional - Business\Apps\Education and research log and team\eduresearch-project-manager"
docker compose -f docker-compose.local.yml up --build -d
```

This will:
- Build the backend (FastAPI + Python)
- Build the frontend (React + Nginx)
- Start PostgreSQL database
- Run database migrations automatically

## Step 4: Verify Deployment
Check container status:
```powershell
docker compose -f docker-compose.local.yml ps
```

View logs if needed:
```powershell
docker compose -f docker-compose.local.yml logs -f
```

## Step 5: Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs
- **Database**: localhost:5433 (user: postgres, password: postgres, db: eduresearch)

## Useful Commands

### Stop the application:
```powershell
docker compose -f docker-compose.local.yml down
```

### Stop and remove all data (clean restart):
```powershell
docker compose -f docker-compose.local.yml down -v
```

### Rebuild after code changes:
```powershell
docker compose -f docker-compose.local.yml up --build -d
```

### View specific service logs:
```powershell
docker compose -f docker-compose.local.yml logs -f backend
docker compose -f docker-compose.local.yml logs -f frontend
docker compose -f docker-compose.local.yml logs -f db
```

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │     │     Backend     │     │   PostgreSQL    │
│  (React/Nginx)  │────▶│    (FastAPI)    │────▶│    Database     │
│   Port: 3000    │     │   Port: 8001    │     │   Port: 5433    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Troubleshooting

### Docker not responding
- Restart Docker Desktop from system tray
- Or restart Windows

### Port already in use
- Check what's using the port: `netstat -ano | findstr :3000`
- Kill the process or change ports in docker-compose.local.yml

### Database connection issues
- Wait for db container to be healthy: `docker compose -f docker-compose.local.yml ps`
- Check db logs: `docker compose -f docker-compose.local.yml logs db`

### Backend won't start
- Check logs: `docker compose -f docker-compose.local.yml logs backend`
- Verify migrations: `docker compose -f docker-compose.local.yml exec backend alembic current`
