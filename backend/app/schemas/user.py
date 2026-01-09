from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from app.models.user import AuthProvider


class UserBase(BaseModel):
    email: EmailStr
    name: str
    department: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None


class UserCreate(UserBase):
    password: str
    organization_id: Optional[int] = None


class UserCreateOAuth(BaseModel):
    email: EmailStr
    name: str
    auth_provider: AuthProvider
    oauth_id: str
    organization_id: Optional[int] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None


class UserUpdateAdmin(UserUpdate):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    organization_id: Optional[int] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    auth_provider: AuthProvider
    organization_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserBrief(BaseModel):
    id: int
    email: EmailStr
    name: str
    department: Optional[str] = None

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
