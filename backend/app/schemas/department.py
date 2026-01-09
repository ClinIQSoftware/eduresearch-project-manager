from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.schemas.user import UserBrief


class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    institution_id: int


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class DepartmentResponse(DepartmentBase):
    id: int
    institution_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DepartmentWithMembers(DepartmentResponse):
    users: List[UserBrief] = []

    class Config:
        from_attributes = True


class DepartmentBrief(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True
