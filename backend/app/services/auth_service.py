"""Authentication service for EduResearch Project Manager.

Handles user authentication, registration, and token management.
"""

from datetime import datetime, timezone
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, UnauthorizedException
from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories import SystemSettingsRepository, UserRepository
from app.schemas.user import UserCreate


class AuthService:
    """Service for authentication operations."""

    def __init__(self, db: Session) -> None:
        """Initialize the AuthService.

        Args:
            db: SQLAlchemy database session.
        """
        self.db = db
        self.user_repo = UserRepository(db)
        self.system_settings_repo = SystemSettingsRepository(db)

    def login(self, email: str, password: str) -> Tuple[User, str]:
        """Validate user credentials and return user with access token.

        Args:
            email: User's email address.
            password: User's plain text password.

        Returns:
            Tuple of (User, access_token string).

        Raises:
            UnauthorizedException: If credentials are invalid.
            BadRequestException: If user is not active or not approved.
        """
        user = self.user_repo.get_by_email(email)

        if not user:
            raise UnauthorizedException("Invalid email or password")

        # Check for OAuth-only users
        if user.auth_provider != "local" and not user.password_hash:
            raise BadRequestException(
                f"This account uses {user.auth_provider} authentication. "
                "Please sign in with your OAuth provider."
            )

        if not user.password_hash or not verify_password(password, user.password_hash):
            raise UnauthorizedException("Invalid email or password")

        if not user.is_active:
            raise BadRequestException("Your account has been deactivated")

        if not user.is_approved:
            raise BadRequestException(
                "Your account is pending approval. Please wait for an administrator to approve your registration."
            )

        token = self.create_token(user)
        return user, token

    def register(self, data: UserCreate) -> User:
        """Register a new user.

        Args:
            data: User creation data.

        Returns:
            The newly created User.

        Raises:
            BadRequestException: If email is already registered.
        """
        # Check if email already exists
        existing_user = self.user_repo.get_by_email(data.email)
        if existing_user:
            raise BadRequestException("Email is already registered")

        # Check system settings for approval requirement
        system_settings = self.system_settings_repo.get_global()
        require_approval = (
            system_settings.require_registration_approval if system_settings else False
        )

        # Create user data
        user_data = {
            "email": data.email,
            "password_hash": hash_password(data.password),
            "first_name": data.first_name,
            "last_name": data.last_name,
            "phone": data.phone,
            "bio": data.bio,
            "institution_id": data.institution_id,
            "department_id": data.department_id,
            "is_approved": not require_approval,
            "auth_provider": "local",
        }

        if not require_approval:
            user_data["approved_at"] = datetime.now(timezone.utc)

        user = self.user_repo.create(user_data)
        return user

    def register_oauth(
        self,
        email: str,
        first_name: str,
        last_name: str,
        provider: str,
        oauth_id: str,
    ) -> Tuple[User, str]:
        """Register or login a user via OAuth.

        If the user exists with matching OAuth credentials, logs them in.
        If the user exists with email but no OAuth, links the OAuth.
        If the user doesn't exist, creates a new account.

        Args:
            email: User's email from OAuth provider.
            first_name: User's first name from OAuth provider.
            last_name: User's last name from OAuth provider.
            provider: OAuth provider name ('google' or 'microsoft').
            oauth_id: Unique ID from OAuth provider.

        Returns:
            Tuple of (User, access_token string).

        Raises:
            BadRequestException: If user account is not active or not approved.
        """
        existing_user = self.user_repo.get_by_email(email)

        if existing_user:
            # User exists - check if OAuth matches or link OAuth
            if (
                existing_user.auth_provider == provider
                and existing_user.oauth_id == oauth_id
            ):
                # Existing OAuth user - just log in
                pass
            elif existing_user.auth_provider == "local":
                # Link OAuth to existing local account
                self.user_repo.update(
                    existing_user.id,
                    {"auth_provider": provider, "oauth_id": oauth_id},
                )
                existing_user.auth_provider = provider
                existing_user.oauth_id = oauth_id
            elif existing_user.oauth_id != oauth_id:
                # Different OAuth provider/ID - update
                self.user_repo.update(
                    existing_user.id,
                    {"auth_provider": provider, "oauth_id": oauth_id},
                )
                existing_user.auth_provider = provider
                existing_user.oauth_id = oauth_id

            if not existing_user.is_active:
                raise BadRequestException("Your account has been deactivated")

            if not existing_user.is_approved:
                raise BadRequestException(
                    "Your account is pending approval. Please wait for an administrator to approve your registration."
                )

            token = self.create_token(existing_user)
            return existing_user, token

        # New user - check approval requirements
        system_settings = self.system_settings_repo.get_global()
        require_approval = (
            system_settings.require_registration_approval if system_settings else False
        )

        user_data = {
            "email": email,
            "password_hash": None,
            "first_name": first_name,
            "last_name": last_name,
            "auth_provider": provider,
            "oauth_id": oauth_id,
            "is_approved": not require_approval,
        }

        if not require_approval:
            user_data["approved_at"] = datetime.now(timezone.utc)

        user = self.user_repo.create(user_data)

        if not user.is_approved:
            raise BadRequestException(
                "Your account has been created but requires approval. "
                "Please wait for an administrator to approve your registration."
            )

        token = self.create_token(user)
        return user, token

    def change_password(
        self, user: User, current_password: str, new_password: str
    ) -> bool:
        """Change a user's password.

        Args:
            user: The user changing their password.
            current_password: User's current password.
            new_password: User's new password.

        Returns:
            True if password was changed successfully.

        Raises:
            BadRequestException: If current password is incorrect or user is OAuth-only.
        """
        if user.auth_provider != "local" and not user.password_hash:
            raise BadRequestException(
                "Cannot change password for OAuth-only accounts. "
                "Please set a password first."
            )

        if user.password_hash and not verify_password(
            current_password, user.password_hash
        ):
            raise BadRequestException("Current password is incorrect")

        new_hash = hash_password(new_password)
        self.user_repo.update(user.id, {"password_hash": new_hash})
        return True

    def create_token(self, user: User) -> str:
        """Generate a JWT access token for a user.

        Args:
            user: The user to create a token for.

        Returns:
            The encoded JWT token string.
        """
        return create_access_token(data={"sub": str(user.id)})

    def get_user_from_token(self, token: str) -> Optional[User]:
        """Get a user from a JWT token.

        Args:
            token: The JWT token string.

        Returns:
            The User if token is valid and user exists, None otherwise.
        """
        payload = decode_token(token)
        if not payload:
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            return None

        return self.user_repo.get_by_id(user_id)
