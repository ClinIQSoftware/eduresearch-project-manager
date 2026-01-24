"""Pydantic schemas for Platform Admin operations."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# Platform Admin schemas
class PlatformAdminBase(BaseModel):
    """Base schema for platform admin data."""

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
    """Schema for platform admin response data."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool
    created_at: datetime


class PlatformAdminLogin(BaseModel):
    """Schema for platform admin login request."""

    email: EmailStr
    password: str = Field(..., min_length=1)


# Enterprise schemas for platform admin views
class EnterpriseListItem(BaseModel):
    """Schema for enterprise list item in platform admin view."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    is_active: bool
    created_at: datetime
    subdomain_url: Optional[str] = None
    user_count: int = 0
    project_count: int = 0


class EnterpriseCreate(BaseModel):
    """Schema for creating an enterprise via platform admin."""

    slug: str = Field(
        ...,
        min_length=1,
        max_length=63,
        pattern=r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$",
    )
    name: str = Field(..., min_length=1, max_length=255)


class EnterpriseUpdate(BaseModel):
    """Schema for updating an enterprise via platform admin."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    is_active: Optional[bool] = None


class EnterpriseDetailResponse(EnterpriseListItem):
    """Schema for detailed enterprise response in platform admin view."""

    updated_at: Optional[datetime] = None
    institution_count: int = 0
    storage_used_mb: float = 0.0


class PlatformStatsResponse(BaseModel):
    """Schema for platform-wide statistics."""

    model_config = ConfigDict(from_attributes=True)

    total_enterprises: int = 0
    active_enterprises: int = 0
    total_users: int = 0
    total_projects: int = 0
    total_institutions: int = 0


# Platform Email Settings schemas
class PlatformEmailSettingsResponse(BaseModel):
    """Schema for platform-wide email settings response."""

    model_config = ConfigDict(from_attributes=True)

    smtp_host: str
    smtp_port: int
    smtp_user: Optional[str] = None
    from_email: Optional[str] = None
    from_name: str
    is_active: bool


class PlatformEmailSettingsUpdate(BaseModel):
    """Schema for updating platform-wide email settings."""

    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    is_active: Optional[bool] = None


class TestEmailRequest(BaseModel):
    """Schema for test email request."""

    to: EmailStr
