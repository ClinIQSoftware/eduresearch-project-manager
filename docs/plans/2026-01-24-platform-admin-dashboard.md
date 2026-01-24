# Platform Admin Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a platform-level admin dashboard to manage enterprises across the multi-tenant platform, including viewing subdomain URLs.

**Architecture:** Separate platform admin routes that bypass RLS using `get_platform_db()`. Frontend adds a `/platform-admin` section with enterprise CRUD, stats, and subdomain URL display. Platform admins are identified by `is_platform_admin` flag on request state (subdomain = "admin") combined with user's `is_superuser` flag.

**Tech Stack:** FastAPI, SQLAlchemy (non-RLS sessions), React, TypeScript, TailwindCSS

---

## Task 1: Create PlatformAdmin Model

**Files:**
- Create: `backend/app/models/platform_admin.py`
- Modify: `backend/app/models/__init__.py`

**Step 1: Create platform admin model**

```python
# backend/app/models/platform_admin.py
"""PlatformAdmin model for EduResearch Project Manager."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class PlatformAdmin(Base):
    """Represents a platform-level administrator."""

    __tablename__ = "platform_admins"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )
```

**Step 2: Export from models package**

Add to `backend/app/models/__init__.py`:
```python
from app.models.platform_admin import PlatformAdmin
```

**Step 3: Commit**

```bash
git add backend/app/models/platform_admin.py backend/app/models/__init__.py
git commit -m "feat: add PlatformAdmin model"
```

---

## Task 2: Create Migration for PlatformAdmin Table

**Files:**
- Create: `backend/alembic/versions/017_add_platform_admins.py`

**Step 1: Create migration file**

```python
# backend/alembic/versions/017_add_platform_admins.py
"""Add platform_admins table.

Revision ID: 017
Revises: 016
Create Date: 2026-01-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "platform_admins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("platform_admins")
```

**Step 2: Commit**

```bash
git add backend/alembic/versions/017_add_platform_admins.py
git commit -m "feat: add migration for platform_admins table"
```

---

## Task 3: Create Platform Admin Schemas

**Files:**
- Create: `backend/app/schemas/platform_admin.py`
- Modify: `backend/app/schemas/__init__.py`

**Step 1: Create Pydantic schemas**

```python
# backend/app/schemas/platform_admin.py
"""Pydantic schemas for platform admin operations."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PlatformAdminBase(BaseModel):
    """Base schema for platform admin."""

    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)


class PlatformAdminCreate(PlatformAdminBase):
    """Schema for creating a platform admin."""

    password: str = Field(..., min_length=8)


class PlatformAdminUpdate(BaseModel):
    """Schema for updating a platform admin."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    is_active: Optional[bool] = None


class PlatformAdminResponse(PlatformAdminBase):
    """Schema for platform admin response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool
    created_at: datetime


class PlatformAdminLogin(BaseModel):
    """Schema for platform admin login."""

    email: EmailStr
    password: str


class EnterpriseListItem(BaseModel):
    """Schema for enterprise in list view."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    is_active: bool
    created_at: datetime
    # Computed fields
    subdomain_url: str
    user_count: int = 0
    project_count: int = 0


class EnterpriseCreate(BaseModel):
    """Schema for creating an enterprise."""

    slug: str = Field(..., min_length=1, max_length=63, pattern=r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")
    name: str = Field(..., min_length=1, max_length=255)


class EnterpriseUpdate(BaseModel):
    """Schema for updating an enterprise."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    is_active: Optional[bool] = None


class EnterpriseDetailResponse(BaseModel):
    """Schema for enterprise detail view."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    subdomain_url: str
    user_count: int
    project_count: int
    institution_count: int
    storage_used_mb: float = 0.0


class PlatformStatsResponse(BaseModel):
    """Schema for platform-wide statistics."""

    total_enterprises: int
    active_enterprises: int
    total_users: int
    total_projects: int
    total_institutions: int
```

**Step 2: Export from schemas package**

