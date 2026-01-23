"""Settings repositories for email and system settings database operations."""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.email_settings import EmailSettings
from app.models.system_settings import SystemSettings
from app.repositories.base import BaseRepository


class EmailSettingsRepository(BaseRepository[EmailSettings]):
    """Repository for EmailSettings model with settings-specific queries."""

    def __init__(self, db: Session) -> None:
        """Initialize the EmailSettingsRepository.

        Args:
            db: SQLAlchemy database session.
        """
        super().__init__(db, EmailSettings)

    def get_for_institution(
        self, institution_id: Optional[int]
    ) -> Optional[EmailSettings]:
        """Get email settings for a specific institution.

        Args:
            institution_id: The institution ID, or None for global settings.

        Returns:
            The email settings if found, None otherwise.
        """
        if institution_id is None:
            return self.get_global()

        return (
            self.db.query(EmailSettings)
            .filter(EmailSettings.institution_id == institution_id)
            .first()
        )

    def get_global(self) -> Optional[EmailSettings]:
        """Get global email settings (where institution_id is NULL).

        Returns:
            The global email settings if found, None otherwise.
        """
        return (
            self.db.query(EmailSettings)
            .filter(EmailSettings.institution_id.is_(None))
            .first()
        )


class SystemSettingsRepository(BaseRepository[SystemSettings]):
    """Repository for SystemSettings model with settings-specific queries."""

    def __init__(self, db: Session) -> None:
        """Initialize the SystemSettingsRepository.

        Args:
            db: SQLAlchemy database session.
        """
        super().__init__(db, SystemSettings)

    def get_for_institution(
        self, institution_id: Optional[int]
    ) -> Optional[SystemSettings]:
        """Get system settings for a specific institution.

        Args:
            institution_id: The institution ID, or None for global settings.

        Returns:
            The system settings if found, None otherwise.
        """
        if institution_id is None:
            return self.get_global()

        return (
            self.db.query(SystemSettings)
            .filter(SystemSettings.institution_id == institution_id)
            .first()
        )

    def get_global(self) -> Optional[SystemSettings]:
        """Get global system settings (where institution_id is NULL).

        Returns:
            The global system settings if found, None otherwise.
        """
        return (
            self.db.query(SystemSettings)
            .filter(SystemSettings.institution_id.is_(None))
            .first()
        )
