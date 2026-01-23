"""User model for EduResearch Project Manager."""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class AuthProvider:
    """Constants for authentication providers."""

    local = "local"
    google = "google"
    microsoft = "microsoft"


if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.institution import Institution
    from app.models.join_request import JoinRequest
    from app.models.notification import Notification, NotificationPreference
    from app.models.project import Project
    from app.models.project_file import ProjectFile
    from app.models.project_member import ProjectMember
    from app.models.task import Task
    from app.models.user_keyword import UserKeyword
    from app.models.user_alert_preference import UserAlertPreference


class User(Base):
    """Represents a user in the system."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )  # Nullable for OAuth users
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    # Approval fields for registration approval workflow
    is_approved: Mapped[bool] = mapped_column(Boolean, default=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    approved_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Authentication provider
    auth_provider: Mapped[str] = mapped_column(
        String(20), default="local"
    )  # 'local', 'google', 'microsoft'
    oauth_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Institution and Department relationships
    institution_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    department_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        onupdate=func.now(), nullable=True
    )

    @property
    def name(self) -> str:
        """Computed property for full name."""
        return f"{self.first_name} {self.last_name}".strip()

    # Relationships
    institution: Mapped[Optional["Institution"]] = relationship(
        "Institution", back_populates="users", foreign_keys=[institution_id]
    )
    department: Mapped[Optional["Department"]] = relationship(
        "Department", back_populates="users"
    )
    approved_by: Mapped[Optional["User"]] = relationship(
        "User", remote_side=[id], foreign_keys=[approved_by_id]
    )
    led_projects: Mapped[List["Project"]] = relationship(
        "Project", back_populates="lead", foreign_keys="Project.lead_id"
    )
    project_memberships: Mapped[List["ProjectMember"]] = relationship(
        "ProjectMember", back_populates="user", cascade="all, delete-orphan"
    )
    created_tasks: Mapped[List["Task"]] = relationship(
        "Task", back_populates="created_by", foreign_keys="Task.created_by_id"
    )
    assigned_tasks: Mapped[List["Task"]] = relationship(
        "Task", back_populates="assigned_to", foreign_keys="Task.assigned_to_id"
    )
    join_requests: Mapped[List["JoinRequest"]] = relationship(
        "JoinRequest", back_populates="user", cascade="all, delete-orphan"
    )
    uploaded_files: Mapped[List["ProjectFile"]] = relationship(
        "ProjectFile", back_populates="uploaded_by", cascade="all, delete-orphan"
    )
    keywords: Mapped[List["UserKeyword"]] = relationship(
        "UserKeyword", back_populates="user", cascade="all, delete-orphan"
    )
    alert_preference: Mapped[Optional["UserAlertPreference"]] = relationship(
        "UserAlertPreference",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )

    # Notification relationships
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification",
        back_populates="user",
        foreign_keys="Notification.user_id",
        cascade="all, delete-orphan",
    )
    notification_preferences: Mapped[List["NotificationPreference"]] = relationship(
        "NotificationPreference", back_populates="user", cascade="all, delete-orphan"
    )
