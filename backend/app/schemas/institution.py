from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.schemas.user import UserBrief


class InstitutionBase(BaseModel):
    name: str
    description: Optional[str] = None


class InstitutionCreate(InstitutionBase):
    pass


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class InstitutionResponse(InstitutionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InstitutionWithMembers(InstitutionResponse):
    admins: List[UserBrief] = []

    class Config:
        from_attributes = True


class AddMemberRequest(BaseModel):
    user_id: int
    is_admin: bool = False
