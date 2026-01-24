"""Institution repository for institution-specific database operations."""

from typing import Any, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.institution import Institution
from app.models.institution_admin import institution_admins
from app.models.user import User
from app.repositories.base import BaseRepository


class InstitutionRepository(BaseRepository[Institution]):
    """Repository for Institution model with additional institution-specific queries."""

    def __init__(self, db: Session) -> None:
        """Initialize the InstitutionRepository.

        Args:
            db: SQLAlchemy database session.
        """
        super().__init__(db, Institution)

    def create(
        self,
        *,
        name: str,
        enterprise_id: UUID,
        **kwargs: Any,
    ) -> Institution:
        """Create a new institution.

        Args:
            name: Institution name.
            enterprise_id: The enterprise/tenant ID this institution belongs to.
            **kwargs: Additional optional fields.

        Returns:
            The newly created institution.
        """
        institution = Institution(
            name=name,
            enterprise_id=enterprise_id,
            **kwargs,
        )
        self.db.add(institution)
        self.db.commit()
        self.db.refresh(institution)
        return institution

    def get_with_departments(self, id: int) -> Optional[Institution]:
        """Get an institution with its departments eagerly loaded.

        Args:
            id: The institution ID.

        Returns:
            The institution with departments loaded, or None if not found.
        """
        return (
            self.db.query(Institution)
            .options(joinedload(Institution.departments))
            .filter(Institution.id == id)
            .first()
        )

    def get_admins(self, institution_id: int) -> List[User]:
        """Get all admin users for an institution.

        Args:
            institution_id: The institution ID.

        Returns:
            List of users who are admins of the institution.
        """
        stmt = (
            select(User)
            .join(institution_admins, User.id == institution_admins.c.user_id)
            .where(institution_admins.c.institution_id == institution_id)
        )
        return list(self.db.execute(stmt).scalars().all())

    def add_admin(self, institution_id: int, user_id: int) -> bool:
        """Add a user as an admin of an institution.

        Args:
            institution_id: The institution ID.
            user_id: The user ID to add as admin.

        Returns:
            True if the admin was added, False if already an admin or institution/user not found.
        """
        # Check if already an admin
        if self.is_admin(institution_id, user_id):
            return False

        # Check if institution exists
        institution = self.get_by_id(institution_id)
        if institution is None:
            return False

        # Check if user exists
        user = self.db.query(User).filter(User.id == user_id).first()
        if user is None:
            return False

        # Add the admin relationship
        stmt = institution_admins.insert().values(
            user_id=user_id, institution_id=institution_id
        )
        self.db.execute(stmt)
        self.db.commit()
        return True

    def remove_admin(self, institution_id: int, user_id: int) -> bool:
        """Remove a user as an admin of an institution.

        Args:
            institution_id: The institution ID.
            user_id: The user ID to remove as admin.

        Returns:
            True if the admin was removed, False if not an admin.
        """
        if not self.is_admin(institution_id, user_id):
            return False

        stmt = institution_admins.delete().where(
            (institution_admins.c.user_id == user_id)
            & (institution_admins.c.institution_id == institution_id)
        )
        self.db.execute(stmt)
        self.db.commit()
        return True

    def is_admin(self, institution_id: int, user_id: int) -> bool:
        """Check if a user is an admin of an institution.

        Args:
            institution_id: The institution ID.
            user_id: The user ID to check.

        Returns:
            True if the user is an admin of the institution, False otherwise.
        """
        stmt = select(institution_admins).where(
            (institution_admins.c.user_id == user_id)
            & (institution_admins.c.institution_id == institution_id)
        )
        result = self.db.execute(stmt).first()
        return result is not None
