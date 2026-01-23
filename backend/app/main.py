"""Main FastAPI application for EduResearch Project Manager.

This module sets up the FastAPI application with all routes, middleware, and configuration.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

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
)
from app.config import settings

# Note: Database tables are created via Alembic migrations
# Run: alembic upgrade head

app = FastAPI(
    title="EduResearch Project Manager API",
    description="API for managing research projects and collaboration",
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
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])

# User routes (for admin user management)
app.include_router(users_router, prefix="/api/users", tags=["Users"])

# Institution routes
app.include_router(institutions_router, prefix="/api/institutions", tags=["Institutions"])

# Department routes
app.include_router(departments_router, prefix="/api/departments", tags=["Departments"])

# Project routes
app.include_router(projects_router, prefix="/api/projects", tags=["Projects"])

# Task routes
app.include_router(tasks_router, prefix="/api/tasks", tags=["Tasks"])

# Join request routes
app.include_router(join_requests_router, prefix="/api/join-requests", tags=["Join Requests"])

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
app.include_router(timetracking_router, prefix="/api/time-entries", tags=["Time Tracking"])


@app.get("/")
def root():
    """Root endpoint returning API information."""
    return {
        "message": "EduResearch Project Manager API",
        "version": "2.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
