"""Project schemas for EduResearch Project Manager."""

from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.department import DepartmentBrief
from app.schemas.institution import InstitutionBrief
from app.schemas.user import UserBrief


# Type aliases for project fields
ProjectClassification = Literal[
    "research", "education", "quality_improvement", "administrative"
]
ProjectStatus = Literal["preparation", "recruitment", "analysis", "writing"]
MemberRole = Literal["lead", "participant"]


class ProjectBase(BaseModel):
    """Base project schema with common fields."""

    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    classification: ProjectClassification = "research"
    status: ProjectStatus = "preparation"
    open_to_participants: bool = True
    color: Optional[str] = Field("#3B82F6", max_length=7)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    next_meeting_date: Optional[date] = None
    # Email reminder settings
    meeting_reminder_enabled: bool = False
    meeting_reminder_days: int = 1
    deadline_reminder_enabled: bool = False
    deadline_reminder_days: int = 7


class ProjectCreate(ProjectBase):
    """Schema for creating a project."""

    institution_id: Optional[int] = None
    department_id: Optional[int] = None


class ProjectUpdate(BaseModel):
    """Schema for updating a project - all fields optional."""

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    classification: Optional[ProjectClassification] = None
    status: Optional[ProjectStatus] = None
    open_to_participants: Optional[bool] = None
    color: Optional[str] = Field(None, max_length=7)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    next_meeting_date: Optional[date] = None
    institution_id: Optional[int] = None
    department_id: Optional[int] = None
    # Email reminder settings
    meeting_reminder_enabled: Optional[bool] = None
    meeting_reminder_days: Optional[int] = None
    deadline_reminder_enabled: Optional[bool] = None
    deadline_reminder_days: Optional[int] = None


class ProjectResponse(ProjectBase):
    """Schema for project response."""

    id: int
    lead_id: Optional[int] = None
    institution_id: Optional[int] = None
    department_id: Optional[int] = None
    last_status_change: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProjectWithLead(ProjectResponse):
    """Project response with lead user information."""

    lead: Optional[UserBrief] = None
    institution: Optional[InstitutionBrief] = None
    department: Optional[DepartmentBrief] = None

    model_config = ConfigDict(from_attributes=True)


# Forward reference for ProjectMemberResponse - will be defined after import
class ProjectMemberInfo(BaseModel):
    """Project member info for nested responses."""

    id: int
    user_id: int
    role: MemberRole
    joined_at: datetime
    user: UserBrief

    model_config = ConfigDict(from_attributes=True)


class ProjectDetail(ProjectWithLead):
    """Detailed project response with members."""

    members: List[ProjectMemberInfo] = []

    model_config = ConfigDict(from_attributes=True)


class AddProjectMemberRequest(BaseModel):
    """Schema for adding a member to a project."""

    user_id: int
    role: MemberRole = "participant"
