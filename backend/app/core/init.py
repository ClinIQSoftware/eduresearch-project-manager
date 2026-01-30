"""Application startup initialization.

Handles idempotent seeding and configuration validation.
"""

import logging
from uuid import uuid4

from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import hash_password
from app.database import SessionLocal
from app.models.enterprise import Enterprise
from app.models.platform_admin import PlatformAdmin

logger = logging.getLogger(__name__)


def validate_config() -> None:
    """Validate configuration and log warnings for missing optional settings."""
    # Required settings - fail fast
    if not settings.secret_key or settings.secret_key == "your-secret-key-change-in-production":
        logger.error("SECRET_KEY is not set or using default value!")

    # Optional settings - warn
    if not settings.smtp_user:
        logger.warning("SMTP_USER not configured - email notifications disabled")

    if not settings.google_client_id:
        logger.info("GOOGLE_CLIENT_ID not set - Google OAuth disabled")

    if not settings.microsoft_client_id:
        logger.info("MICROSOFT_CLIENT_ID not set - Microsoft OAuth disabled")


def seed_default_enterprise(db: Session) -> Enterprise:
    """Ensure default enterprise exists for single-tenant deployments."""
    enterprise = db.query(Enterprise).filter(Enterprise.slug == "default").first()
    if enterprise:
        return enterprise

    try:
        enterprise = Enterprise(
            id=uuid4(),
            name="Default Enterprise",
            slug="default",
            is_active=True,
        )
        db.add(enterprise)
        db.commit()
        logger.info("Created default enterprise")
        return enterprise
    except Exception:
        db.rollback()
        logger.info("Default enterprise already seeded by another worker")
        return db.query(Enterprise).filter(Enterprise.slug == "default").first()


def seed_platform_admin(db: Session) -> None:
    """Seed platform admin if none exists (idempotent)."""
    existing = db.query(PlatformAdmin).first()
    if existing:
        logger.info(f"Platform admin already exists: {existing.email}")
        return

    # Create from environment variables — guard against race with concurrent workers
    try:
        password_hash = hash_password(settings.platform_admin_password)
        admin = PlatformAdmin(
            id=uuid4(),
            email=settings.platform_admin_email,
            password_hash=password_hash,
            name=settings.platform_admin_name,
            is_active=True,
            must_change_password=True,
        )
        db.add(admin)
        db.commit()
        logger.info(f"Created platform admin: {admin.email}")
        logger.warning("Platform admin created with default password - change immediately!")
    except Exception:
        db.rollback()
        logger.info("Platform admin already seeded by another worker")


def run_startup_init() -> None:
    """Run all startup initialization tasks."""
    logger.info("Running startup initialization...")

    validate_config()

    db = SessionLocal()
    try:
        seed_default_enterprise(db)
        seed_platform_admin(db)
    finally:
        db.close()

    logger.info("Startup initialization complete")
