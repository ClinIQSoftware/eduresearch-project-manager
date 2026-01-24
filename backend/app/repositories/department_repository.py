"""Department repository for department-specific database operations."""

from typing import Any, List
from uuid import UUID

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

    def create(
        self,
        *,
        name: str,
        institution_id: int,
        enterprise_id: UUID,
        **kwargs: Any,
    ) -> Department:
        """Create a new department.

        Args:
            name: Department name.
            institution_id: ID of the institution this department belongs to.
            enterprise_id: The enterprise/tenant ID this department belongs to.
            **kwargs: Additional optional fields.

        Returns:
            The newly created department.
        """
        department = Department(
            name=name,
            institution_id=institution_id,
            enterprise_id=enterprise_id,
            **kwargs,
        )
        self.db.add(department)
        self.db.commit()
        self.db.refresh(department)
        return department

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
