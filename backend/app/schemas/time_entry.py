from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TimeEntryBase(BaseModel):
    task_id: Optional[int] = None
    notes: Optional[str] = None


class TimeEntryCreate(TimeEntryBase):
    start_time: Optional[datetime] = None


class TimeEntryUpdate(BaseModel):
    task_id: Optional[int] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None


class TimeEntryResponse(TimeEntryBase):
    id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True
