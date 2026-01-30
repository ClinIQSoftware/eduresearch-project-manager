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

# Sentinel to distinguish hosting domains from localhost in _extract_subdomain
_HOSTING_DOMAIN = "__hosting__"


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

        # Handle hosting domains (onrender.com, etc.) — resolve tenant from JWT
        if subdomain == _HOSTING_DOMAIN:
            return await self._dispatch_hosting_domain(request, call_next)

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
        enterprise = await self._get_enterprise_by_slug(subdomain)
        if not enterprise:
            # No enterprise found — allow request through without tenant context
            # (needed for first-time registration when no enterprises exist yet)
            request.state.is_platform_admin = False
            request.state.enterprise_id = None
            request.state.enterprise = None
            return await call_next(request)

        if not enterprise.is_active:
            raise HTTPException(status_code=403, detail="Enterprise is disabled")

        return await self._dispatch_with_tenant(request, call_next, enterprise)

    async def _dispatch_hosting_domain(self, request: Request, call_next):
        """Resolve tenant from JWT token for hosting domain requests.

        On shared hosting domains (e.g. onrender.com), there's no subdomain
        to identify the enterprise. Instead, extract enterprise_id from the
        JWT token in the Authorization header.
        """
        enterprise_id = self._extract_enterprise_from_jwt(request)
        if enterprise_id:
            enterprise = await self._get_enterprise_by_id(enterprise_id)
            if enterprise and enterprise.is_active:
                return await self._dispatch_with_tenant(request, call_next, enterprise)

        # No JWT enterprise or enterprise not found — proceed without tenant context
        request.state.is_platform_admin = False
        request.state.enterprise_id = None
        request.state.enterprise = None
        return await call_next(request)

    async def _dispatch_with_tenant(self, request: Request, call_next, enterprise):
        """Dispatch request with tenant context set."""
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
        for hosting_domain in HOSTING_DOMAINS:
            if host.endswith(f".{hosting_domain}"):
                return _HOSTING_DOMAIN

        # Extract first part of domain
        parts = host.split(".")
        if len(parts) >= 3:
            return parts[0]

        return ""

    def _extract_enterprise_from_jwt(self, request: Request) -> Optional[UUID]:
        """Extract enterprise_id from JWT Authorization header."""
        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        token = auth_header[7:]
        try:
            from app.core.security import decode_token
            payload = decode_token(token)
            if payload and payload.get("enterprise_id"):
                return UUID(payload["enterprise_id"])
        except (ValueError, TypeError):
            pass
        return None

    async def _get_enterprise_by_slug(self, slug: str) -> Optional[Enterprise]:
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

    async def _get_enterprise_by_id(self, enterprise_id: UUID) -> Optional[Enterprise]:
        """Lookup enterprise by ID."""
        db = SessionLocal()
        try:
            result = db.execute(
                select(Enterprise).where(Enterprise.id == enterprise_id)
            )
            return result.scalar_one_or_none()
        finally:
            db.close()