Add to `backend/app/schemas/__init__.py`:
```python
from app.schemas.platform_admin import (
    PlatformAdminCreate,
    PlatformAdminUpdate,
    PlatformAdminResponse,
    PlatformAdminLogin,
    EnterpriseListItem,
    EnterpriseCreate,
    EnterpriseUpdate,
    EnterpriseDetailResponse,
    PlatformStatsResponse,
)
```

**Step 3: Commit**

```bash
git add backend/app/schemas/platform_admin.py backend/app/schemas/__init__.py
git commit -m "feat: add platform admin schemas"
```

---

## Task 4: Create Platform Admin API Routes

**Files:**
- Create: `backend/app/api/routes/platform_admin.py`
- Modify: `backend/app/api/routes/__init__.py`
- Modify: `backend/app/main.py`

**Step 1: Create platform admin routes**

```python
# backend/app/api/routes/platform_admin.py
"""Platform admin API routes."""

import os
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_platform_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.enterprise import Enterprise
from app.models.enterprise_config import EnterpriseConfig
from app.models.platform_admin import PlatformAdmin
from app.models.user import User
from app.models.project import Project
from app.models.institution import Institution
from app.schemas.platform_admin import (
    PlatformAdminCreate,
    PlatformAdminResponse,
    PlatformAdminLogin,
    EnterpriseListItem,
    EnterpriseCreate,
    EnterpriseUpdate,
    EnterpriseDetailResponse,
    PlatformStatsResponse,
)

router = APIRouter()

# Configuration
BASE_DOMAIN = os.getenv("BASE_DOMAIN", "localhost:3000")


def get_subdomain_url(slug: str) -> str:
    """Generate subdomain URL for an enterprise."""
    if "localhost" in BASE_DOMAIN:
        return f"http://{BASE_DOMAIN}?tenant={slug}"
    return f"https://{slug}.{BASE_DOMAIN}"


def require_platform_admin(request: Request):
    """Verify request is from platform admin subdomain."""
    if not getattr(request.state, "is_platform_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required"
        )


# Authentication
@router.post("/auth/login")
def platform_admin_login(
    credentials: PlatformAdminLogin,
    db: Session = Depends(get_platform_db),
):
    """Login as platform admin."""
    admin = db.query(PlatformAdmin).filter(
        PlatformAdmin.email == credentials.email
    ).first()

    if not admin or not admin.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not verify_password(credentials.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    token = create_access_token(data={
        "sub": str(admin.id),
        "type": "platform_admin"
    })

    return {"access_token": token, "token_type": "bearer"}


# Platform Stats
@router.get("/stats", response_model=PlatformStatsResponse)
def get_platform_stats(
    request: Request,
    db: Session = Depends(get_platform_db),
):
    """Get platform-wide statistics."""
    require_platform_admin(request)

    total_enterprises = db.query(func.count(Enterprise.id)).scalar() or 0
    active_enterprises = db.query(func.count(Enterprise.id)).filter(
        Enterprise.is_active == True
    ).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_projects = db.query(func.count(Project.id)).scalar() or 0
    total_institutions = db.query(func.count(Institution.id)).scalar() or 0

    return PlatformStatsResponse(
        total_enterprises=total_enterprises,
        active_enterprises=active_enterprises,
        total_users=total_users,
        total_projects=total_projects,
        total_institutions=total_institutions,
    )


# Enterprise Management
@router.get("/enterprises", response_model=List[EnterpriseListItem])
def list_enterprises(
    request: Request,
    db: Session = Depends(get_platform_db),
):
    """List all enterprises with stats."""
    require_platform_admin(request)

    enterprises = db.query(Enterprise).order_by(Enterprise.created_at.desc()).all()

    result = []
    for enterprise in enterprises:
        user_count = db.query(func.count(User.id)).filter(
            User.enterprise_id == enterprise.id
        ).scalar() or 0
        project_count = db.query(func.count(Project.id)).filter(
            Project.enterprise_id == enterprise.id
        ).scalar() or 0

        result.append(EnterpriseListItem(
            id=enterprise.id,
            slug=enterprise.slug,
            name=enterprise.name,
            is_active=enterprise.is_active,
            created_at=enterprise.created_at,
            subdomain_url=get_subdomain_url(enterprise.slug),
            user_count=user_count,
            project_count=project_count,
        ))

    return result


@router.post("/enterprises", response_model=EnterpriseListItem, status_code=status.HTTP_201_CREATED)
def create_enterprise(
    request: Request,
    data: EnterpriseCreate,
    db: Session = Depends(get_platform_db),
):
    """Create a new enterprise."""
    require_platform_admin(request)

    # Check if slug is reserved
    reserved_slugs = {"admin", "api", "www", "app", "static", "assets"}
    if data.slug in reserved_slugs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This subdomain is reserved"
        )

    # Check if slug exists
    existing = db.query(Enterprise).filter(Enterprise.slug == data.slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An enterprise with this subdomain already exists"
        )

    enterprise = Enterprise(
        slug=data.slug,
        name=data.name,
        is_active=True,
    )
    db.add(enterprise)

    # Create default config
    config = EnterpriseConfig(
        enterprise_id=enterprise.id,
        primary_color="#3B82F6",
        features={},
    )
    db.add(config)

    db.commit()
    db.refresh(enterprise)

    return EnterpriseListItem(
        id=enterprise.id,
        slug=enterprise.slug,
        name=enterprise.name,
        is_active=enterprise.is_active,
        created_at=enterprise.created_at,
        subdomain_url=get_subdomain_url(enterprise.slug),
        user_count=0,
        project_count=0,
    )


@router.get("/enterprises/{enterprise_id}", response_model=EnterpriseDetailResponse)
def get_enterprise(
    request: Request,
    enterprise_id: UUID,
    db: Session = Depends(get_platform_db),
):
    """Get enterprise details."""
    require_platform_admin(request)

    enterprise = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    if not enterprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enterprise not found"
        )

    user_count = db.query(func.count(User.id)).filter(
        User.enterprise_id == enterprise.id
    ).scalar() or 0
    project_count = db.query(func.count(Project.id)).filter(
        Project.enterprise_id == enterprise.id
    ).scalar() or 0
    institution_count = db.query(func.count(Institution.id)).filter(
        Institution.enterprise_id == enterprise.id
    ).scalar() or 0

    return EnterpriseDetailResponse(
        id=enterprise.id,
        slug=enterprise.slug,
        name=enterprise.name,
        is_active=enterprise.is_active,
        created_at=enterprise.created_at,
        updated_at=enterprise.updated_at,
        subdomain_url=get_subdomain_url(enterprise.slug),
        user_count=user_count,
        project_count=project_count,
        institution_count=institution_count,
        storage_used_mb=0.0,  # TODO: Calculate actual storage
    )


@router.patch("/enterprises/{enterprise_id}", response_model=EnterpriseListItem)
def update_enterprise(
    request: Request,
    enterprise_id: UUID,
    data: EnterpriseUpdate,
    db: Session = Depends(get_platform_db),
):
    """Update an enterprise."""
    require_platform_admin(request)

    enterprise = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    if not enterprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enterprise not found"
        )

    if data.name is not None:
        enterprise.name = data.name
    if data.is_active is not None:
        enterprise.is_active = data.is_active

    db.commit()
    db.refresh(enterprise)

    user_count = db.query(func.count(User.id)).filter(
        User.enterprise_id == enterprise.id
    ).scalar() or 0
    project_count = db.query(func.count(Project.id)).filter(
        Project.enterprise_id == enterprise.id
    ).scalar() or 0

    return EnterpriseListItem(
        id=enterprise.id,
        slug=enterprise.slug,
        name=enterprise.name,
        is_active=enterprise.is_active,
        created_at=enterprise.created_at,
        subdomain_url=get_subdomain_url(enterprise.slug),
        user_count=user_count,
        project_count=project_count,
    )


@router.delete("/enterprises/{enterprise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enterprise(
    request: Request,
    enterprise_id: UUID,
    db: Session = Depends(get_platform_db),
):
    """Soft delete an enterprise (deactivate)."""
    require_platform_admin(request)

    enterprise = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    if not enterprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enterprise not found"
        )

    # Soft delete - just deactivate
    enterprise.is_active = False
    db.commit()

    return None
```

