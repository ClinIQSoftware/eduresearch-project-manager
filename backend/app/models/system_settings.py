from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)

    # Registration Settings
    require_registration_approval = Column(Boolean, default=False)
    registration_approval_mode = Column(String(50), default="block")  # "block" or "limited"

    # Password Policy
    min_password_length = Column(Integer, default=8)
    require_uppercase = Column(Boolean, default=True)
    require_lowercase = Column(Boolean, default=True)
    require_numbers = Column(Boolean, default=True)
    require_special_chars = Column(Boolean, default=False)

    # Session Settings
    session_timeout_minutes = Column(Integer, default=30)

    # OAuth Settings
    google_oauth_enabled = Column(Boolean, default=True)
    microsoft_oauth_enabled = Column(Boolean, default=True)

    # Organization scope (null = global settings)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, unique=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    organization = relationship("Organization")
