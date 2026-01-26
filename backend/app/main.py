"""Main FastAPI application for EduResearch Project Manager.

This module sets up the FastAPI application with all routes, middleware, and configuration.
"""

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from starlette.middleware.sessions import SessionMiddleware

from app.core.init import run_startup_init
from app.middleware import TenantMiddleware
from app.api.routes import (
    auth_router,
    users_router,
    institutions_router,
    departments_router,
    projects_router,
    tasks_router,
    join_requests_router,
    files_router,
    admin_router,
    keywords_router,
    reports_router,
    analytics_router,
    timetracking_router,
    enterprise_router,
    platform_admin_router,
)
from app.config import settings

# Note: Database tables are created via Alembic migrations
# Run: alembic upgrade head


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup/shutdown events."""
    # Startup
    run_startup_init()
    yield
    # Shutdown (nothing needed)


app = FastAPI(
    title="EduResearch Project Manager API",
    description="API for managing research projects and collaboration",
    version="2.0.0",
    redirect_slashes=False,  # Prevent 307 redirects that drop auth headers on mobile
    lifespan=lifespan,
)

# Session middleware for OAuth
app.add_middleware(SessionMiddleware, secret_key=settings.secret_key)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tenant resolution middleware
app.add_middleware(TenantMiddleware)

# Auth routes
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])

# User routes (for admin user management)
app.include_router(users_router, prefix="/api/users", tags=["Users"])

# Institution routes
app.include_router(
    institutions_router, prefix="/api/institutions", tags=["Institutions"]
)

# Department routes
app.include_router(departments_router, prefix="/api/departments", tags=["Departments"])

# Project routes
app.include_router(projects_router, prefix="/api/projects", tags=["Projects"])

# Task routes
app.include_router(tasks_router, prefix="/api/tasks", tags=["Tasks"])

# Join request routes
app.include_router(
    join_requests_router, prefix="/api/join-requests", tags=["Join Requests"]
)

# File routes
app.include_router(files_router, prefix="/api/files", tags=["Files"])

# Admin routes (includes admin/users and admin/settings)
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])

# Keywords routes
app.include_router(keywords_router, prefix="/api/keywords", tags=["Keywords"])

# Reports routes
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])

# Analytics routes
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])

# Time tracking routes
app.include_router(
    timetracking_router, prefix="/api/time-entries", tags=["Time Tracking"]
)

# Enterprise routes
app.include_router(
    enterprise_router, prefix="/api/enterprise", tags=["Enterprise"]
)

# Platform Admin routes
app.include_router(
    platform_admin_router, prefix="/api/platform", tags=["Platform Admin"]
)


@app.get("/")
def root():
    """Root endpoint returning API information."""
    return {
        "message": "EduResearch Project Manager API",
        "version": "2.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health_check(detailed: bool = False, db: Session = Depends(get_db)):
    """Health check endpoint."""
    response = {"status": "healthy"}

    if detailed:
        # Check database
        try:
            db.execute(text("SELECT 1"))
            response["database"] = {"status": "connected"}
        except Exception as e:
            response["database"] = {"status": "error", "error": str(e)}
            response["status"] = "degraded"

        # Check email config
        from app.config import settings
        response["email"] = {
            "configured": bool(settings.smtp_user),
        }

    return response