**Step 2: Register route in routes __init__.py**

Add to `backend/app/api/routes/__init__.py`:
```python
from app.api.routes.platform_admin import router as platform_admin_router
```

**Step 3: Register in main.py**

Add to `backend/app/main.py` after other router registrations:
```python
from app.api.routes import platform_admin_router

app.include_router(platform_admin_router, prefix="/api/platform", tags=["platform-admin"])
```

**Step 4: Commit**

```bash
git add backend/app/api/routes/platform_admin.py backend/app/api/routes/__init__.py backend/app/main.py
git commit -m "feat: add platform admin API routes"
```

---

## Task 5: Create Frontend Platform Admin Types

**Files:**
- Modify: `frontend/src/types/index.ts`

**Step 1: Add platform admin types**

Add to `frontend/src/types/index.ts`:
```typescript
// Platform Admin Types
export interface PlatformStats {
  total_enterprises: number;
  active_enterprises: number;
  total_users: number;
  total_projects: number;
  total_institutions: number;
}

export interface EnterpriseListItem {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  created_at: string;
  subdomain_url: string;
  user_count: number;
  project_count: number;
}

export interface EnterpriseDetail extends EnterpriseListItem {
  updated_at: string | null;
  institution_count: number;
  storage_used_mb: number;
}

export interface EnterpriseCreateData {
  slug: string;
  name: string;
}

export interface EnterpriseUpdateData {
  name?: string;
  is_active?: boolean;
}
```

