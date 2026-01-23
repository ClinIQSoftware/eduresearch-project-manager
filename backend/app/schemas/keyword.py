from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from app.schemas.project import ProjectWithLead


class KeywordBase(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=100)


class KeywordCreate(KeywordBase):
    pass


class KeywordResponse(KeywordBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class KeywordListResponse(BaseModel):
    keywords: List[KeywordResponse]


class KeywordBulkUpdate(BaseModel):
    keywords: List[str] = Field(..., max_length=20)


class AlertPreferenceBase(BaseModel):
    alert_frequency: str = Field(default="weekly", pattern="^(disabled|daily|weekly|monthly)$")
    dashboard_new_weeks: int = Field(default=2, ge=1, le=8)


class AlertPreferenceUpdate(BaseModel):
    alert_frequency: Optional[str] = Field(default=None, pattern="^(disabled|daily|weekly|monthly)$")
    dashboard_new_weeks: Optional[int] = Field(default=None, ge=1, le=8)


class AlertPreferenceResponse(AlertPreferenceBase):
    id: int
    last_alert_sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MatchedProjectResponse(ProjectWithLead):
    """Project response with list of keywords that matched."""
    matched_keywords: List[str] = []

    class Config:
        from_attributes = True


class ProjectSearchParams(BaseModel):
    """Parameters for manual project search."""
    q: str = Field(..., min_length=1, max_length=200, description="Search query")


class SendAlertsRequest(BaseModel):
    """Request body for cron-triggered alert sending."""
    cron_secret: str
    frequency: Optional[str] = Field(default=None, pattern="^(daily|weekly|monthly)$")
