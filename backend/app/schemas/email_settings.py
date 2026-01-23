from pydantic import BaseModel, EmailStr
from typing import Optional


class EmailSettingsBase(BaseModel):
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    from_email: Optional[EmailStr] = None
    from_name: str = "EduResearch Project Manager"
    is_active: bool = True


class EmailSettingsCreate(EmailSettingsBase):
    smtp_password: Optional[str] = None
    institution_id: Optional[int] = None


class EmailSettingsUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[EmailStr] = None
    from_name: Optional[str] = None
    is_active: Optional[bool] = None


class EmailSettingsResponse(EmailSettingsBase):
    id: int
    institution_id: Optional[int] = None

    class Config:
        from_attributes = True
