"""JoinRequest model for EduResearch Project Manager."""
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class RequestStatus:
    """Constants for join request status."""
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


class JoinRequest(Base):
    """Represents a request from a user to join a project."""

    __tablename__ = "join_requests"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_join_request"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    message: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # 'pending', 'approved', 'rejected'
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )
    responded_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="join_requests")
    user: Mapped["User"] = relationship("User", back_populates="join_requests")
