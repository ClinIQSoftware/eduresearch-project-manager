# EduResearch Project Manager

A collaborative research project management platform for educational institutions. Track projects, manage team collaboration, handle join requests, and organize research activities.

## Features

- **Project Management**: Create and manage research projects with classification (education, research, quality improvement, administrative) and status tracking (preparation, recruitment, analysis, writing)
- **Team Collaboration**: Project leads can manage members, approve join requests, and coordinate activities
- **Authentication**: Local accounts, Google OAuth, and Microsoft OAuth support
- **File Management**: Upload and share project files with automatic email notifications to leads
- **Reports**: View projects by lead, leads by projects, and user involvement summaries
- **Admin Dashboard**: Superuser access to manage users and system settings
- **Email Notifications**: Automated emails for project updates, join requests, and file uploads

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Python 3.11 + FastAPI + SQLAlchemy
- **Database**: PostgreSQL
- **Authentication**: JWT + OAuth 2.0

---

## One-Click Deploy

Deploy instantly to your preferred platform:

| Platform | Deploy | Docs |
|----------|--------|------|
| **Render** | [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR_ORG/eduresearch-project-manager) | [Guide](deploy/render/) |
| **Railway** | [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template) | [Guide](deploy/railway/) |
| **Heroku** | [![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/YOUR_ORG/eduresearch-project-manager) | [Guide](deploy/heroku/) |
| **Fly.io** | `flyctl launch` | [Guide](deploy/flyio/) |

### Self-Hosted Options

| Platform | Command | Docs |
|----------|---------|------|
| **Docker Compose** | `docker-compose -f deploy/docker/docker-compose.prod.yml up` | [Guide](deploy/docker/) |
| **Kubernetes** | `kubectl apply -k deploy/k8s/` | [Guide](deploy/k8s/) |
| **AWS** | CloudFormation template | [Guide](deploy/aws/) |
| **GCP** | Cloud Run + Cloud SQL | [Guide](deploy/gcp/) |
| **Azure** | Container Apps + PostgreSQL | [Guide](deploy/azure/) |

> See the [`deploy/`](deploy/) directory for detailed configuration guides for each platform.

---

## Quick Start (Local Development)

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/eduresearch-project-manager.git
cd eduresearch-project-manager
```

### 2. Start the Database

Using Docker (recommended):
```bash
docker-compose up -d
```

Or use an existing PostgreSQL instance.

### 3. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your database URL if needed

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload
```

Backend will be running at http://localhost:8000

### 4. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be running at http://localhost:5173

### 5. Create First User

1. Open http://localhost:5173
2. Click "Register" to create an account
3. Login with your credentials

To make a user a superuser (admin), run:
```bash
cd backend
python -c "
from app.database import SessionLocal
from app.models import User
db = SessionLocal()
user = db.query(User).filter(User.email == 'your-email@example.com').first()
user.is_superuser = True
db.commit()
print('User is now a superuser')
"
```

---

## Deployment on Render

### Option 1: One-Click Deploy (Blueprint)

1. Fork this repository to your GitHub account
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New" > "Blueprint"
4. Connect your GitHub repository
5. Render will auto-detect the `render.yaml` and create:
   - PostgreSQL database
   - Backend web service
   - Frontend static site
6. After deployment, configure environment variables:
   - `FRONTEND_URL`: Your frontend URL (e.g., `https://eduresearch-frontend.onrender.com`)
   - `BACKEND_URL`: Your backend URL (e.g., `https://eduresearch-api.onrender.com`)
   - `VITE_API_URL`: Backend API URL (e.g., `https://eduresearch-api.onrender.com/api`)

### Option 2: Manual Deployment

#### Deploy Database

1. Go to Render Dashboard > New > PostgreSQL
2. Create a free PostgreSQL database
3. Copy the Internal Database URL

#### Deploy Backend

1. Go to Render Dashboard > New > Web Service
2. Connect your repository
3. Configure:
   - **Name**: eduresearch-api
   - **Root Directory**: backend
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `alembic upgrade head && gunicorn app.main:app --bind 0.0.0.0:$PORT --workers 4 --worker-class uvicorn.workers.UvicornWorker`
4. Add environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `SECRET_KEY`: Generate a secure random string
   - `ENVIRONMENT`: `production`
   - `FRONTEND_URL`: Your frontend URL
   - `BACKEND_URL`: Your backend URL

#### Deploy Frontend

1. Go to Render Dashboard > New > Static Site
2. Connect your repository
3. Configure:
   - **Name**: eduresearch-frontend
   - **Root Directory**: frontend
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add environment variable:
   - `VITE_API_URL`: Your backend API URL (e.g., `https://eduresearch-api.onrender.com/api`)
5. Add rewrite rule for SPA routing:
   - Source: `/*`
   - Destination: `/index.html`

---

## Environment Variables

### Backend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `SECRET_KEY` | Yes | - | JWT signing key (generate securely for production) |
| `ENVIRONMENT` | No | development | Environment mode |
| `FRONTEND_URL` | Yes (prod) | http://localhost:5173 | Frontend URL for CORS |
| `BACKEND_URL` | Yes (prod) | http://localhost:8000 | Backend URL for OAuth callbacks |
| `GOOGLE_CLIENT_ID` | No | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | - | Google OAuth client secret |
| `MICROSOFT_CLIENT_ID` | No | - | Microsoft OAuth client ID |
| `MICROSOFT_CLIENT_SECRET` | No | - | Microsoft OAuth client secret |
| `SMTP_HOST` | No | smtp.gmail.com | SMTP server host |
| `SMTP_PORT` | No | 587 | SMTP server port |
| `SMTP_USER` | No | - | SMTP username |
| `SMTP_PASSWORD` | No | - | SMTP password (app password for Gmail) |
| `FROM_EMAIL` | No | - | Sender email address |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes (prod) | Backend API base URL |

---

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | Login with email/password |
| `GET /api/projects` | List all projects |
| `POST /api/projects` | Create new project |
| `POST /api/join-requests` | Request to join a project |
| `GET /api/reports/projects-with-leads` | Report: Projects with leads |
| `GET /api/admin/users` | List all users (admin only) |

---

## Project Structure

```
eduresearch-project-manager/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # API endpoints
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   ├── config.py        # Settings
│   │   ├── database.py      # Database connection
│   │   ├── dependencies.py  # Auth dependencies
│   │   └── main.py          # FastAPI app
│   ├── alembic/             # Database migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── start.sh
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client
│   │   └── types/           # TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── deploy/
│   ├── render/              # Render blueprint
│   ├── railway/             # Railway config
│   ├── flyio/               # Fly.io config
│   ├── heroku/              # Heroku config
│   ├── docker/              # Docker Compose production
│   ├── k8s/                 # Kubernetes manifests
│   ├── aws/                 # AWS CloudFormation
│   ├── gcp/                 # GCP Cloud Run
│   └── azure/               # Azure Container Apps
├── .github/workflows/       # CI/CD pipelines
├── docker-compose.yml       # Local development
├── render.yaml              # Render deployment
└── README.md
```

---

## Database Migrations

Create a new migration:
```bash
cd backend
alembic revision --autogenerate -m "Description of changes"
```

Apply migrations:
```bash
alembic upgrade head
```

Rollback one migration:
```bash
alembic downgrade -1
```

---

## OAuth Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `{BACKEND_URL}/api/auth/google/callback`
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables

### Microsoft OAuth

1. Go to [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps)
2. Register a new application
3. Add redirect URI: `{BACKEND_URL}/api/auth/microsoft/callback`
4. Set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and `MICROSOFT_TENANT_ID` environment variables

---

## Email Setup (Gmail)

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Set environment variables:
   - `SMTP_USER`: your-email@gmail.com
   - `SMTP_PASSWORD`: your-app-password
   - `FROM_EMAIL`: your-email@gmail.com

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a pull request

---

## License

MIT License - see LICENSE file for details.