**Step 2: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: add platform admin types"
```

---

## Task 6: Create Frontend Platform Admin API Functions

**Files:**
- Create: `frontend/src/api/platformAdmin.ts`
- Modify: `frontend/src/api/index.ts`

**Step 1: Create API functions**

```typescript
// frontend/src/api/platformAdmin.ts
import { apiClient } from './client';
import type {
  PlatformStats,
  EnterpriseListItem,
  EnterpriseDetail,
  EnterpriseCreateData,
  EnterpriseUpdateData,
} from '../types';

export const platformAdminApi = {
  // Stats
  getStats: () =>
    apiClient.get<PlatformStats>('/platform/stats'),

  // Enterprises
  listEnterprises: () =>
    apiClient.get<EnterpriseListItem[]>('/platform/enterprises'),

  getEnterprise: (id: string) =>
    apiClient.get<EnterpriseDetail>(`/platform/enterprises/${id}`),

  createEnterprise: (data: EnterpriseCreateData) =>
    apiClient.post<EnterpriseListItem>('/platform/enterprises', data),

  updateEnterprise: (id: string, data: EnterpriseUpdateData) =>
    apiClient.patch<EnterpriseListItem>(`/platform/enterprises/${id}`, data),

  deleteEnterprise: (id: string) =>
    apiClient.delete(`/platform/enterprises/${id}`),
};
```

**Step 2: Export from api index**

Add to `frontend/src/api/index.ts`:
```typescript
export * from './platformAdmin';
```

**Step 3: Commit**

```bash
git add frontend/src/api/platformAdmin.ts frontend/src/api/index.ts
git commit -m "feat: add platform admin API functions"
```

---

## Task 7: Create Frontend Platform Admin Hooks

**Files:**
- Create: `frontend/src/hooks/usePlatformAdmin.ts`
- Modify: `frontend/src/hooks/index.ts`

**Step 1: Create React Query hooks**

```typescript
// frontend/src/hooks/usePlatformAdmin.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformAdminApi } from '../api/platformAdmin';
import type { EnterpriseCreateData, EnterpriseUpdateData } from '../types';

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platformStats'],
    queryFn: () => platformAdminApi.getStats().then(r => r.data),
  });
}

