"""User service for EduResearch Project Manager.

Handles user management operations including profile updates,
approval workflows, and administrative user creation.
"""

import secrets
import string
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import (
    BadRequestException,
    ForbiddenException,
    NotFoundException,
)
from app.core.security import hash_password
from app.models.user import User
from app.repositories import UserRepository
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    """Service for user management operations."""

    def __init__(self, db: Session) -> None:
        """Initialize the UserService.

        Args:
            db: SQLAlchemy database session.
        """
        self.db = db
        self.user_repo = UserRepository(db)

    def get_user(self, user_id: int) -> Optional[User]:
        """Get a user by ID.

        Args:
            user_id: The user's ID.

        Returns:
            The User if found, None otherwise.
        """
        return self.user_repo.get_by_id(user_id)

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get a user by email address.

        Args:
            email: The user's email address.

        Returns:
            The User if found, None otherwise.
        """
        return self.user_repo.get_by_email(email)

    def update_profile(self, user: User, data: UserUpdate) -> User:
        """Update a user's profile.

        Args:
            user: The user to update.
            data: The update data.

        Returns:
            The updated User.

        Raises:
            BadRequestException: If email is already taken by another user.
        """
        update_data = data.model_dump(exclude_unset=True)

        # Check if email is being changed and if it's available
        if "email" in update_data and update_data["email"] != user.email:
            existing = self.user_repo.get_by_email(update_data["email"])
            if existing:
                raise BadRequestException("Email is already taken")

        updated_user = self.user_repo.update(user.id, update_data)
        if not updated_user:
            raise NotFoundException("User not found")

        return updated_user

    def approve_user(self, user_id: int, approved_by: User) -> User:
        """Approve a pending user registration.

        Args:
            user_id: The ID of the user to approve.
            approved_by: The admin user performing the approval.

        Returns:
            The approved User.

        Raises:
            NotFoundException: If user not found.
            BadRequestException: If user is already approved.
            ForbiddenException: If approver is not a superuser.
        """
        if not approved_by.is_superuser:
            raise ForbiddenException("Only superusers can approve users")

        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(f"User with id {user_id} not found")

        if user.is_approved:
            raise BadRequestException("User is already approved")

        updated_user = self.user_repo.update(
            user_id,
            {
                "is_approved": True,
                "approved_at": datetime.now(timezone.utc),
                "approved_by_id": approved_by.id,
            },
        )

        return updated_user

    def reject_user(self, user_id: int) -> bool:
        """Reject and delete a pending user registration.

        Args:
            user_id: The ID of the user to reject.

        Returns:
            True if user was deleted.

        Raises:
            NotFoundException: If user not found.
            BadRequestException: If user is already approved.
        """
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(f"User with id {user_id} not found")

        if user.is_approved:
            raise BadRequestException("Cannot reject an already approved user")

        return self.user_repo.delete(user_id)

    def get_pending_users(self) -> List[User]:
        """Get all users pending approval.

        Returns:
            List of Users with is_approved=False.
        """
        return self.user_repo.get_pending_approval()

    def create_user_admin(
        self, data: UserCreate, created_by: User, send_email: bool = True
    ) -> User:
        """Create a new user as an administrator.

        Creates a user with a temporary password that should be
        changed on first login.

        Args:
            data: User creation data.
            created_by: The admin creating the user.
            send_email: Whether to send welcome email with temp password.

        Returns:
            Tuple of (User, temporary_password) if send_email is True,
            otherwise just the User.

        Raises:
            ForbiddenException: If creator is not a superuser.
            BadRequestException: If email is already registered.
        """
        if not created_by.is_superuser:
            raise ForbiddenException("Only superusers can create users")

        # Check if email already exists
        existing_user = self.user_repo.get_by_email(data.email)
        if existing_user:
            raise BadRequestException("Email is already registered")

        # Generate temporary password
        temp_password = self._generate_temp_password()

        user_data = {
            "email": data.email,
            "password_hash": hash_password(temp_password),
            "first_name": data.first_name,
            "last_name": data.last_name,
            "phone": getattr(data, "phone", None),
            "bio": getattr(data, "bio", None),
            "institution_id": data.institution_id,
            "department_id": data.department_id,
            "is_approved": True,  # Admin-created users are auto-approved
            "approved_at": datetime.now(timezone.utc),
            "approved_by_id": created_by.id,
            "auth_provider": "local",
        }

        user = self.user_repo.create(user_data)

        # Store temp password on user object for email service to use
        user._temp_password = temp_password

        return user

    def deactivate_user(self, user_id: int) -> bool:
        """Deactivate a user account.

        Args:
            user_id: The ID of the user to deactivate.

        Returns:
            True if user was deactivated.

        Raises:
            NotFoundException: If user not found.
        """
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(f"User with id {user_id} not found")

        self.user_repo.update(user_id, {"is_active": False})
        return True

    def make_superuser(self, user_id: int) -> User:
        """Promote a user to superuser status.

        Args:
            user_id: The ID of the user to promote.

        Returns:
            The updated User.

        Raises:
            NotFoundException: If user not found.
        """
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(f"User with id {user_id} not found")

        updated_user = self.user_repo.update(user_id, {"is_superuser": True})
        return updated_user

    def update_user_admin(self, user_id: int, data) -> User:
        """Update user as admin (can modify is_active, is_superuser, etc.).

        Args:
            user_id: The ID of the user to update.
            data: Update data (can be dict or Pydantic model).

        Returns:
            The updated User.

        Raises:
            NotFoundException: If user not found.
        """
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(f"User with id {user_id} not found")

        # Handle both dict and Pydantic model inputs
        if hasattr(data, "model_dump"):
            update_data = data.model_dump(exclude_unset=True)
        elif hasattr(data, "dict"):
            update_data = data.dict(exclude_unset=True)
        else:
            update_data = dict(data)

        # Filter out None values
        update_data = {k: v for k, v in update_data.items() if v is not None}

        updated_user = self.user_repo.update(user_id, update_data)
        return updated_user

    def _generate_temp_password(self, length: int = 12) -> str:
        """Generate a secure temporary password.

        Args:
            length: Length of the password (default: 12).

        Returns:
            A random password string.
        """
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        # Ensure at least one of each required character type
        password = [
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.ascii_lowercase),
            secrets.choice(string.digits),
            secrets.choice("!@#$%^&*"),
        ]
        # Fill the rest randomly
        password.extend(secrets.choice(alphabet) for _ in range(length - len(password)))
        # Shuffle to avoid predictable positions
        secrets.SystemRandom().shuffle(password)
        return "".join(password)
