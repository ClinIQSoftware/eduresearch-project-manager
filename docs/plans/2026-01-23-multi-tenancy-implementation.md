# Multi-Tenancy (Enterprise) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add enterprise-level multi-tenancy with Row-Level Security so multiple organizations can use the platform with complete data isolation.

**Architecture:** PostgreSQL RLS with `enterprise_id` on all tenant tables. Subdomain-based tenant identification via FastAPI middleware. Platform admin dashboard at `admin.` subdomain.

**Tech Stack:** PostgreSQL RLS, FastAPI middleware, SQLAlchemy 2.0, Alembic migrations, React context for branding

---

## Task 1: Create Enterprise Model

**Files:**
- Create: `backend/app/models/enterprise.py`
- Modify: `backend/app/models/__init__.py`

**Step 1: Create the Enterprise model**

```python
# backend/app/models/enterprise.py
"""Enterprise model for multi-tenancy."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
import uuid

from sqlalchemy import Boolean, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base

if TYPE_CHECKING:
    from app.models.enterprise_config import EnterpriseConfig


class Enterprise(Base):
    """Represents a tenant enterprise."""

    __tablename__ = "enterprises"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(
        String(63), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        onupdate=func.now(), nullable=True
    )

    # Relationships
    config: Mapped[Optional["EnterpriseConfig"]] = relationship(
        "EnterpriseConfig", back_populates="enterprise", uselist=False,
        cascade="all, delete-orphan"
    )
```

**Step 2: Register the model in __init__.py**

Add to `backend/app/models/__init__.py`:

```python
from app.models.enterprise import Enterprise
```

And add `"Enterprise"` to the `__all__` list.

**Step 3: Commit**

```bash
git add backend/app/models/enterprise.py backend/app/models/__init__.py
git commit -m "feat: add Enterprise model for multi-tenancy"
```

---

## Task 2: Create EnterpriseConfig Model

**Files:**
- Create: `backend/app/models/enterprise_config.py`
- Modify: `backend/app/models/__init__.py`

**Step 1: Create the EnterpriseConfig model**

```python
# backend/app/models/enterprise_config.py
"""Enterprise configuration model for per-tenant settings."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, LargeBinary
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base

if TYPE_CHECKING:
    from app.models.enterprise import Enterprise


class EnterpriseConfig(Base):
    """Per-enterprise configuration for OAuth, SMTP, and branding."""

    __tablename__ = "enterprise_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    # OAuth/SSO Settings
    google_oauth_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    google_client_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    google_client_secret_encrypted: Mapped[Optional[bytes]] = mapped_column(
        LargeBinary, nullable=True
    )
    microsoft_oauth_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    microsoft_client_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    microsoft_client_secret_encrypted: Mapped[Optional[bytes]] = mapped_column(
        LargeBinary, nullable=True
    )
    saml_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    saml_metadata_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # SMTP Settings
    smtp_host: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_port: Mapped[int] = mapped_column(Integer, default=587)
    smtp_user: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_password_encrypted: Mapped[Optional[bytes]] = mapped_column(
        LargeBinary, nullable=True
    )
    smtp_from_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_from_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Branding
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[str] = mapped_column(String(7), default="#3B82F6")
    favicon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    custom_css: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Feature Flags
    features: Mapped[dict] = mapped_column(JSONB, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        onupdate=func.now(), nullable=True
    )

    # Relationships
    enterprise: Mapped["Enterprise"] = relationship(
        "Enterprise", back_populates="config"
    )
```

**Step 2: Register the model in __init__.py**

Add to `backend/app/models/__init__.py`:

```python
from app.models.enterprise_config import EnterpriseConfig
```

And add `"EnterpriseConfig"` to the `__all__` list.

**Step 3: Commit**

```bash
git add backend/app/models/enterprise_config.py backend/app/models/__init__.py
git commit -m "feat: add EnterpriseConfig model for per-tenant settings"
```

---

## Task 3: Create Alembic Migration for Enterprise Tables

**Files:**
- Create: `backend/alembic/versions/014_add_enterprise_tables.py`

**Step 1: Create the migration file**

