"""Department schemas for EduResearch Project Manager."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserBrief


class DepartmentBase(BaseModel):
    """Base department schema with common fields."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)


class DepartmentCreate(DepartmentBase):
    """Schema for creating a department."""

    institution_id: int


class DepartmentUpdate(BaseModel):
    """Schema for updating a department - all fields optional."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)


class DepartmentResponse(DepartmentBase):
    """Schema for department response."""

    id: int
    institution_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DepartmentBrief(BaseModel):
    """Brief department schema for nested responses."""

    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class DepartmentWithMembers(DepartmentResponse):
    """Department response with members."""

    users: List[UserBrief] = []

    model_config = ConfigDict(from_attributes=True)
