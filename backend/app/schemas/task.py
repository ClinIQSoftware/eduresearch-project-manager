"""Task schemas for EduResearch Project Manager."""

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserBrief


# Type aliases for task fields
TaskStatus = Literal["todo", "in_progress", "completed"]
TaskPriority = Literal["low", "medium", "high"]


class TaskBase(BaseModel):
    """Base task schema with common fields."""

    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    status: TaskStatus = "todo"
    priority: TaskPriority = "medium"
    due_date: Optional[date] = None


class TaskCreate(TaskBase):
    """Schema for creating a task."""

    project_id: Optional[int] = None
    assigned_to_id: Optional[int] = None


class TaskUpdate(BaseModel):
    """Schema for updating a task - all fields optional."""

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[date] = None
    project_id: Optional[int] = None
    assigned_to_id: Optional[int] = None


class TaskResponse(TaskBase):
    """Schema for task response."""

    id: int
    project_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TaskWithAssignee(TaskResponse):
    """Task response with assignee and creator information."""

    assigned_to: Optional[UserBrief] = None
    created_by: Optional[UserBrief] = None

    model_config = ConfigDict(from_attributes=True)