```python
# backend/alembic/versions/014_add_enterprise_tables.py
"""Add enterprise tables for multi-tenancy.

Revision ID: 014
Revises: 013
Create Date: 2026-01-23
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enterprises table
    op.create_table(
        "enterprises",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(63), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    # Create enterprise_configs table
    op.create_table(
        "enterprise_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "enterprise_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("enterprises.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
        # OAuth
        sa.Column("google_oauth_enabled", sa.Boolean(), default=False),
        sa.Column("google_client_id", sa.String(255), nullable=True),
        sa.Column("google_client_secret_encrypted", sa.LargeBinary(), nullable=True),
        sa.Column("microsoft_oauth_enabled", sa.Boolean(), default=False),
        sa.Column("microsoft_client_id", sa.String(255), nullable=True),
        sa.Column("microsoft_client_secret_encrypted", sa.LargeBinary(), nullable=True),
        sa.Column("saml_enabled", sa.Boolean(), default=False),
        sa.Column("saml_metadata_url", sa.String(500), nullable=True),
        # SMTP
        sa.Column("smtp_host", sa.String(255), nullable=True),
        sa.Column("smtp_port", sa.Integer(), default=587),
        sa.Column("smtp_user", sa.String(255), nullable=True),
        sa.Column("smtp_password_encrypted", sa.LargeBinary(), nullable=True),
        sa.Column("smtp_from_email", sa.String(255), nullable=True),
        sa.Column("smtp_from_name", sa.String(255), nullable=True),
        # Branding
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("primary_color", sa.String(7), default="#3B82F6"),
        sa.Column("favicon_url", sa.String(500), nullable=True),
        sa.Column("custom_css", sa.Text(), nullable=True),
        # Features
        sa.Column("features", postgresql.JSONB(), default={}),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("enterprise_configs")
    op.drop_table("enterprises")
```

**Step 2: Commit**

```bash
git add backend/alembic/versions/014_add_enterprise_tables.py
git commit -m "feat: add migration for enterprise tables"
```

---

## Task 4: Add enterprise_id to All Tenant Models

**Files:**
- Modify: `backend/app/models/user.py`
- Modify: `backend/app/models/institution.py`
- Modify: `backend/app/models/department.py`
- Modify: `backend/app/models/project.py`
- Modify: `backend/app/models/task.py`
- Modify: `backend/app/models/project_member.py`
- Modify: `backend/app/models/project_file.py`
- Modify: `backend/app/models/join_request.py`
- Modify: `backend/app/models/email_settings.py`
- Modify: `backend/app/models/email_template.py`
- Modify: `backend/app/models/system_settings.py`
- Modify: `backend/app/models/user_keyword.py`
- Modify: `backend/app/models/user_alert_preference.py`

**Step 1: Add enterprise_id to User model**

Add import at top of `backend/app/models/user.py`:
```python
import uuid
from sqlalchemy.dialects.postgresql import UUID
```

Add after `department_id` field (around line 72):
```python
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
```

**Step 2: Repeat for all other models**

Add the same `enterprise_id` field to:
- `institution.py` - after `description` field
- `department.py` - after `institution_id` field
- `project.py` - after `lead_id` field
- `task.py` - after `project_id` field
- `project_member.py` - after `role` field
- `project_file.py` - after `content_type` field
- `join_request.py` - after `status` field
- `email_settings.py` - after `institution_id` field (make nullable for now)
- `email_template.py` - after `institution_id` field (make nullable for now)
- `system_settings.py` - after `institution_id` field (make nullable for now)
- `user_keyword.py` - after `user_id` field
- `user_alert_preference.py` - after `user_id` field

**Step 3: Commit**

```bash
git add backend/app/models/*.py
git commit -m "feat: add enterprise_id to all tenant models"
```

---

## Task 5: Create Migration to Add enterprise_id Columns

**Files:**
- Create: `backend/alembic/versions/015_add_enterprise_id_to_tables.py`

**Step 1: Create the migration**

