"""Notification models for in-app notifications system."""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class NotificationType(str, enum.Enum):
    """Types of notifications that can be sent."""
    # Task notifications
    task_assigned = "task_assigned"
    task_due_soon = "task_due_soon"
    task_completed = "task_completed"

    # Membership notifications
    join_approved = "join_approved"
    join_rejected = "join_rejected"
    added_to_project = "added_to_project"
    removed_from_project = "removed_from_project"

    # Project notifications
    project_status_changed = "project_status_changed"
    file_uploaded = "file_uploaded"
    deadline_approaching = "deadline_approaching"
    meeting_approaching = "meeting_approaching"


# Default preferences for each notification type
DEFAULT_PREFERENCES = {
    # Task notifications
    NotificationType.task_assigned: {"in_app": True, "email": True},
    NotificationType.task_due_soon: {"in_app": True, "email": True},
    NotificationType.task_completed: {"in_app": True, "email": False},
    # Membership notifications
    NotificationType.join_approved: {"in_app": True, "email": True},
    NotificationType.join_rejected: {"in_app": True, "email": True},
    NotificationType.added_to_project: {"in_app": True, "email": True},
    NotificationType.removed_from_project: {"in_app": True, "email": True},
    # Project notifications
    NotificationType.project_status_changed: {"in_app": True, "email": False},
    NotificationType.file_uploaded: {"in_app": True, "email": False},
    NotificationType.deadline_approaching: {"in_app": True, "email": True},
    NotificationType.meeting_approaching: {"in_app": True, "email": True},
}


class Notification(Base):
    """Stores individual notifications for users."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="notifications", foreign_keys=[user_id])
    project = relationship("Project", back_populates="notifications")
    task = relationship("Task", back_populates="notifications")
    actor = relationship("User", foreign_keys=[actor_id])


class NotificationPreference(Base):
    """Stores user preferences for notification types."""
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    notification_type = Column(String(50), nullable=False)
    in_app_enabled = Column(Boolean, default=True, nullable=False)
    email_enabled = Column(Boolean, default=True, nullable=False)

    # Unique constraint on user_id + notification_type
    __table_args__ = (
        UniqueConstraint('user_id', 'notification_type', name='uq_user_notification_type'),
    )

    # Relationships
    user = relationship("User", back_populates="notification_preferences")
