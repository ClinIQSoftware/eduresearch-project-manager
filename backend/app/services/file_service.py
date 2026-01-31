"""File service for EduResearch Project Manager.

Handles file upload, storage, and retrieval operations for project files.
Supports S3-compatible object storage (Render Object Storage, AWS S3, etc.)
with automatic fallback to local filesystem when S3 is not configured.
"""

import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.project_file import ProjectFile
from app.models.user import User
from app.repositories import FileRepository, ProjectRepository

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".csv",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".zip",
}


class FileService:
    """Service for file management operations."""

    def __init__(self, db: Session, upload_dir: str | None = None) -> None:
        """Initialize the FileService.

        Args:
            db: SQLAlchemy database session.
            upload_dir: Base directory for file uploads (local mode only).
        """
        self.db = db
        self.file_repo = FileRepository(db)
        self.project_repo = ProjectRepository(db)
        self.use_s3 = settings.use_s3

        if not self.use_s3:
            self.upload_dir = upload_dir or settings.upload_dir
            Path(self.upload_dir).mkdir(parents=True, exist_ok=True)

    def _make_object_key(self, enterprise_id, project_id: int, filename: str) -> str:
        """Build the S3 object key for a file."""
        return f"{enterprise_id}/{project_id}/{filename}"

    async def upload_file(
        self, project_id: int, file: UploadFile, uploaded_by: User
    ) -> ProjectFile:
        """Upload a file to a project.

        Args:
            project_id: The ID of the project to upload to.
            file: The file to upload.
            uploaded_by: The user uploading the file.

        Returns:
            The created ProjectFile record.

        Raises:
            NotFoundException: If project not found.
            BadRequestException: If file upload fails.
        """
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project with id {project_id} not found")

        # Validate file size (if known upfront)
        max_size = settings.max_file_size
        if file.size and file.size > max_size:
            raise BadRequestException(
                f"File size exceeds maximum allowed ({max_size // (1024 * 1024)}MB)"
            )

        # Validate file extension
        file_extension = Path(file.filename).suffix.lower() if file.filename else ""
        if file_extension and file_extension not in ALLOWED_EXTENSIONS:
            raise BadRequestException(f"File type '{file_extension}' is not allowed")

        # Generate unique filename to avoid collisions
        file_extension = Path(file.filename).suffix if file.filename else ""
        stored_filename = f"{uuid.uuid4()}{file_extension}"

        if self.use_s3:
            return await self._upload_to_s3(
                project_id, file, uploaded_by, stored_filename, max_size
            )
        else:
            return await self._upload_to_local(
                project_id, file, uploaded_by, stored_filename, max_size
            )

    async def _upload_to_s3(
        self,
        project_id: int,
        file: UploadFile,
        uploaded_by: User,
        stored_filename: str,
        max_size: int,
    ) -> ProjectFile:
        """Upload file to S3 object storage."""
        from app.core.storage import upload_to_s3

        # Read file in chunks, enforcing size limit
        chunks = []
        file_size = 0
        while chunk := await file.read(8192):
            file_size += len(chunk)
            if file_size > max_size:
                raise BadRequestException(
                    f"File size exceeds maximum allowed ({max_size // (1024 * 1024)}MB)"
                )
            chunks.append(chunk)

        data = b"".join(chunks)
        object_key = self._make_object_key(
            uploaded_by.enterprise_id, project_id, stored_filename
        )

        try:
            upload_to_s3(object_key, data, content_type=file.content_type)
        except Exception as e:
            raise BadRequestException(f"Failed to upload file to storage: {str(e)}")

        file_data = {
            "project_id": project_id,
            "uploaded_by_id": uploaded_by.id,
            "filename": stored_filename,
            "original_filename": file.filename or "unnamed",
            "file_path": object_key,
            "file_size": file_size,
            "content_type": file.content_type,
        }

        return self.file_repo.create(file_data)

    async def _upload_to_local(
        self,
        project_id: int,
        file: UploadFile,
        uploaded_by: User,
        stored_filename: str,
        max_size: int,
    ) -> ProjectFile:
        """Upload file to local filesystem."""
        project_dir = Path(self.upload_dir) / str(project_id)
        project_dir.mkdir(parents=True, exist_ok=True)

        file_path = project_dir / stored_filename

        try:
            file_size = 0
            with open(file_path, "wb") as f:
                while chunk := await file.read(8192):
                    file_size += len(chunk)
                    if file_size > max_size:
                        f.close()
                        file_path.unlink(missing_ok=True)
                        raise BadRequestException(
                            f"File size exceeds maximum allowed ({max_size // (1024 * 1024)}MB)"
                        )
                    f.write(chunk)

            file_data = {
                "project_id": project_id,
                "uploaded_by_id": uploaded_by.id,
                "filename": stored_filename,
                "original_filename": file.filename or "unnamed",
                "file_path": str(file_path),
                "file_size": file_size,
                "content_type": file.content_type,
            }

            return self.file_repo.create(file_data)

        except BadRequestException:
            raise
        except Exception as e:
            if file_path.exists():
                file_path.unlink()
            raise BadRequestException(f"Failed to upload file: {str(e)}")

    def delete_file(self, file_id: int) -> bool:
        """Delete a file from the database and storage.

        Args:
            file_id: The ID of the file to delete.

        Returns:
            True if file was deleted.

        Raises:
            NotFoundException: If file not found.
        """
        project_file = self.file_repo.get_by_id(file_id)
        if not project_file:
            raise NotFoundException(f"File with id {file_id} not found")

        if self.use_s3:
            try:
                from app.core.storage import delete_from_s3

                delete_from_s3(project_file.file_path)
            except Exception:
                pass  # Don't fail deletion if storage cleanup fails
        else:
            file_path = Path(project_file.file_path)
            if file_path.exists():
                file_path.unlink()

        return self.file_repo.delete(file_id)

    def get_file(self, file_id: int) -> Optional[ProjectFile]:
        """Get a file by ID.

        Args:
            file_id: The file ID.

        Returns:
            The ProjectFile if found, None otherwise.
        """
        return self.file_repo.get_by_id(file_id)

    def get_project_files(self, project_id: int) -> List[ProjectFile]:
        """Get all files for a project.

        Args:
            project_id: The project ID.

        Returns:
            List of ProjectFiles for the project.
        """
        return self.file_repo.get_by_project(project_id)

    def get_download_url(self, file: ProjectFile) -> str:
        """Get a download URL or path for a file.

        For S3: returns a presigned URL (time-limited, direct download).
        For local: returns the absolute filesystem path.

        Args:
            file: The ProjectFile record.

        Returns:
            Presigned URL (S3) or absolute file path (local).

        Raises:
            NotFoundException: If file does not exist in storage.
        """
        if self.use_s3:
            from app.core.storage import generate_presigned_url, s3_object_exists

            if not s3_object_exists(file.file_path):
                raise NotFoundException(
                    f"File not found in storage: {file.original_filename}"
                )
            return generate_presigned_url(
                object_key=file.file_path,
                filename=file.original_filename,
                content_type=file.content_type,
            )
        else:
            file_path = Path(file.file_path)
            if not file_path.exists():
                raise NotFoundException(
                    f"File not found on filesystem: {file.original_filename}"
                )
            return str(file_path.absolute())

    def get_file_path(self, file: ProjectFile) -> str:
        """Get the full filesystem path for a file (local mode only).

        For backwards compatibility. Prefer get_download_url() for new code.

        Args:
            file: The ProjectFile record.

        Returns:
            The full path to the file.

        Raises:
            NotFoundException: If file does not exist on filesystem.
        """
        if self.use_s3:
            raise NotFoundException(
                "Direct file path not available with S3 storage. "
                "Use get_download_url() instead."
            )
        file_path = Path(file.file_path)
        if not file_path.exists():
            raise NotFoundException(
                f"File not found on filesystem: {file.original_filename}"
            )
        return str(file_path.absolute())

    async def read_file_content(self, file_path_or_key: str) -> bytes:
        """Read file content from storage.

        Args:
            file_path_or_key: Local file path or S3 object key.

        Returns:
            File content as bytes.

        Raises:
            NotFoundException: If file does not exist.
        """
        if self.use_s3:
            from app.core.storage import download_from_s3

            try:
                return download_from_s3(file_path_or_key)
            except Exception:
                raise NotFoundException("File not found in storage")
        else:
            path = Path(file_path_or_key)
            if not path.exists():
                raise NotFoundException(f"File not found: {file_path_or_key}")
            return path.read_bytes()
