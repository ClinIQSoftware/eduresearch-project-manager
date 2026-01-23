"""EmailSettings model for EduResearch Project Manager."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class EmailSettings(Base):
    """Represents email/SMTP configuration settings."""

    __tablename__ = "email_settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=True,
        unique=True,
        index=True,
    )  # NULL for global settings
    smtp_host: Mapped[str] = mapped_column(String(255), default="smtp.gmail.com")
    smtp_port: Mapped[int] = mapped_column(Integer, default=587)
    smtp_user: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_password: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )  # Should be encrypted in production
    from_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    from_name: Mapped[str] = mapped_column(
        String(255), default="EduResearch Project Manager"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        onupdate=func.now(), nullable=True
    )
