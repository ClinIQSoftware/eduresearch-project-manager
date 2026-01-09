from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SystemSettingsBase(BaseModel):
    # Registration Settings
    require_registration_approval: bool = False
    registration_approval_mode: str = "block"  # "block" or "limited"

    # Password Policy
    min_password_length: int = 8
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_numbers: bool = True
    require_special_chars: bool = False

    # Session Settings
    session_timeout_minutes: int = 30

    # OAuth Settings
    google_oauth_enabled: bool = True
    microsoft_oauth_enabled: bool = True


class SystemSettingsUpdate(BaseModel):
    # All fields optional for partial updates
    require_registration_approval: Optional[bool] = None
    registration_approval_mode: Optional[str] = None
    min_password_length: Optional[int] = None
    require_uppercase: Optional[bool] = None
    require_lowercase: Optional[bool] = None
    require_numbers: Optional[bool] = None
    require_special_chars: Optional[bool] = None
    session_timeout_minutes: Optional[int] = None
    google_oauth_enabled: Optional[bool] = None
    microsoft_oauth_enabled: Optional[bool] = None


class SystemSettingsResponse(SystemSettingsBase):
    id: int
    organization_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BulkUploadResult(BaseModel):
    total_processed: int
    created: int
    skipped: int
    errors: list[str]


class ApproveUserRequest(BaseModel):
    pass  # No additional fields needed, user_id comes from path


class RejectUserRequest(BaseModel):
    reason: Optional[str] = None
