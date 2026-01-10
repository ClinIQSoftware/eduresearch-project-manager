from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.task import TaskStatus, TaskPriority


class UserBrief(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str

    @property
    def name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    class Config:
        from_attributes = True


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[datetime] = None
    project_id: Optional[int] = None
    assigned_to_id: Optional[int] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    project_id: Optional[int] = None
    assigned_to_id: Optional[int] = None


class TaskResponse(TaskBase):
    id: int
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    assigned_to: Optional[UserBrief] = None
    created_by: Optional[UserBrief] = None

    class Config:
        from_attributes = True