```python
# backend/alembic/versions/015_add_enterprise_id_to_tables.py
"""Add enterprise_id to all tenant tables.

Revision ID: 015
Revises: 014
Create Date: 2026-01-23
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Default enterprise UUID for backfill
DEFAULT_ENTERPRISE_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

# Tables that need enterprise_id
TENANT_TABLES = [
    "users",
    "institutions",
    "departments",
    "projects",
    "tasks",
    "project_members",
    "project_files",
    "join_requests",
    "user_keywords",
    "user_alert_preferences",
]

# Tables with optional enterprise_id (already have institution_id)
OPTIONAL_TABLES = [
    "email_settings",
    "email_templates",
    "system_settings",
]


def upgrade() -> None:
    # Create default enterprise for existing data
    op.execute(
        f"""
        INSERT INTO enterprises (id, slug, name, is_active)
        VALUES ('{DEFAULT_ENTERPRISE_ID}', 'default', 'Default Enterprise', true)
        ON CONFLICT (id) DO NOTHING
        """
    )

    # Add enterprise_id to tenant tables (nullable first)
    for table in TENANT_TABLES:
        op.add_column(
            table,
            sa.Column("enterprise_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
        # Backfill existing data
        op.execute(f"UPDATE {table} SET enterprise_id = '{DEFAULT_ENTERPRISE_ID}'")
        # Make NOT NULL
        op.alter_column(table, "enterprise_id", nullable=False)
        # Add index
        op.create_index(f"ix_{table}_enterprise_id", table, ["enterprise_id"])
        # Add foreign key
        op.create_foreign_key(
            f"fk_{table}_enterprise_id",
            table,
            "enterprises",
            ["enterprise_id"],
            ["id"],
            ondelete="CASCADE",
        )

    # Add optional enterprise_id to settings tables
    for table in OPTIONAL_TABLES:
        op.add_column(
            table,
            sa.Column("enterprise_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
        op.create_index(f"ix_{table}_enterprise_id", table, ["enterprise_id"])


def downgrade() -> None:
    # Remove from optional tables
    for table in OPTIONAL_TABLES:
        op.drop_index(f"ix_{table}_enterprise_id", table_name=table)
        op.drop_column(table, "enterprise_id")

    # Remove from tenant tables
    for table in TENANT_TABLES:
        op.drop_constraint(f"fk_{table}_enterprise_id", table, type_="foreignkey")
        op.drop_index(f"ix_{table}_enterprise_id", table_name=table)
        op.drop_column(table, "enterprise_id")

    # Remove default enterprise
    op.execute(f"DELETE FROM enterprises WHERE id = '{DEFAULT_ENTERPRISE_ID}'")
```

**Step 2: Commit**

```bash
git add backend/alembic/versions/015_add_enterprise_id_to_tables.py
git commit -m "feat: add migration for enterprise_id on all tables"
```

---

## Task 6: Create Enterprise Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/enterprise.py`
- Modify: `backend/app/schemas/__init__.py`

**Step 1: Create the schemas**

```python
# backend/app/schemas/enterprise.py
"""Pydantic schemas for Enterprise and EnterpriseConfig."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# Enterprise schemas
class EnterpriseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=63, pattern=r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")


class EnterpriseCreate(EnterpriseBase):
    pass


class EnterpriseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    is_active: Optional[bool] = None


class EnterpriseResponse(EnterpriseBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EnterpriseListResponse(BaseModel):
    enterprises: list[EnterpriseResponse]
    total: int


# EnterpriseConfig schemas
class EnterpriseBrandingUpdate(BaseModel):
    logo_url: Optional[str] = Field(None, max_length=500)
    primary_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    favicon_url: Optional[str] = Field(None, max_length=500)
    custom_css: Optional[str] = None


class EnterpriseSmtpUpdate(BaseModel):
    smtp_host: Optional[str] = Field(None, max_length=255)
    smtp_port: Optional[int] = Field(None, ge=1, le=65535)
    smtp_user: Optional[str] = Field(None, max_length=255)
    smtp_password: Optional[str] = None  # Plain text, will be encrypted
    smtp_from_email: Optional[str] = Field(None, max_length=255)
    smtp_from_name: Optional[str] = Field(None, max_length=255)


class EnterpriseOAuthUpdate(BaseModel):
    google_oauth_enabled: Optional[bool] = None
    google_client_id: Optional[str] = Field(None, max_length=255)
    google_client_secret: Optional[str] = None  # Plain text, will be encrypted
    microsoft_oauth_enabled: Optional[bool] = None
    microsoft_client_id: Optional[str] = Field(None, max_length=255)
    microsoft_client_secret: Optional[str] = None  # Plain text, will be encrypted


class EnterpriseConfigResponse(BaseModel):
    # OAuth (secrets hidden)
    google_oauth_enabled: bool
    google_client_id: Optional[str] = None
    microsoft_oauth_enabled: bool
    microsoft_client_id: Optional[str] = None
    saml_enabled: bool
    saml_metadata_url: Optional[str] = None
    # SMTP (password hidden)
    smtp_host: Optional[str] = None
    smtp_port: int
    smtp_user: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    # Branding
    logo_url: Optional[str] = None
    primary_color: str
    favicon_url: Optional[str] = None
    # Features
    features: dict

    class Config:
        from_attributes = True


# Public branding (for unauthenticated requests)
class EnterpriseBrandingResponse(BaseModel):
    enterprise_name: str
    logo_url: Optional[str] = None
    primary_color: str
    favicon_url: Optional[str] = None
```

