"""File repository for project file database operations."""
from typing import List

from sqlalchemy.orm import Session

from app.models.project_file import ProjectFile
from app.repositories.base import BaseRepository


class FileRepository(BaseRepository[ProjectFile]):
    """Repository for ProjectFile model with file-specific queries."""

    def __init__(self, db: Session) -> None:
        """Initialize the FileRepository.

        Args:
            db: SQLAlchemy database session.
        """
        super().__init__(db, ProjectFile)

    def get_by_project(self, project_id: int) -> List[ProjectFile]:
        """Get all files for a project.

        Args:
            project_id: The project ID.

        Returns:
            List of files in the project.
        """
        return (
            self.db.query(ProjectFile)
            .filter(ProjectFile.project_id == project_id)
            .all()
        )
