"""File service for EduResearch Project Manager.

Handles file upload, storage, and retrieval operations for project files.
"""

import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.project_file import ProjectFile
from app.models.user import User
from app.repositories import FileRepository, ProjectRepository

# File upload constraints
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
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

    def __init__(self, db: Session, upload_dir: str = "uploads") -> None:
        """Initialize the FileService.

        Args:
            db: SQLAlchemy database session.
            upload_dir: Base directory for file uploads (default: 'uploads').
        """
        self.db = db
        self.file_repo = FileRepository(db)
        self.project_repo = ProjectRepository(db)
        self.upload_dir = upload_dir

        # Ensure upload directory exists
        Path(upload_dir).mkdir(parents=True, exist_ok=True)

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

        # Validate file size
        if file.size and file.size > MAX_FILE_SIZE:
            raise BadRequestException(
                f"File size exceeds maximum allowed ({MAX_FILE_SIZE // (1024 * 1024)}MB)"
            )

        # Validate file extension
        file_extension = Path(file.filename).suffix.lower() if file.filename else ""
        if file_extension and file_extension not in ALLOWED_EXTENSIONS:
            raise BadRequestException(f"File type '{file_extension}' is not allowed")

        # Generate unique filename to avoid collisions
        file_extension = Path(file.filename).suffix if file.filename else ""
        stored_filename = f"{uuid.uuid4()}{file_extension}"

        # Create project-specific subdirectory
        project_dir = Path(self.upload_dir) / str(project_id)
        project_dir.mkdir(parents=True, exist_ok=True)

        file_path = project_dir / stored_filename

        try:
            # Read and save file content
            content = await file.read()
            file_size = len(content)

            with open(file_path, "wb") as f:
                f.write(content)

            # Create database record
            file_data = {
                "project_id": project_id,
                "uploaded_by_id": uploaded_by.id,
                "filename": stored_filename,
                "original_filename": file.filename or "unnamed",
                "file_path": str(file_path),
                "file_size": file_size,
                "content_type": file.content_type,
            }

            project_file = self.file_repo.create(file_data)
            return project_file

        except Exception as e:
            # Clean up file if database operation fails
            if file_path.exists():
                file_path.unlink()
            raise BadRequestException(f"Failed to upload file: {str(e)}")

    def delete_file(self, file_id: int) -> bool:
        """Delete a file from the database and filesystem.

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

        # Delete from filesystem
        file_path = Path(project_file.file_path)
        if file_path.exists():
            file_path.unlink()

        # Delete from database
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

    def get_file_path(self, file: ProjectFile) -> str:
        """Get the full filesystem path for a file.

        Args:
            file: The ProjectFile record.

        Returns:
            The full path to the file.

        Raises:
            NotFoundException: If file does not exist on filesystem.
        """
        file_path = Path(file.file_path)
        if not file_path.exists():
            raise NotFoundException(
                f"File not found on filesystem: {file.original_filename}"
            )
        return str(file_path.absolute())
