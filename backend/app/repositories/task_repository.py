"""Task repository for task-specific database operations."""

from datetime import date
from typing import Any, List
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.task import Task
from app.repositories.base import BaseRepository


class TaskRepository(BaseRepository[Task]):
    """Repository for Task model with additional task-specific queries."""

    def __init__(self, db: Session) -> None:
        """Initialize the TaskRepository.

        Args:
            db: SQLAlchemy database session.
        """
        super().__init__(db, Task)

    def create(
        self,
        *,
        title: str,
        project_id: int,
        enterprise_id: UUID,
        **kwargs: Any,
    ) -> Task:
        """Create a new task.

        Args:
            title: Task title.
            project_id: ID of the project this task belongs to.
            enterprise_id: The enterprise/tenant ID this task belongs to.
            **kwargs: Additional optional fields.

        Returns:
            The newly created task.
        """
        task = Task(
            title=title,
            project_id=project_id,
            enterprise_id=enterprise_id,
            **kwargs,
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def get_by_project(self, project_id: int) -> List[Task]:
        """Get all tasks for a project.

        Args:
            project_id: The project ID.

        Returns:
            List of tasks in the project.
        """
        return self.db.query(Task).filter(Task.project_id == project_id).all()

    def get_by_assignee(self, user_id: int) -> List[Task]:
        """Get all tasks assigned to a user.

        Args:
            user_id: The user ID.

        Returns:
            List of tasks assigned to the user.
        """
        return self.db.query(Task).filter(Task.assigned_to_id == user_id).all()

    def get_overdue(self) -> List[Task]:
        """Get all overdue tasks.

        Returns tasks where the due_date is before today and
        the status is not 'completed'.

        Returns:
            List of overdue tasks.
        """
        today = date.today()
        return (
            self.db.query(Task)
            .filter(
                Task.due_date.isnot(None),
                Task.due_date < today,
                Task.status != "completed",
            )
            .order_by(Task.due_date)
            .all()
        )