export function useEnterprises() {
  return useQuery({
    queryKey: ['enterprises'],
    queryFn: () => platformAdminApi.listEnterprises().then(r => r.data),
  });
}

export function useEnterprise(id: string) {
  return useQuery({
    queryKey: ['enterprise', id],
    queryFn: () => platformAdminApi.getEnterprise(id).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateEnterprise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EnterpriseCreateData) => platformAdminApi.createEnterprise(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      queryClient.invalidateQueries({ queryKey: ['platformStats'] });
    },
  });
}

export function useUpdateEnterprise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EnterpriseUpdateData }) =>
      platformAdminApi.updateEnterprise(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
    },
  });
}

export function useDeleteEnterprise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => platformAdminApi.deleteEnterprise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      queryClient.invalidateQueries({ queryKey: ['platformStats'] });
    },
  });
}
```

**Step 2: Export from hooks index**

Add to `frontend/src/hooks/index.ts`:
```typescript
export * from './usePlatformAdmin';
```

**Step 3: Commit**

```bash
git add frontend/src/hooks/usePlatformAdmin.ts frontend/src/hooks/index.ts
git commit -m "feat: add platform admin hooks"
```

---

## Task 8: Create Platform Admin Layout Component

**Files:**
- Create: `frontend/src/pages/platform-admin/PlatformAdminLayout.tsx`

**Step 1: Create layout component**

```typescript
// frontend/src/pages/platform-admin/PlatformAdminLayout.tsx
import { NavLink, Outlet } from 'react-router-dom';
import { usePlatformStats } from '../../hooks/usePlatformAdmin';
import { Card } from '../../components/ui/Card';

const platformTabs = [
  { to: '/platform-admin/enterprises', label: 'Enterprises' },
  { to: '/platform-admin/settings', label: 'Settings' },
];

