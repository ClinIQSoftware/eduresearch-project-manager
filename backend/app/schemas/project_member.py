"""Project member schemas for EduResearch Project Manager."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserBrief


# Type alias for member roles
MemberRole = Literal["lead", "participant"]


class ProjectMemberCreate(BaseModel):
    """Schema for adding a member to a project."""

    user_id: int
    role: MemberRole = Field("participant", description="Role in the project: 'lead' or 'participant'")


class ProjectMemberUpdate(BaseModel):
    """Schema for updating a project member."""

    role: Optional[MemberRole] = Field(None, description="Role in the project: 'lead' or 'participant'")


class ProjectMemberResponse(BaseModel):
    """Schema for project member response."""

    id: int
    project_id: int
    user_id: int
    role: MemberRole
    joined_at: datetime
    user: UserBrief

    model_config = ConfigDict(from_attributes=True)
