"""Department service for EduResearch Project Manager.

Handles department management operations including CRUD
and institution-based queries.
"""

from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.department import Department
from app.repositories import DepartmentRepository, InstitutionRepository
from app.schemas.department import DepartmentCreate, DepartmentUpdate


class DepartmentService:
    """Service for department management operations."""

    def __init__(self, db: Session) -> None:
        """Initialize the DepartmentService.

        Args:
            db: SQLAlchemy database session.
        """
        self.db = db
        self.department_repo = DepartmentRepository(db)
        self.institution_repo = InstitutionRepository(db)

    def create_department(self, data: DepartmentCreate) -> Department:
        """Create a new department.

        Args:
            data: Department creation data.

        Returns:
            The newly created Department.

        Raises:
            NotFoundException: If institution not found.
        """
        # Verify institution exists
        institution = self.institution_repo.get_by_id(data.institution_id)
        if not institution:
            raise NotFoundException(
                f"Institution with id {data.institution_id} not found"
            )

        department_data = data.model_dump()
        department = self.department_repo.create(department_data)
        return department

    def update_department(
        self, department_id: int, data: DepartmentUpdate
    ) -> Department:
        """Update an existing department.

        Args:
            department_id: The ID of the department to update.
            data: The update data.

        Returns:
            The updated Department.

        Raises:
            NotFoundException: If department not found.
        """
        department = self.department_repo.get_by_id(department_id)
        if not department:
            raise NotFoundException(f"Department with id {department_id} not found")

        update_data = data.model_dump(exclude_unset=True)
        updated_department = self.department_repo.update(department_id, update_data)

        return updated_department

    def delete_department(self, department_id: int) -> bool:
        """Delete a department.

        Args:
            department_id: The ID of the department to delete.

        Returns:
            True if department was deleted.

        Raises:
            NotFoundException: If department not found.
        """
        department = self.department_repo.get_by_id(department_id)
        if not department:
            raise NotFoundException(f"Department with id {department_id} not found")

        return self.department_repo.delete(department_id)

    def get_department(self, department_id: int) -> Optional[Department]:
        """Get a department by ID.

        Args:
            department_id: The department ID.

        Returns:
            The Department if found, None otherwise.
        """
        return self.department_repo.get_by_id(department_id)

    def get_by_institution(self, institution_id: int) -> List[Department]:
        """Get all departments belonging to an institution.

        Args:
            institution_id: The institution ID.

        Returns:
            List of Departments in the institution.

        Raises:
            NotFoundException: If institution not found.
        """
        institution = self.institution_repo.get_by_id(institution_id)
        if not institution:
            raise NotFoundException(f"Institution with id {institution_id} not found")

        return self.department_repo.get_by_institution(institution_id)
