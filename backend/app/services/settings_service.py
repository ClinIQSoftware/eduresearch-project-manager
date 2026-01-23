"""Settings service for EduResearch Project Manager.

Handles system and email settings management operations.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.models.email_settings import EmailSettings
from app.models.system_settings import SystemSettings
from app.repositories import EmailSettingsRepository, SystemSettingsRepository
from app.schemas.email_settings import EmailSettingsUpdate
from app.schemas.system_settings import SystemSettingsUpdate


class SettingsService:
    """Service for system and email settings operations."""

    def __init__(self, db: Session) -> None:
        """Initialize the SettingsService.

        Args:
            db: SQLAlchemy database session.
        """
        self.db = db
        self.system_settings_repo = SystemSettingsRepository(db)
        self.email_settings_repo = EmailSettingsRepository(db)

    def get_system_settings(
        self, institution_id: Optional[int] = None
    ) -> SystemSettings:
        """Get system settings for an institution or global settings.

        If no settings exist, creates default settings.

        Args:
            institution_id: Optional institution ID for institution-specific settings.

        Returns:
            SystemSettings object.
        """
        settings = self.system_settings_repo.get_for_institution(institution_id)

        if not settings:
            # Create default settings
            settings_data = {"institution_id": institution_id}
            settings = self.system_settings_repo.create(settings_data)

        return settings

    def update_system_settings(
        self, institution_id: Optional[int], data: SystemSettingsUpdate
    ) -> SystemSettings:
        """Update system settings for an institution or global settings.

        Creates settings if they don't exist.

        Args:
            institution_id: Optional institution ID for institution-specific settings.
            data: The update data.

        Returns:
            The updated SystemSettings.
        """
        settings = self.system_settings_repo.get_for_institution(institution_id)

        update_data = data.model_dump(exclude_unset=True)

        if not settings:
            # Create new settings with the update data
            create_data = {"institution_id": institution_id, **update_data}
            settings = self.system_settings_repo.create(create_data)
        else:
            settings = self.system_settings_repo.update(settings.id, update_data)

        return settings

    def get_email_settings(self, institution_id: Optional[int] = None) -> EmailSettings:
        """Get email settings for an institution or global settings.

        If no settings exist, creates default settings.

        Args:
            institution_id: Optional institution ID for institution-specific settings.

        Returns:
            EmailSettings object.
        """
        settings = self.email_settings_repo.get_for_institution(institution_id)

        if not settings:
            # Create default settings
            settings_data = {"institution_id": institution_id}
            settings = self.email_settings_repo.create(settings_data)

        return settings

    def update_email_settings(
        self, institution_id: Optional[int], data: EmailSettingsUpdate
    ) -> EmailSettings:
        """Update email settings for an institution or global settings.

        Creates settings if they don't exist.

        Args:
            institution_id: Optional institution ID for institution-specific settings.
            data: The update data.

        Returns:
            The updated EmailSettings.
        """
        settings = self.email_settings_repo.get_for_institution(institution_id)

        update_data = data.model_dump(exclude_unset=True)

        if not settings:
            # Create new settings with the update data
            create_data = {"institution_id": institution_id, **update_data}
            settings = self.email_settings_repo.create(create_data)
        else:
            settings = self.email_settings_repo.update(settings.id, update_data)

        return settings
