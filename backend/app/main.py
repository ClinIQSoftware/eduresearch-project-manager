from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.api.routes import (
    auth, institutions, departments, projects, tasks, timetracking,
    analytics, join_requests, files, reports, admin
)
from app.config import settings

# Note: Database tables are created via Alembic migrations
# Run: alembic upgrade head

app = FastAPI(
    title="EduResearch Project Manager API",
    description="API for managing research projects, collaboration, and time tracking",
    version="2.0.0",
    redirect_slashes=False  # Prevent 307 redirects that drop auth headers on mobile
)

# Session middleware for OAuth
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])

# Institution routes
app.include_router(institutions.router, prefix="/api/institutions", tags=["Institutions"])

# Department routes
app.include_router(departments.router, prefix="/api/departments", tags=["Departments"])

# Project routes
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])

# Join request routes
app.include_router(join_requests.router, prefix="/api/join-requests", tags=["Join Requests"])

# File routes
app.include_router(files.router, prefix="/api", tags=["Files"])

# Reports routes
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])

# Admin routes
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

# Task routes (existing)
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])

# Time tracking routes (existing)
app.include_router(timetracking.router, prefix="/api/time-entries", tags=["Time Tracking"])

# Analytics routes (existing)
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


@app.get("/")
def root():
    return {
        "message": "EduResearch Project Manager API",
        "version": "2.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