**Step 2: Register in __init__.py**

Add to `backend/app/schemas/__init__.py`:

```python
from app.schemas.enterprise import (
    EnterpriseBase,
    EnterpriseCreate,
    EnterpriseUpdate,
    EnterpriseResponse,
    EnterpriseListResponse,
    EnterpriseBrandingUpdate,
    EnterpriseSmtpUpdate,
    EnterpriseOAuthUpdate,
    EnterpriseConfigResponse,
    EnterpriseBrandingResponse,
)
```

**Step 3: Commit**

```bash
git add backend/app/schemas/enterprise.py backend/app/schemas/__init__.py
git commit -m "feat: add Enterprise pydantic schemas"
```

---

## Task 7: Create Tenant Middleware

**Files:**
- Create: `backend/app/middleware/__init__.py`
- Create: `backend/app/middleware/tenant.py`

**Step 1: Create middleware package**

```python
# backend/app/middleware/__init__.py
"""Middleware package."""

from app.middleware.tenant import TenantMiddleware

__all__ = ["TenantMiddleware"]
```

**Step 2: Create tenant middleware**

```python
# backend/app/middleware/tenant.py
"""Tenant resolution middleware for multi-tenancy."""

import re
from typing import Optional
from uuid import UUID

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.enterprise import Enterprise

SLUG_PATTERN = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")
RESERVED_SLUGS = {"admin", "api", "www", "app", "static", "assets"}


class TenantMiddleware(BaseHTTPMiddleware):
    """Middleware to resolve tenant from subdomain."""

    async def dispatch(self, request: Request, call_next):
        # Extract subdomain from host
        host = request.headers.get("host", "localhost")
        subdomain = self._extract_subdomain(host)

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
            raise HTTPException(status_code=404, detail="Enterprise not found")

        if not enterprise.is_active:
            raise HTTPException(status_code=403, detail="Enterprise is disabled")

        # Set request state
        request.state.is_platform_admin = False
        request.state.enterprise_id = enterprise.id
        request.state.enterprise = enterprise

        return await call_next(request)

    def _extract_subdomain(self, host: str) -> str:
        """Extract subdomain from host header."""
        # Remove port if present
        host = host.split(":")[0]

        # Handle localhost
        if host in ("localhost", "127.0.0.1"):
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
```

**Step 3: Commit**

```bash
git add backend/app/middleware/__init__.py backend/app/middleware/tenant.py
git commit -m "feat: add tenant resolution middleware"
```

---

## Task 8: Update Database Session for RLS

**Files:**
- Modify: `backend/app/database.py`
- Modify: `backend/app/api/deps.py`

**Step 1: Update database.py**

Add at end of `backend/app/database.py`:

```python
from sqlalchemy import text
from fastapi import Request


def get_tenant_session(request: Request):
    """Get database session with tenant RLS context."""
    db = SessionLocal()
    try:
        if hasattr(request.state, "enterprise_id") and request.state.enterprise_id:
            db.execute(
                text(f"SET app.current_enterprise_id = '{request.state.enterprise_id}'")
            )
        yield db
    finally:
        db.close()


def get_platform_session():
    """Get database session without RLS context (for platform admin)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Step 2: Update deps.py**

Add to `backend/app/api/deps.py`:

```python
from app.database import get_tenant_session, get_platform_session


def get_tenant_db(request: Request) -> Session:
    """Dependency for tenant-scoped database access."""
    yield from get_tenant_session(request)


def get_platform_db() -> Session:
    """Dependency for platform admin database access (no RLS)."""
    yield from get_platform_session()


def get_current_enterprise_id(request: Request) -> UUID:
    """Get current enterprise ID from request state."""
    if not hasattr(request.state, "enterprise_id") or not request.state.enterprise_id:
        raise HTTPException(status_code=400, detail="Enterprise context required")
    return request.state.enterprise_id
