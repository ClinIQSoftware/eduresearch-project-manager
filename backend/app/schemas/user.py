"""User schemas for EduResearch Project Manager."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field


# Type alias for auth provider
AuthProvider = Literal["local", "google", "microsoft"]


class UserBase(BaseModel):
    """Base user schema with common fields."""

    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)


class UserCreate(UserBase):
    """Schema for creating a new user."""

    password: str = Field(..., min_length=8)
    phone: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=2000)
    institution_id: Optional[int] = None
    department_id: Optional[int] = None


class UserCreateAdmin(BaseModel):
    """Schema for admin user creation - password is auto-generated."""

    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)
    institution_id: Optional[int] = None
    department_id: Optional[int] = None
    is_superuser: bool = False


class UserCreateOAuth(BaseModel):
    """Schema for creating a user via OAuth."""

    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)
    auth_provider: AuthProvider
    oauth_id: str
    institution_id: Optional[int] = None
    department_id: Optional[int] = None


class UserUpdate(BaseModel):
    """Schema for updating a user - all fields optional."""

    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=255)
    last_name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=2000)
    institution_id: Optional[int] = None
    department_id: Optional[int] = None


class UserUpdateAdmin(UserUpdate):
    """Admin can also change is_active and is_superuser."""

    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    is_approved: Optional[bool] = None


class UserResponse(BaseModel):
    """Schema for user response."""

    id: int
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    is_active: bool
    is_superuser: bool
    is_approved: bool = True
    approved_at: Optional[datetime] = None
    auth_provider: AuthProvider = "local"
    institution_id: Optional[int] = None
    department_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @computed_field
    @property
    def name(self) -> str:
        """Computed full name for backwards compatibility."""
        return f"{self.first_name} {self.last_name}".strip()

    model_config = ConfigDict(from_attributes=True)


class UserBrief(BaseModel):
    """Brief user schema for nested responses."""

    id: int
    email: EmailStr
    first_name: str
    last_name: str

    @computed_field
    @property
    def name(self) -> str:
        """Computed full name for backwards compatibility."""
        return f"{self.first_name} {self.last_name}".strip()

    model_config = ConfigDict(from_attributes=True)


class PendingUserResponse(UserResponse):
    """User response with approval context."""

    pass
