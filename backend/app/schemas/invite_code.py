"""Schemas for invite code endpoints."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class InviteCodeCreate(BaseModel):
    """Schema for creating an invite code."""

    label: Optional[str] = Field(None, max_length=100)
    max_uses: Optional[int] = Field(None, ge=1)
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)


class InviteCodeResponse(BaseModel):
    """Schema for invite code response."""

    id: int
    code: str
    token: str
    label: Optional[str] = None
    invite_url: Optional[str] = None
    max_uses: Optional[int] = None
    use_count: int
    is_active: bool
    is_valid: bool
    expires_at: Optional[datetime] = None
    created_at: datetime
    created_by_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InviteCodeValidation(BaseModel):
    """Schema returned when validating an invite code."""

    valid: bool
    enterprise_name: Optional[str] = None
    enterprise_slug: Optional[str] = None
    message: Optional[str] = None
