"""Department model for EduResearch Project Manager."""
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base

if TYPE_CHECKING:
    from app.models.institution import Institution
    from app.models.project import Project
    from app.models.user import User


class Department(Base):
    """Represents a department within an institution."""

    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        onupdate=func.now(), nullable=True
    )

    # Relationships
    institution: Mapped["Institution"] = relationship(
        "Institution", back_populates="departments"
    )
    users: Mapped[List["User"]] = relationship("User", back_populates="department")
    projects: Mapped[List["Project"]] = relationship(
        "Project", back_populates="department"
    )