export default function PlatformAdminLayout() {
  const { data: stats } = usePlatformStats();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold">Platform Administration</h1>
          <p className="text-indigo-200 text-sm">Manage all enterprises and platform settings</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{stats.total_enterprises}</div>
              <div className="text-sm text-gray-500">Enterprises</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.active_enterprises}</div>
              <div className="text-sm text-gray-500">Active</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total_users}</div>
              <div className="text-sm text-gray-500">Users</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.total_projects}</div>
              <div className="text-sm text-gray-500">Projects</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.total_institutions}</div>
              <div className="text-sm text-gray-500">Institutions</div>
            </Card>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex gap-x-6">
            {platformTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `py-2 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <Outlet />
      </main>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/platform-admin/PlatformAdminLayout.tsx
git commit -m "feat: add platform admin layout"
```

---

## Task 9: Create Enterprises Tab Component

**Files:**
- Create: `frontend/src/pages/platform-admin/EnterprisesTab.tsx`

**Step 1: Create enterprises management component**

```typescript
// frontend/src/pages/platform-admin/EnterprisesTab.tsx
import { useState } from 'react';
import {
  useEnterprises,
  useCreateEnterprise,
  useUpdateEnterprise,
  useDeleteEnterprise,
} from '../../hooks/usePlatformAdmin';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableColumn } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { getErrorMessage } from '../../utils/errorHandling';
import type { EnterpriseListItem, EnterpriseCreateData } from '../../types';

type FormData = { slug: string; name: string };
const emptyForm: FormData = { slug: '', name: '' };

export default function EnterprisesTab() {
  const { data: enterprises = [], isLoading } = useEnterprises();
  const createEnterprise = useCreateEnterprise();
  const updateEnterprise = useUpdateEnterprise();
  const deleteEnterprise = useDeleteEnterprise();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'toggle' | 'delete'; enterprise: EnterpriseListItem } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEnterprise.mutateAsync(formData);
      setMessage({ type: 'success', text: 'Enterprise created successfully!' });
      setShowForm(false);
      setFormData(emptyForm);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const handleToggleActive = async (enterprise: EnterpriseListItem) => {
    try {
      await updateEnterprise.mutateAsync({
        id: enterprise.id,
        data: { is_active: !enterprise.is_active },
      });
      setMessage({
        type: 'success',
        text: `Enterprise ${enterprise.is_active ? 'deactivated' : 'activated'} successfully`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
    setConfirmDialog(null);
  };

  const columns: TableColumn<EnterpriseListItem>[] = [
    {
      key: 'name',
      header: 'Enterprise',
      render: (e) => (
        <div>
          <div className="font-medium text-gray-900">{e.name}</div>
          <div className="text-sm text-gray-500">/{e.slug}</div>
        </div>
      ),
    },
    {
      key: 'subdomain_url',
      header: 'Subdomain URL',
      render: (e) => (
        <a
          href={e.subdomain_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 hover:underline text-sm font-mono"
        >
          {e.subdomain_url}
        </a>
      ),
    },
    {
      key: 'stats',
      header: 'Stats',
      render: (e) => (
        <div className="text-sm text-gray-500">
          <span className="mr-3">{e.user_count} users</span>
          <span>{e.project_count} projects</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => (
        <Badge variant={e.is_active ? 'success' : 'error'}>
          {e.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (e) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={e.is_active ? 'outline' : 'primary'}
            onClick={() => setConfirmDialog({ type: 'toggle', enterprise: e })}
          >
            {e.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Message */}
      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Enterprises</h2>
        <Button onClick={() => setShowForm(true)}>+ New Enterprise</Button>
      </div>

      {/* Table */}
      <Card>
        <Table data={enterprises} columns={columns} />
      </Card>

      {/* Create Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setFormData(emptyForm); }} title="Create Enterprise">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Enterprise Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Acme Corporation"
            required
          />
          <Input
            label="Subdomain Slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            placeholder="acme"
            pattern="^[a-z0-9]([a-z0-9-]*[a-z0-9])?$"
            required
          />
          <p className="text-sm text-gray-500">
            URL will be: <span className="font-mono">{formData.slug || 'slug'}.eduresearch.app</span>
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={createEnterprise.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => confirmDialog && handleToggleActive(confirmDialog.enterprise)}
        title={confirmDialog?.type === 'toggle' ? (confirmDialog.enterprise.is_active ? 'Deactivate Enterprise' : 'Activate Enterprise') : ''}
        message={confirmDialog?.type === 'toggle' ? `Are you sure you want to ${confirmDialog.enterprise.is_active ? 'deactivate' : 'activate'} "${confirmDialog.enterprise.name}"? ${confirmDialog.enterprise.is_active ? 'Users will not be able to access this enterprise.' : ''}` : ''}
        confirmLabel={confirmDialog?.enterprise.is_active ? 'Deactivate' : 'Activate'}
        variant={confirmDialog?.enterprise.is_active ? 'danger' : 'primary'}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/platform-admin/EnterprisesTab.tsx
git commit -m "feat: add enterprises management tab"
```

---

## Task 10: Create Platform Settings Tab Component

**Files:**
- Create: `frontend/src/pages/platform-admin/SettingsTab.tsx`
- Create: `frontend/src/pages/platform-admin/index.ts`

**Step 1: Create settings tab**

```typescript
// frontend/src/pages/platform-admin/SettingsTab.tsx
import { Card } from '../../components/ui/Card';

export default function SettingsTab() {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Platform Settings</h2>
      <p className="text-gray-500">
        Platform-wide settings will be available here in a future release.
      </p>
      <ul className="mt-4 text-sm text-gray-600 list-disc list-inside space-y-1">
        <li>Default enterprise settings</li>
        <li>Global feature flags</li>
        <li>Platform announcements</li>
        <li>Billing & subscriptions (future)</li>
      </ul>
    </Card>
  );
}
```

**Step 2: Create index export**

```typescript
// frontend/src/pages/platform-admin/index.ts
export { default as PlatformAdminLayout } from './PlatformAdminLayout';
export { default as EnterprisesTab } from './EnterprisesTab';
export { default as SettingsTab } from './SettingsTab';
```

**Step 3: Commit**

```bash
git add frontend/src/pages/platform-admin/SettingsTab.tsx frontend/src/pages/platform-admin/index.ts
git commit -m "feat: add platform settings tab and exports"
```

---

## Task 11: Add Platform Admin Routes to App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Add platform admin routes**

Import at top of file:
```typescript
import { PlatformAdminLayout, EnterprisesTab, SettingsTab } from './pages/platform-admin';
```

Add routes inside the Routes component (after admin routes, before the catch-all):
```typescript
{/* Platform Admin Routes */}
<Route path="/platform-admin" element={<PlatformAdminLayout />}>
  <Route index element={<Navigate to="/platform-admin/enterprises" replace />} />
  <Route path="enterprises" element={<EnterprisesTab />} />
  <Route path="settings" element={<SettingsTab />} />
</Route>
```

**Step 2: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: add platform admin routes"
```

---

## Task 12: Update Tenant Middleware for Admin Subdomain

**Files:**
- Modify: `backend/app/middleware/tenant.py`

**Step 1: Update middleware to handle admin subdomain header**

Add handling for `X-Platform-Admin` header for local development:

```python
# In the dispatch method, after extracting subdomain:
# Handle platform admin header for dev
if request.headers.get("X-Platform-Admin") == "true":
    request.state.is_platform_admin = True
    request.state.enterprise_id = None
    request.state.enterprise = None
    return await call_next(request)
```

**Step 2: Commit**

```bash
git add backend/app/middleware/tenant.py
git commit -m "feat: support X-Platform-Admin header for dev"
```

---

## Task 13: Run Migrations and Test

**Step 1: Run migrations**

```bash
docker exec eduresearch-backend-local alembic upgrade head
```

**Step 2: Rebuild frontend**

```bash
cd frontend && npm run build
docker compose -f docker-compose.local.yml up --build -d frontend
```

**Step 3: Test API endpoints**

```bash
# Test with platform admin header
curl -H "X-Platform-Admin: true" http://localhost:8001/api/platform/stats
curl -H "X-Platform-Admin: true" http://localhost:8001/api/platform/enterprises
```

**Step 4: Test frontend**

Navigate to http://localhost:3000/platform-admin/enterprises

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: platform admin dashboard complete"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | PlatformAdmin model | `backend/app/models/platform_admin.py` |
| 2 | Migration for platform_admins table | `backend/alembic/versions/017_*.py` |
| 3 | Platform admin Pydantic schemas | `backend/app/schemas/platform_admin.py` |
| 4 | Platform admin API routes | `backend/app/api/routes/platform_admin.py` |
| 5 | Frontend TypeScript types | `frontend/src/types/index.ts` |
| 6 | Frontend API functions | `frontend/src/api/platformAdmin.ts` |
| 7 | React Query hooks | `frontend/src/hooks/usePlatformAdmin.ts` |
| 8 | Platform admin layout | `frontend/src/pages/platform-admin/PlatformAdminLayout.tsx` |
| 9 | Enterprises tab | `frontend/src/pages/platform-admin/EnterprisesTab.tsx` |
| 10 | Settings tab | `frontend/src/pages/platform-admin/SettingsTab.tsx` |
| 11 | App.tsx routes | `frontend/src/App.tsx` |
| 12 | Middleware update | `backend/app/middleware/tenant.py` |
| 13 | Integration test | Run migrations and verify |

**Key Features:**
- Platform stats dashboard (enterprises, users, projects, institutions)
- Enterprise CRUD with subdomain URL display
- Activate/deactivate enterprises
- Reserved slug validation
- Accessible at `/platform-admin` with `X-Platform-Admin: true` header for dev
