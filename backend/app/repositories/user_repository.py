"""User repository for user-specific database operations."""

from typing import Any, List, Optional
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User model with additional user-specific queries."""

    def __init__(self, db: Session) -> None:
        """Initialize the UserRepository.

        Args:
            db: SQLAlchemy database session.
        """
        super().__init__(db, User)

    def create(
        self,
        *,
        email: str,
        password_hash: Optional[str],
        first_name: str,
        last_name: str,
        enterprise_id: UUID,
        **kwargs: Any,
    ) -> User:
        """Create a new user.

        Args:
            email: User's email address.
            password_hash: Hashed password.
            first_name: User's first name.
            last_name: User's last name.
            enterprise_id: The enterprise/tenant ID this user belongs to.
            **kwargs: Additional optional fields.

        Returns:
            The newly created user.
        """
        user = User(
            email=email,
            password_hash=password_hash,
            first_name=first_name,
            last_name=last_name,
            enterprise_id=enterprise_id,
            **kwargs,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_by_email(self, email: str) -> Optional[User]:
        """Get a user by their email address.

        Args:
            email: The email address to search for.

        Returns:
            The user if found, None otherwise.
        """
        return self.db.query(User).filter(User.email == email).first()

    def get_pending_approval(self) -> List[User]:
        """Get all users pending approval.

        Returns:
            List of users where is_approved is False.
        """
        return self.db.query(User).filter(User.is_approved.is_(False)).all()

    def get_by_institution(self, institution_id: int) -> List[User]:
        """Get all users belonging to an institution.

        Args:
            institution_id: The institution ID to filter by.

        Returns:
            List of users in the specified institution.
        """
        return self.db.query(User).filter(User.institution_id == institution_id).all()

    def get_by_department(self, department_id: int) -> List[User]:
        """Get all users belonging to a department.

        Args:
            department_id: The department ID to filter by.

        Returns:
            List of users in the specified department.
        """
        return self.db.query(User).filter(User.department_id == department_id).all()

    def search(self, query: str) -> List[User]:
        """Search users by email, first name, or last name.

        Args:
            query: The search query string.

        Returns:
            List of users matching the search criteria.
        """
        search_pattern = f"%{query}%"
        return (
            self.db.query(User)
            .filter(
                or_(
                    User.email.ilike(search_pattern),
                    User.first_name.ilike(search_pattern),
                    User.last_name.ilike(search_pattern),
                )
            )
            .all()
        )
