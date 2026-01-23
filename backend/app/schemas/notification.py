"""Pydantic schemas for notifications."""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.models.notification import NotificationType


class UserBrief(BaseModel):
    """Brief user info for notification responses."""
    id: int
    first_name: str
    last_name: str
    email: str

    @property
    def name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    class Config:
        from_attributes = True


class ProjectBrief(BaseModel):
    """Brief project info for notification responses."""
    id: int
    title: str

    class Config:
        from_attributes = True


class TaskBrief(BaseModel):
    """Brief task info for notification responses."""
    id: int
    title: str

    class Config:
        from_attributes = True


# Notification schemas
class NotificationBase(BaseModel):
    type: str
    title: str
    message: Optional[str] = None
    project_id: Optional[int] = None
    task_id: Optional[int] = None


class NotificationCreate(NotificationBase):
    user_id: int
    actor_id: Optional[int] = None


class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    actor_id: Optional[int] = None
    is_read: bool
    created_at: datetime
    actor: Optional[UserBrief] = None
    project: Optional[ProjectBrief] = None
    task: Optional[TaskBrief] = None

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Paginated list of notifications."""
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    """Response for unread count endpoint."""
    count: int


# Notification Preference schemas
class NotificationPreferenceBase(BaseModel):
    notification_type: str
    in_app_enabled: bool = True
    email_enabled: bool = True


class NotificationPreferenceCreate(NotificationPreferenceBase):
    pass


class NotificationPreferenceUpdate(BaseModel):
    in_app_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None


class NotificationPreferenceResponse(NotificationPreferenceBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class NotificationPreferencesListResponse(BaseModel):
    """List of all preferences for a user."""
    preferences: List[NotificationPreferenceResponse]


class NotificationPreferencesBulkUpdate(BaseModel):
    """Bulk update for notification preferences."""
    preferences: List[NotificationPreferenceBase]
