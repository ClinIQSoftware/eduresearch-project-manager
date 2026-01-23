"""Route exports for EduResearch Project Manager API.

This module exports all routers for use in the main application.
"""

from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.institutions import router as institutions_router
from app.api.routes.departments import router as departments_router
from app.api.routes.projects import router as projects_router
from app.api.routes.tasks import router as tasks_router
from app.api.routes.join_requests import router as join_requests_router
from app.api.routes.files import router as files_router
from app.api.routes.admin import router as admin_router
from app.api.routes.keywords import router as keywords_router
from app.api.routes.reports import router as reports_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.timetracking import router as timetracking_router
from app.api.routes.notifications import router as notifications_router

__all__ = [
    "auth_router",
    "users_router",
    "institutions_router",
    "departments_router",
    "projects_router",
    "tasks_router",
    "join_requests_router",
    "files_router",
    "admin_router",
    "keywords_router",
    "reports_router",
    "analytics_router",
    "timetracking_router",
    "notifications_router",
]
