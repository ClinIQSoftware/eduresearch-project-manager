import os
import uuid
import aiofiles
from typing import Optional, Tuple
from fastapi import UploadFile
from app.config import settings


async def save_uploaded_file(file: UploadFile, project_id: int) -> Tuple[str, str, int]:
    """
    Save an uploaded file to the uploads directory.
    Returns: (stored_filename, file_path, file_size)
    """
    # Create project-specific directory
    project_dir = os.path.join(settings.upload_dir, str(project_id))
    os.makedirs(project_dir, exist_ok=True)

    # Generate unique filename to avoid collisions
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
    stored_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(project_dir, stored_filename)

    # Save file asynchronously
    content = await file.read()
    file_size = len(content)

    # Check file size
    if file_size > settings.max_file_size:
        raise ValueError(
            f"File size exceeds maximum allowed size of {settings.max_file_size} bytes"
        )

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    return stored_filename, file_path, file_size


async def read_file(file_path: str) -> Optional[bytes]:
    """Read a file from the filesystem."""
    if not os.path.exists(file_path):
        return None

    async with aiofiles.open(file_path, "rb") as f:
        return await f.read()


def delete_file(file_path: str) -> bool:
    """Delete a file from the filesystem."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception:
        return False


def get_content_type(filename: str) -> str:
    """Get content type based on file extension."""
    ext = os.path.splitext(filename)[1].lower()
    content_types = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".txt": "text/plain",
        ".csv": "text/csv",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".zip": "application/zip",
        ".rar": "application/x-rar-compressed",
    }
    return content_types.get(ext, "application/octet-stream")
