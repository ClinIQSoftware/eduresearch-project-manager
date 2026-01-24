"""Pydantic schemas for Enterprise and EnterpriseConfig."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# Enterprise schemas
class EnterpriseBase(BaseModel):
    """Base schema for enterprise data."""

    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=63, pattern=r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")


class EnterpriseCreate(EnterpriseBase):
    """Schema for creating an enterprise."""

    pass


class EnterpriseUpdate(BaseModel):
    """Schema for updating an enterprise."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    is_active: Optional[bool] = None


class EnterpriseResponse(EnterpriseBase):
    """Schema for enterprise response data."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class EnterpriseListResponse(BaseModel):
    """Schema for paginated list of enterprises."""

    enterprises: list[EnterpriseResponse]
    total: int


# EnterpriseConfig schemas
class EnterpriseBrandingUpdate(BaseModel):
    """Schema for updating enterprise branding settings."""

    logo_url: Optional[str] = Field(None, max_length=500)
    primary_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    favicon_url: Optional[str] = Field(None, max_length=500)
    custom_css: Optional[str] = None


class EnterpriseSmtpUpdate(BaseModel):
    """Schema for updating enterprise SMTP settings."""

    smtp_host: Optional[str] = Field(None, max_length=255)
    smtp_port: Optional[int] = Field(None, ge=1, le=65535)
    smtp_user: Optional[str] = Field(None, max_length=255)
    smtp_password: Optional[str] = None  # Plain text, will be encrypted
    smtp_from_email: Optional[EmailStr] = None
    smtp_from_name: Optional[str] = Field(None, max_length=255)


class EnterpriseOAuthUpdate(BaseModel):
    """Schema for updating enterprise OAuth settings."""

    google_oauth_enabled: Optional[bool] = None
    google_client_id: Optional[str] = Field(None, max_length=255)
    google_client_secret: Optional[str] = None  # Plain text, will be encrypted
    microsoft_oauth_enabled: Optional[bool] = None
    microsoft_client_id: Optional[str] = Field(None, max_length=255)
    microsoft_client_secret: Optional[str] = None  # Plain text, will be encrypted


class EnterpriseConfigResponse(BaseModel):
    """Schema for enterprise configuration response data."""

    model_config = ConfigDict(from_attributes=True)

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


# Public branding (for unauthenticated requests)
class EnterpriseBrandingResponse(BaseModel):
    """Schema for public enterprise branding (unauthenticated requests)."""

    enterprise_name: str
    logo_url: Optional[str] = None
    primary_color: str
    favicon_url: Optional[str] = None