```

**Step 3: Commit**

```bash
git add backend/app/database.py backend/app/api/deps.py
git commit -m "feat: add tenant-aware database sessions"
```

---

## Task 9: Register Middleware in FastAPI App

**Files:**
- Modify: `backend/app/main.py`

**Step 1: Add middleware import and registration**

Add import at top:
```python
from app.middleware import TenantMiddleware
```

Add after CORS middleware (around line 60):
```python
# Tenant resolution middleware
app.add_middleware(TenantMiddleware)
```

**Step 2: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: register tenant middleware in FastAPI app"
```

---

## Task 10: Create Enterprise API Routes

**Files:**
- Create: `backend/app/api/routes/enterprise.py`
- Modify: `backend/app/api/routes/__init__.py`
- Modify: `backend/app/main.py`

**Step 1: Create enterprise routes**

```python
# backend/app/api/routes/enterprise.py
"""Enterprise API routes."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.enterprise import Enterprise
from app.models.enterprise_config import EnterpriseConfig
from app.schemas.enterprise import (
    EnterpriseBrandingResponse,
    EnterpriseConfigResponse,
)

router = APIRouter()


@router.get("/branding", response_model=EnterpriseBrandingResponse)
def get_enterprise_branding(request: Request, db: Session = Depends(get_db)):
    """Get public branding for current enterprise (no auth required)."""
    if not hasattr(request.state, "enterprise") or not request.state.enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")

    enterprise = request.state.enterprise
    config = db.query(EnterpriseConfig).filter_by(enterprise_id=enterprise.id).first()

    return EnterpriseBrandingResponse(
        enterprise_name=enterprise.name,
        logo_url=config.logo_url if config else None,
        primary_color=config.primary_color if config else "#3B82F6",
        favicon_url=config.favicon_url if config else None,
    )


@router.get("/config", response_model=EnterpriseConfigResponse)
def get_enterprise_config(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get enterprise configuration (superuser only)."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser access required")

    enterprise_id = request.state.enterprise_id
    config = db.query(EnterpriseConfig).filter_by(enterprise_id=enterprise_id).first()

    if not config:
        # Return defaults
        return EnterpriseConfigResponse(
            google_oauth_enabled=False,
            microsoft_oauth_enabled=False,
            saml_enabled=False,
            smtp_port=587,
            primary_color="#3B82F6",
            features={},
        )

    return config
```

**Step 2: Register in routes __init__.py**

Add to `backend/app/api/routes/__init__.py`:
```python
from app.api.routes.enterprise import router as enterprise_router
```

**Step 3: Register in main.py**

Add to `backend/app/main.py`:
```python
app.include_router(
    enterprise_router, prefix="/api/enterprise", tags=["Enterprise"]
)
```

**Step 4: Commit**

```bash
git add backend/app/api/routes/enterprise.py backend/app/api/routes/__init__.py backend/app/main.py
git commit -m "feat: add enterprise API routes"
```

---

## Task 11: Create RLS Migration

**Files:**
- Create: `backend/alembic/versions/016_enable_row_level_security.py`

**Step 1: Create RLS migration**

```python
# backend/alembic/versions/016_enable_row_level_security.py
"""Enable Row-Level Security on tenant tables.

Revision ID: 016
Revises: 015
Create Date: 2026-01-23
"""

from typing import Sequence, Union
from alembic import op

revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TENANT_TABLES = [
    "users",
    "institutions",
    "departments",
    "projects",
    "tasks",
    "project_members",
    "project_files",
    "join_requests",
    "user_keywords",
    "user_alert_preferences",
]


def upgrade() -> None:
    # Enable RLS and create policies for each table
    for table in TENANT_TABLES:
        # Enable RLS
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")

        # Create policy for tenant isolation
        op.execute(f"""
            CREATE POLICY tenant_isolation_{table} ON {table}
            USING (enterprise_id = current_setting('app.current_enterprise_id', true)::uuid)
        """)

        # Allow the policy to apply to the table owner as well
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")


def downgrade() -> None:
    for table in TENANT_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
```

**Step 2: Commit**

```bash
git add backend/alembic/versions/016_enable_row_level_security.py
git commit -m "feat: add migration to enable RLS on tenant tables"
```

---

## Task 12: Add Frontend Tenant Context

