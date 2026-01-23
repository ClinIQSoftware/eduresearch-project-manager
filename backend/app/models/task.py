"""Task model for EduResearch Project Manager."""
from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.time_entry import TimeEntry
    from app.models.user import User


class Task(Base):
    """Represents a task within a project."""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="todo"
    )  # 'todo', 'in_progress', 'completed'
    priority: Mapped[str] = mapped_column(
        String(10), default="medium"
    )  # 'low', 'medium', 'high'
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Foreign keys
    project_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True
    )
    assigned_to_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        onupdate=func.now(), nullable=True
    )

    # Relationships
    project: Mapped[Optional["Project"]] = relationship(
        "Project", back_populates="tasks"
    )
    assigned_to: Mapped[Optional["User"]] = relationship(
        "User", back_populates="assigned_tasks", foreign_keys=[assigned_to_id]
    )
    created_by: Mapped[Optional["User"]] = relationship(
        "User", back_populates="created_tasks", foreign_keys=[created_by_id]
    )
    time_entries: Mapped[List["TimeEntry"]] = relationship(
        "TimeEntry", back_populates="task", cascade="all, delete-orphan"
    )
