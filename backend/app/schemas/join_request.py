from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.join_request import RequestStatus
from app.schemas.user import UserBrief


class JoinRequestBase(BaseModel):
    project_id: int
    message: Optional[str] = None


class JoinRequestCreate(JoinRequestBase):
    pass


class JoinRequestResponse(JoinRequestBase):
    id: int
    user_id: int
    status: RequestStatus
    created_at: datetime
    responded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JoinRequestWithUser(JoinRequestResponse):
    user: UserBrief

    class Config:
        from_attributes = True


class JoinRequestWithProject(JoinRequestResponse):
    project_title: str
    project_lead_name: str

    class Config:
        from_attributes = True


class RespondToJoinRequest(BaseModel):
    status: RequestStatus
