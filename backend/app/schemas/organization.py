from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.schemas.user import UserBrief


class OrganizationBase(BaseModel):
    name: str
    description: Optional[str] = None


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class OrganizationResponse(OrganizationBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrganizationWithMembers(OrganizationResponse):
    admins: List[UserBrief] = []

    class Config:
        from_attributes = True


class AddMemberRequest(BaseModel):
    user_id: int
    is_admin: bool = False
