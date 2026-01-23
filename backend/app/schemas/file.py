"""File schemas for EduResearch Project Manager."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserBrief


class FileResponse(BaseModel):
    """Schema for file response."""

    id: int
    filename: str
    original_filename: str
    file_size: int
    content_type: Optional[str] = None
    uploaded_at: datetime
    uploaded_by: UserBrief

    model_config = ConfigDict(from_attributes=True)


class FileUploadResponse(BaseModel):
    """Schema for file upload response (without uploader details)."""

    id: int
    project_id: int
    uploaded_by_id: int
    filename: str
    original_filename: str
    file_size: int
    content_type: Optional[str] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FileWithUploader(FileUploadResponse):
    """File response with uploader information."""

    uploaded_by: UserBrief

    model_config = ConfigDict(from_attributes=True)