**Files:**
- Create: `frontend/src/contexts/TenantContext.tsx`
- Create: `frontend/src/config/tenant.ts`

**Step 1: Create tenant config**

```typescript
// frontend/src/config/tenant.ts
const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export function getTenantSlug(): string {
  const host = window.location.hostname;

  // Development mode
  if (host === 'localhost' || host === '127.0.0.1') {
    return localStorage.getItem('dev_tenant') || 'default';
  }

  const subdomain = host.split('.')[0];

  if (!SLUG_PATTERN.test(subdomain)) {
    console.error('Invalid tenant subdomain:', subdomain);
    return 'default';
  }

  return subdomain;
}

export function isPlatformAdmin(): boolean {
  return getTenantSlug() === 'admin';
}

export function setDevTenant(slug: string): void {
  localStorage.setItem('dev_tenant', slug);
  window.location.reload();
}
```

**Step 2: Create tenant context**

```typescript
// frontend/src/contexts/TenantContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getTenantSlug, isPlatformAdmin } from '../config/tenant';
import * as api from '../services/api';

interface EnterpriseBranding {
  enterpriseName: string;
  logoUrl: string | null;
  primaryColor: string;
  faviconUrl: string | null;
}

interface TenantContextType {
  slug: string;
  isPlatformAdmin: boolean;
  branding: EnterpriseBranding | null;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<EnterpriseBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const slug = getTenantSlug();
  const isAdmin = isPlatformAdmin();

  useEffect(() => {
    if (isAdmin) {
      setIsLoading(false);
      return;
    }

    // Fetch branding
    api.getEnterpriseBranding()
      .then((res) => {
        setBranding({
          enterpriseName: res.data.enterprise_name,
          logoUrl: res.data.logo_url,
          primaryColor: res.data.primary_color,
          faviconUrl: res.data.favicon_url,
        });

        // Apply CSS variable
        document.documentElement.style.setProperty(
          '--color-primary-500',
          res.data.primary_color
        );

        // Update favicon
        if (res.data.favicon_url) {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (link) link.href = res.data.favicon_url;
        }

        // Update document title
        document.title = `${res.data.enterprise_name} - EduResearch`;
      })
      .catch((err) => {
        console.error('Failed to load branding:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isAdmin]);

  return (
    <TenantContext.Provider value={{ slug, isPlatformAdmin: isAdmin, branding, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
```

**Step 3: Commit**

```bash
git add frontend/src/config/tenant.ts frontend/src/contexts/TenantContext.tsx
git commit -m "feat: add frontend tenant context and branding"
```

---

## Task 13: Add Enterprise API Functions to Frontend

**Files:**
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/types/index.ts`

**Step 1: Add types**

Add to `frontend/src/types/index.ts`:

```typescript
// Enterprise types
export interface EnterpriseBranding {
  enterprise_name: string;
  logo_url: string | null;
  primary_color: string;
  favicon_url: string | null;
}

export interface EnterpriseConfig {
  google_oauth_enabled: boolean;
  google_client_id: string | null;
  microsoft_oauth_enabled: boolean;
  microsoft_client_id: string | null;
  saml_enabled: boolean;
  saml_metadata_url: string | null;
  smtp_host: string | null;
  smtp_port: number;
  smtp_user: string | null;
  smtp_from_email: string | null;
  smtp_from_name: string | null;
  logo_url: string | null;
  primary_color: string;
  favicon_url: string | null;
  features: Record<string, boolean>;
}
```

**Step 2: Add API functions**

Add to `frontend/src/services/api.ts`:

```typescript
import type { EnterpriseBranding, EnterpriseConfig } from '../types';

// Enterprise
export const getEnterpriseBranding = () =>
  api.get<EnterpriseBranding>('/enterprise/branding');

export const getEnterpriseConfig = () =>
  api.get<EnterpriseConfig>('/enterprise/config');
```

**Step 3: Commit**

```bash
git add frontend/src/services/api.ts frontend/src/types/index.ts
git commit -m "feat: add enterprise API functions to frontend"
```

---

## Task 14: Wrap App with TenantProvider

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Add TenantProvider**

Add import:
```typescript
import { TenantProvider } from './contexts/TenantContext';
```

Wrap the return in App function:
```typescript
return (
  <TenantProvider>
    <AuthProvider>
      {/* ... existing content ... */}
    </AuthProvider>
  </TenantProvider>
);
```

**Step 2: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: wrap app with TenantProvider"
```

