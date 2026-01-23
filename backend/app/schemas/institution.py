"""Institution schemas for EduResearch Project Manager."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserBrief


class InstitutionBase(BaseModel):
    """Base institution schema with common fields."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)


class InstitutionCreate(InstitutionBase):
    """Schema for creating an institution."""

    pass


class InstitutionUpdate(BaseModel):
    """Schema for updating an institution - all fields optional."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)


class InstitutionResponse(InstitutionBase):
    """Schema for institution response."""

    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class InstitutionBrief(BaseModel):
    """Brief institution schema for nested responses."""

    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class InstitutionWithMembers(InstitutionResponse):
    """Institution response with admin members."""

    admins: List[UserBrief] = []

    model_config = ConfigDict(from_attributes=True)


class AddMemberRequest(BaseModel):
    """Schema for adding a member to an institution."""

    user_id: int
    is_admin: bool = False
