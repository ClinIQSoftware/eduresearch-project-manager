"""SystemSettings model for EduResearch Project Manager."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base


class SystemSettings(Base):
    """Represents system-wide or institution-specific settings."""

    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institution_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=True,
        unique=True,
        index=True,
    )  # NULL for global settings

    # Registration Settings
    require_registration_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    registration_approval_mode: Mapped[str] = mapped_column(
        String(20), default="block"
    )  # 'block' or 'limited'

    # Password Policy
    min_password_length: Mapped[int] = mapped_column(Integer, default=8)
    require_uppercase: Mapped[bool] = mapped_column(Boolean, default=True)
    require_lowercase: Mapped[bool] = mapped_column(Boolean, default=True)
    require_numbers: Mapped[bool] = mapped_column(Boolean, default=True)
    require_special_chars: Mapped[bool] = mapped_column(Boolean, default=False)

    # Session Settings
    session_timeout_minutes: Mapped[int] = mapped_column(Integer, default=30)

    # OAuth Settings
    google_oauth_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    microsoft_oauth_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        onupdate=func.now(), nullable=True
    )
