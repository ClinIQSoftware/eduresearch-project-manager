"""Project model for EduResearch Project Manager."""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base

if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.institution import Institution
    from app.models.join_request import JoinRequest
    from app.models.project_file import ProjectFile
    from app.models.project_member import ProjectMember
    from app.models.task import Task
    from app.models.user import User


class Project(Base):
    """Represents a research/education project."""

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    color: Mapped[str] = mapped_column(String(7), default="#3B82F6")

    # Classification and status
    classification: Mapped[str] = mapped_column(
        String(30), default="research"
    )  # 'research', 'education', 'quality_improvement', 'administrative'
    status: Mapped[str] = mapped_column(
        String(20), default="preparation"
    )  # 'preparation', 'recruitment', 'analysis', 'writing'
    open_to_participants: Mapped[bool] = mapped_column(Boolean, default=True)

    # Dates
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    next_meeting_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    last_status_change: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Email reminder settings
    meeting_reminder_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    meeting_reminder_days: Mapped[int] = mapped_column(Integer, default=1)
    deadline_reminder_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    deadline_reminder_days: Mapped[int] = mapped_column(Integer, default=7)
    meeting_reminder_sent_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True
    )
    deadline_reminder_sent_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True
    )

    # Foreign keys
    institution_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    department_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    lead_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Multi-tenancy
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        onupdate=func.now(), nullable=True
    )

    # Relationships
    institution: Mapped[Optional["Institution"]] = relationship(
        "Institution", back_populates="projects"
    )
    department: Mapped[Optional["Department"]] = relationship(
        "Department", back_populates="projects"
    )
    lead: Mapped[Optional["User"]] = relationship(
        "User", back_populates="led_projects", foreign_keys=[lead_id]
    )
    members: Mapped[List["ProjectMember"]] = relationship(
        "ProjectMember", back_populates="project", cascade="all, delete-orphan"
    )
    tasks: Mapped[List["Task"]] = relationship(
        "Task", back_populates="project", cascade="all, delete-orphan"
    )
    files: Mapped[List["ProjectFile"]] = relationship(
        "ProjectFile", back_populates="project", cascade="all, delete-orphan"
    )
    join_requests: Mapped[List["JoinRequest"]] = relationship(
        "JoinRequest", back_populates="project", cascade="all, delete-orphan"
    )
