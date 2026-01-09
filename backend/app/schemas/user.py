from pydantic import BaseModel, EmailStr, computed_field
from datetime import datetime
from typing import Optional
from app.models.user import AuthProvider


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    bio: Optional[str] = None


class UserCreate(UserBase):
    password: str
    institution_id: Optional[int] = None
    department_id: Optional[int] = None


class UserCreateAdmin(BaseModel):
    """Schema for admin user creation - password is auto-generated."""
    email: EmailStr
    first_name: str
    last_name: str
    institution_id: Optional[int] = None
    department_id: Optional[int] = None
    is_superuser: bool = False


class UserCreateOAuth(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    auth_provider: AuthProvider
    oauth_id: str
    institution_id: Optional[int] = None
    department_id: Optional[int] = None


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    email: Optional[EmailStr] = None
    institution_id: Optional[int] = None
    department_id: Optional[int] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class UserUpdateAdmin(UserUpdate):
    """Admin can also change is_active and is_superuser."""
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None


class UserResponse(BaseModel):
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
    auth_provider: AuthProvider
    institution_id: Optional[int] = None
    department_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @computed_field
    @property
    def name(self) -> str:
        """Computed full name for backwards compatibility."""
        return f"{self.first_name} {self.last_name}".strip()

    class Config:
        from_attributes = True


class PendingUserResponse(UserResponse):
    """User response with approval context."""
    pass


class UserBrief(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    institution_id: Optional[int] = None
    department_id: Optional[int] = None

    @computed_field
    @property
    def name(self) -> str:
        """Computed full name for backwards compatibility."""
        return f"{self.first_name} {self.last_name}".strip()

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
