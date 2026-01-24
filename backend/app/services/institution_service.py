"""Institution service for EduResearch Project Manager.

Handles institution management operations including CRUD
and admin user management.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.institution import Institution
from app.models.user import User
from app.repositories import InstitutionRepository, UserRepository
from app.schemas.institution import InstitutionCreate, InstitutionUpdate


class InstitutionService:
    """Service for institution management operations."""

    def __init__(self, db: Session) -> None:
        """Initialize the InstitutionService.

        Args:
            db: SQLAlchemy database session.
        """
        self.db = db
        self.institution_repo = InstitutionRepository(db)
        self.user_repo = UserRepository(db)

    def create_institution(
        self, data: InstitutionCreate, enterprise_id: UUID
    ) -> Institution:
        """Create a new institution.

        Args:
            data: Institution creation data.
            enterprise_id: The enterprise/tenant ID this institution belongs to.

        Returns:
            The newly created Institution.
        """
        institution_data = data.model_dump()
        name = institution_data.pop("name")
        institution = self.institution_repo.create(
            name=name,
            enterprise_id=enterprise_id,
            **institution_data,
        )
        return institution

    def update_institution(
        self, institution_id: int, data: InstitutionUpdate
    ) -> Institution:
        """Update an existing institution.

        Args:
            institution_id: The ID of the institution to update.
            data: The update data.

        Returns:
            The updated Institution.

        Raises:
            NotFoundException: If institution not found.
        """
        institution = self.institution_repo.get_by_id(institution_id)
        if not institution:
            raise NotFoundException(f"Institution with id {institution_id} not found")

        update_data = data.model_dump(exclude_unset=True)
        updated_institution = self.institution_repo.update(institution_id, update_data)

        return updated_institution

    def delete_institution(self, institution_id: int) -> bool:
        """Delete an institution.

        Args:
            institution_id: The ID of the institution to delete.

        Returns:
            True if institution was deleted.

        Raises:
            NotFoundException: If institution not found.
        """
        institution = self.institution_repo.get_by_id(institution_id)
        if not institution:
            raise NotFoundException(f"Institution with id {institution_id} not found")

        return self.institution_repo.delete(institution_id)

    def get_institution(self, institution_id: int) -> Optional[Institution]:
        """Get an institution by ID.

        Args:
            institution_id: The institution ID.

        Returns:
            The Institution if found, None otherwise.
        """
        return self.institution_repo.get_by_id(institution_id)

    def get_all_institutions(self) -> List[Institution]:
        """Get all institutions.

        Returns:
            List of all Institutions.
        """
        return self.institution_repo.get_all()

    def add_admin(self, institution_id: int, user_id: int) -> bool:
        """Add a user as an admin of an institution.

        Args:
            institution_id: The institution ID.
            user_id: The user ID to add as admin.

        Returns:
            True if admin was added successfully.

        Raises:
            NotFoundException: If institution or user not found.
            BadRequestException: If user is already an admin.
        """
        institution = self.institution_repo.get_by_id(institution_id)
        if not institution:
            raise NotFoundException(f"Institution with id {institution_id} not found")

        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(f"User with id {user_id} not found")

        if self.institution_repo.is_admin(institution_id, user_id):
            raise BadRequestException("User is already an admin of this institution")

        return self.institution_repo.add_admin(institution_id, user_id)

    def remove_admin(self, institution_id: int, user_id: int) -> bool:
        """Remove a user as an admin of an institution.

        Args:
            institution_id: The institution ID.
            user_id: The user ID to remove as admin.

        Returns:
            True if admin was removed successfully.

        Raises:
            NotFoundException: If institution not found or user is not an admin.
        """
        institution = self.institution_repo.get_by_id(institution_id)
        if not institution:
            raise NotFoundException(f"Institution with id {institution_id} not found")

        if not self.institution_repo.is_admin(institution_id, user_id):
            raise NotFoundException("User is not an admin of this institution")

        return self.institution_repo.remove_admin(institution_id, user_id)

    def get_admins(self, institution_id: int) -> List[User]:
        """Get all admin users for an institution.

        Args:
            institution_id: The institution ID.

        Returns:
            List of Users who are admins of the institution.

        Raises:
            NotFoundException: If institution not found.
        """
        institution = self.institution_repo.get_by_id(institution_id)
        if not institution:
            raise NotFoundException(f"Institution with id {institution_id} not found")

        return self.institution_repo.get_admins(institution_id)
