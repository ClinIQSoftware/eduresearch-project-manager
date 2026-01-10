from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List
from app.models.project import ProjectClassification, ProjectStatus
from app.schemas.user import UserBrief


class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    color: Optional[str] = "#3B82F6"
    classification: ProjectClassification = ProjectClassification.research
    status: ProjectStatus = ProjectStatus.preparation
    open_to_participants: bool = True
    start_date: Optional[date] = None


class ProjectCreate(ProjectBase):
    institution_id: Optional[int] = None
    department_id: Optional[int] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    classification: Optional[ProjectClassification] = None
    status: Optional[ProjectStatus] = None
    open_to_participants: Optional[bool] = None
    start_date: Optional[date] = None
    institution_id: Optional[int] = None
    department_id: Optional[int] = None


class ProjectResponse(ProjectBase):
    id: int
    institution_id: Optional[int] = None
    department_id: Optional[int] = None
    lead_id: Optional[int] = None
    last_status_change: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProjectWithLead(ProjectResponse):
    lead: Optional[UserBrief] = None

    class Config:
        from_attributes = True


class ProjectMemberInfo(BaseModel):
    id: int
    user_id: int
    role: str
    joined_at: datetime
    user: UserBrief

    class Config:
        from_attributes = True


class ProjectDetail(ProjectWithLead):
    members: List[ProjectMemberInfo] = []

    class Config:
        from_attributes = True


class AddProjectMemberRequest(BaseModel):
    user_id: int
    role: str = "participant"
