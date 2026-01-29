"""Tenant resolution middleware for multi-tenancy."""

import contextvars
import logging
import re
from typing import Optional
from uuid import UUID

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.config import settings
from app.models.enterprise import Enterprise

logger = logging.getLogger(__name__)

# Context variable to track whether the current request is tenant-scoped.
# Used by get_db() to warn when unscoped DB access is used in a tenant context.
tenant_context_var: contextvars.ContextVar[Optional[UUID]] = contextvars.ContextVar(
    "tenant_context_var", default=None
)

SLUG_PATTERN = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")
RESERVED_SLUGS = {"admin", "api", "www", "app", "static", "assets"}

# Known hosting provider domains where subdomain is NOT an enterprise slug
HOSTING_DOMAINS = {"onrender.com", "render.com", "herokuapp.com", "railway.app"}

# Paths that bypass tenant resolution (auth, platform admin, health, registration, docs)
TENANT_EXEMPT_PATHS = (
    "/health",
    "/api/auth/",
    "/api/platform/",
    "/api/register",
    "/api/institutions",
    "/api/enterprise/branding",
    "/api/invite-codes/validate",
    "/docs",
    "/openapi.json",
    "/redoc",
)


class TenantMiddleware(BaseHTTPMiddleware):
    """Middleware to resolve tenant from subdomain."""

    async def dispatch(self, request: Request, call_next):
        # Skip tenant resolution for exempt paths (auth, platform, health, etc.)
        path = request.url.path
        if any(path.startswith(p) for p in TENANT_EXEMPT_PATHS):
            request.state.is_platform_admin = False
            request.state.enterprise_id = None
            request.state.enterprise = None
            return await call_next(request)

        # Extract subdomain from host
        host = request.headers.get("host", "localhost")
        subdomain = self._extract_subdomain(host)

        # Handle platform admin header — only allowed in development
        if request.headers.get("X-Platform-Admin") == "true":
            if not settings.is_production:
                request.state.is_platform_admin = True
                request.state.enterprise_id = None
                request.state.enterprise = None
                return await call_next(request)
            # In production, ignore the header (fall through to normal flow)

        # Handle platform admin
        if subdomain == "admin":
            request.state.is_platform_admin = True
            request.state.enterprise_id = None
            request.state.enterprise = None
            return await call_next(request)

        # Handle localhost/development
        if subdomain in ("localhost", "127", ""):
            # Use default enterprise or header override for dev
            dev_enterprise = request.headers.get("X-Enterprise-Slug", "default")
            subdomain = dev_enterprise

        # Validate subdomain format
        if not SLUG_PATTERN.match(subdomain):
            raise HTTPException(status_code=400, detail="Invalid subdomain format")

        if subdomain in RESERVED_SLUGS:
            raise HTTPException(status_code=400, detail="Reserved subdomain")

        # Lookup enterprise
        enterprise = await self._get_enterprise(subdomain)
        if not enterprise:
            # No enterprise found — allow request through without tenant context
            # (needed for first-time registration when no enterprises exist yet)
            request.state.is_platform_admin = False
            request.state.enterprise_id = None
            request.state.enterprise = None
            return await call_next(request)

        if not enterprise.is_active:
            raise HTTPException(status_code=403, detail="Enterprise is disabled")

        # Set request state
        request.state.is_platform_admin = False
        request.state.enterprise_id = enterprise.id
        request.state.enterprise = enterprise

        # Set context variable so get_db() can detect tenant-scoped requests
        token = tenant_context_var.set(enterprise.id)
        try:
            return await call_next(request)
        finally:
            tenant_context_var.reset(token)

    def _extract_subdomain(self, host: str) -> str:
        """Extract subdomain from host header."""
        # Remove port if present
        host = host.split(":")[0]

        # Handle localhost
        if host in ("localhost", "127.0.0.1"):
            return "localhost"

        # Check if this is a known hosting provider domain
        # e.g., eduresearch-backend.onrender.com -> treat as localhost (use default)
        for hosting_domain in HOSTING_DOMAINS:
            if host.endswith(f".{hosting_domain}"):
                return "localhost"

        # Extract first part of domain
        parts = host.split(".")
        if len(parts) >= 3:
            return parts[0]

        return ""

    async def _get_enterprise(self, slug: str) -> Optional[Enterprise]:
        """Lookup enterprise by slug."""
        # TODO: Add Redis caching here
        db = SessionLocal()
        try:
            result = db.execute(
                select(Enterprise).where(Enterprise.slug == slug)
            )
            return result.scalar_one_or_none()
        finally:
            db.close()
