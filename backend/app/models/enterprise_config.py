"""Enterprise configuration model for per-tenant settings."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, LargeBinary
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base

if TYPE_CHECKING:
    from app.models.enterprise import Enterprise


class EnterpriseConfig(Base):
    """Per-enterprise configuration for OAuth, SMTP, and branding."""

    __tablename__ = "enterprise_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    # OAuth/SSO Settings
    google_oauth_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    google_client_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    google_client_secret_encrypted: Mapped[Optional[bytes]] = mapped_column(
        LargeBinary, nullable=True
    )
    microsoft_oauth_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    microsoft_client_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    microsoft_client_secret_encrypted: Mapped[Optional[bytes]] = mapped_column(
        LargeBinary, nullable=True
    )
    saml_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    saml_metadata_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # SMTP Settings
    smtp_host: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_port: Mapped[int] = mapped_column(Integer, default=587)
    smtp_user: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_password_encrypted: Mapped[Optional[bytes]] = mapped_column(
        LargeBinary, nullable=True
    )
    smtp_from_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_from_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Branding
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[str] = mapped_column(String(7), default="#3B82F6")
    favicon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    custom_css: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Feature Flags
    features: Mapped[dict] = mapped_column(JSONB, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        onupdate=func.now(), nullable=True
    )

    # Relationships
    enterprise: Mapped["Enterprise"] = relationship(
        "Enterprise", back_populates="config"
    )