---

## Task 15: Update Repositories to Include enterprise_id

**Files:**
- Modify: `backend/app/repositories/user_repository.py`
- Modify: `backend/app/repositories/institution_repository.py`
- Modify: `backend/app/repositories/project_repository.py`
- Modify: `backend/app/repositories/department_repository.py`
- Modify: `backend/app/repositories/task_repository.py`

**Step 1: Update UserRepository**

In `backend/app/repositories/user_repository.py`, update create method to include enterprise_id:

```python
def create(self, db: Session, *, email: str, password_hash: str, first_name: str,
           last_name: str, enterprise_id: UUID, **kwargs) -> User:
    user = User(
        email=email,
        password_hash=password_hash,
        first_name=first_name,
        last_name=last_name,
        enterprise_id=enterprise_id,
        **kwargs
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

**Step 2: Repeat for other repositories**

Update create methods in all repositories to require and include `enterprise_id`.

**Step 3: Commit**

```bash
git add backend/app/repositories/*.py
git commit -m "feat: update repositories to include enterprise_id"
```

---

## Task 16: Update Services to Pass enterprise_id

**Files:**
- Modify: `backend/app/services/auth_service.py`
- Modify: `backend/app/services/institution_service.py`
- Modify: `backend/app/services/project_service.py`
- Modify: `backend/app/services/department_service.py`
- Modify: `backend/app/services/task_service.py`

**Step 1: Update AuthService register method**

Add `enterprise_id` parameter to register method and pass to repository.

**Step 2: Update other services**

All create operations must now receive and pass `enterprise_id`.

**Step 3: Commit**

```bash
git add backend/app/services/*.py
git commit -m "feat: update services to pass enterprise_id"
```

---

## Task 17: Update API Routes to Get enterprise_id from Request

**Files:**
- Modify: `backend/app/api/routes/auth.py`
- Modify: `backend/app/api/routes/institutions.py`
- Modify: `backend/app/api/routes/projects.py`
- Modify: `backend/app/api/routes/departments.py`
- Modify: `backend/app/api/routes/tasks.py`

**Step 1: Update auth routes**

In register endpoint, get enterprise_id from request.state:

```python
@router.post("/register")
def register(
    request: Request,
    data: UserCreate,
    db: Session = Depends(get_db),
):
    enterprise_id = request.state.enterprise_id
    # Pass enterprise_id to service
```

**Step 2: Update all other routes similarly**

All create endpoints must get `enterprise_id` from `request.state.enterprise_id`.

**Step 3: Commit**

```bash
git add backend/app/api/routes/*.py
git commit -m "feat: update API routes to use enterprise_id from request"
```

---

## Task 18: Final Integration Test

**Step 1: Run migrations**

```bash
cd backend
alembic upgrade head
```

**Step 2: Test the application**

```bash
# Start backend
cd backend && uvicorn app.main:app --reload

# Start frontend
cd frontend && npm run dev
```

**Step 3: Verify tenant isolation**

1. Create two enterprises via database
2. Create users in each enterprise
3. Verify users can only see their enterprise's data

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete multi-tenancy implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Enterprise model | `models/enterprise.py` |
| 2 | EnterpriseConfig model | `models/enterprise_config.py` |
| 3 | Migration: enterprise tables | `alembic/versions/014_*.py` |
| 4 | Add enterprise_id to models | All model files |
| 5 | Migration: enterprise_id columns | `alembic/versions/015_*.py` |
| 6 | Enterprise schemas | `schemas/enterprise.py` |
| 7 | Tenant middleware | `middleware/tenant.py` |
| 8 | Tenant-aware DB sessions | `database.py`, `deps.py` |
| 9 | Register middleware | `main.py` |
| 10 | Enterprise API routes | `routes/enterprise.py` |
| 11 | Migration: enable RLS | `alembic/versions/016_*.py` |
| 12 | Frontend tenant context | `contexts/TenantContext.tsx` |
| 13 | Frontend API functions | `api.ts`, `types/index.ts` |
| 14 | Wrap app with TenantProvider | `App.tsx` |
| 15 | Update repositories | `repositories/*.py` |
| 16 | Update services | `services/*.py` |
| 17 | Update API routes | `routes/*.py` |
| 18 | Integration test | Manual testing |
