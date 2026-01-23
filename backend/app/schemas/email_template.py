from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EmailTemplateBase(BaseModel):
    template_type: str
    subject: str
    body: str
    is_active: bool = True


class EmailTemplateCreate(EmailTemplateBase):
    institution_id: Optional[int] = None


class EmailTemplateUpdate(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None
    is_active: Optional[bool] = None


class EmailTemplateResponse(EmailTemplateBase):
    id: int
    institution_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TestEmailRequest(BaseModel):
    template_type: str
    recipient_email: str
