"""Enterprise model for multi-tenancy."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
import uuid

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base

if TYPE_CHECKING:
    from app.models.enterprise_config import EnterpriseConfig


class Enterprise(Base):
    """Represents a tenant enterprise."""

    __tablename__ = "enterprises"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(
        String(63), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        onupdate=func.now(), nullable=True
    )

    # Subscription fields
    plan_type: Mapped[str] = mapped_column(String(20), default="free", nullable=False)
    max_users: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    max_projects: Mapped[Optional[int]] = mapped_column(Integer, default=3, nullable=True)  # None = unlimited
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    subscription_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    current_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    config: Mapped[Optional["EnterpriseConfig"]] = relationship(
        "EnterpriseConfig", back_populates="enterprise", uselist=False,
        cascade="all, delete-orphan"
    )
