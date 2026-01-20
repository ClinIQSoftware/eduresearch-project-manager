"""Settings schemas for EduResearch Project Manager."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# Type alias for registration approval mode
RegistrationApprovalMode = Literal["block", "limited"]


# ============================================================================
# Email Settings Schemas
# ============================================================================


class EmailSettingsBase(BaseModel):
    """Base email settings schema."""

    smtp_host: str = Field("smtp.gmail.com", max_length=255)
    smtp_port: int = Field(587, ge=1, le=65535)
    smtp_user: Optional[str] = Field(None, max_length=255)
    smtp_password: Optional[str] = Field(None, max_length=255)
    from_email: Optional[EmailStr] = None
    from_name: str = Field("EduResearch Project Manager", max_length=255)
    is_active: bool = True


class EmailSettingsCreate(EmailSettingsBase):
    """Schema for creating email settings."""

    institution_id: Optional[int] = None


class EmailSettingsUpdate(BaseModel):
    """Schema for updating email settings - all fields optional."""

    smtp_host: Optional[str] = Field(None, max_length=255)
    smtp_port: Optional[int] = Field(None, ge=1, le=65535)
    smtp_user: Optional[str] = Field(None, max_length=255)
    smtp_password: Optional[str] = Field(None, max_length=255)
    from_email: Optional[EmailStr] = None
    from_name: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class EmailSettingsResponse(BaseModel):
    """Schema for email settings response (password omitted)."""

    id: int
    smtp_host: str
    smtp_port: int
    smtp_user: Optional[str] = None
    from_email: Optional[EmailStr] = None
    from_name: str
    is_active: bool
    institution_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# System Settings Schemas
# ============================================================================


class SystemSettingsBase(BaseModel):
    """Base system settings schema."""

    # Registration Settings
    require_registration_approval: bool = False
    registration_approval_mode: RegistrationApprovalMode = Field(
        "block",
        description="'block' - users cannot log in until approved; 'limited' - users can log in with limited access"
    )

    # Password Policy
    min_password_length: int = Field(8, ge=6, le=128)
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_numbers: bool = True
    require_special_chars: bool = False

    # Session Settings
    session_timeout_minutes: int = Field(30, ge=5, le=1440)

    # OAuth Settings
    google_oauth_enabled: bool = True
    microsoft_oauth_enabled: bool = True


class SystemSettingsUpdate(BaseModel):
    """Schema for updating system settings - all fields optional."""

    require_registration_approval: Optional[bool] = None
    registration_approval_mode: Optional[RegistrationApprovalMode] = None
    min_password_length: Optional[int] = Field(None, ge=6, le=128)
    require_uppercase: Optional[bool] = None
    require_lowercase: Optional[bool] = None
    require_numbers: Optional[bool] = None
    require_special_chars: Optional[bool] = None
    session_timeout_minutes: Optional[int] = Field(None, ge=5, le=1440)
    google_oauth_enabled: Optional[bool] = None
    microsoft_oauth_enabled: Optional[bool] = None


class SystemSettingsResponse(SystemSettingsBase):
    """Schema for system settings response."""

    id: int
    institution_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Admin Utility Schemas
# ============================================================================


class BulkUploadResult(BaseModel):
    """Schema for bulk upload result."""

    total_processed: int
    created: int
    skipped: int
    errors: list[str]


class ApproveUserRequest(BaseModel):
    """Schema for approving a user (user_id comes from path)."""

    pass


class RejectUserRequest(BaseModel):
    """Schema for rejecting a user."""

    reason: Optional[str] = Field(None, max_length=1000)


class TestEmailRequest(BaseModel):
    """Schema for sending a test email."""

    to_email: EmailStr
    subject: Optional[str] = Field("Test Email from EduResearch", max_length=255)
    message: Optional[str] = Field("This is a test email from EduResearch Project Manager.", max_length=2000)
