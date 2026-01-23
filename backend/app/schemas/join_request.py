"""Join request schemas for EduResearch Project Manager."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserBrief


# Type alias for request status
RequestStatus = Literal["pending", "approved", "rejected"]


class JoinRequestCreate(BaseModel):
    """Schema for creating a join request."""

    project_id: int
    message: Optional[str] = Field(None, max_length=1000)


class RespondToJoinRequest(BaseModel):
    """Schema for responding to a join request (approve/reject)."""

    status: Literal["approved", "rejected"]


# Alias for backward compatibility
JoinRequestResponseAction = RespondToJoinRequest


class JoinRequestResponse(BaseModel):
    """Schema for join request response."""

    id: int
    project_id: int
    user_id: int
    message: Optional[str] = None
    status: RequestStatus
    created_at: datetime
    responded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class JoinRequestDetail(JoinRequestResponse):
    """Detailed join request with user information."""

    user: UserBrief

    model_config = ConfigDict(from_attributes=True)


# Alias for backward compatibility
JoinRequestWithUser = JoinRequestDetail


class JoinRequestWithProject(JoinRequestResponse):
    """Join request with project information."""

    project_title: str
    project_lead_name: str

    model_config = ConfigDict(from_attributes=True)
