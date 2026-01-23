"""Department repository for department-specific database operations."""

from typing import List

from sqlalchemy.orm import Session

from app.models.department import Department
from app.repositories.base import BaseRepository


class DepartmentRepository(BaseRepository[Department]):
    """Repository for Department model with additional department-specific queries."""

    def __init__(self, db: Session) -> None:
        """Initialize the DepartmentRepository.

        Args:
            db: SQLAlchemy database session.
        """
        super().__init__(db, Department)

    def get_by_institution(self, institution_id: int) -> List[Department]:
        """Get all departments belonging to an institution.

        Args:
            institution_id: The institution ID to filter by.

        Returns:
            List of departments in the specified institution.
        """
        return (
            self.db.query(Department)
            .filter(Department.institution_id == institution_id)
            .all()
        )
