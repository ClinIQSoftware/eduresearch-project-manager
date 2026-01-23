"""Institution model for EduResearch Project Manager."""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base

if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.project import Project
    from app.models.user import User


class Institution(Base):
    """Represents an educational institution."""

    __tablename__ = "institutions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        onupdate=func.now(), nullable=True
    )

    # Relationships
    departments: Mapped[List["Department"]] = relationship(
        "Department", back_populates="institution", cascade="all, delete-orphan"
    )
    users: Mapped[List["User"]] = relationship(
        "User", back_populates="institution", foreign_keys="User.institution_id"
    )
    projects: Mapped[List["Project"]] = relationship(
        "Project", back_populates="institution"
    )
