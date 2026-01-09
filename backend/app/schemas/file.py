from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.schemas.user import UserBrief


class FileUploadResponse(BaseModel):
    id: int
    project_id: int
    uploaded_by_id: int
    filename: str
    original_filename: str
    file_size: int
    content_type: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class FileWithUploader(FileUploadResponse):
    uploaded_by: UserBrief

    class Config:
        from_attributes = True
