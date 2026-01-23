"""Task service for EduResearch Project Manager.

Handles task management operations including CRUD,
assignment, and status tracking.
"""

from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.task import Task
from app.models.user import User
from app.repositories import TaskRepository
from app.schemas.task import TaskCreate, TaskUpdate


class TaskService:
    """Service for task management operations."""

    def __init__(self, db: Session) -> None:
        """Initialize the TaskService.

        Args:
            db: SQLAlchemy database session.
        """
        self.db = db
        self.task_repo = TaskRepository(db)

    def create_task(self, data: TaskCreate, created_by: User) -> Task:
        """Create a new task.

        Args:
            data: Task creation data.
            created_by: The user creating the task.

        Returns:
            The newly created Task.
        """
        task_data = data.model_dump()
        task_data["created_by_id"] = created_by.id

        task = self.task_repo.create(task_data)
        return task

    def update_task(self, task_id: int, data: TaskUpdate) -> Task:
        """Update an existing task.

        Args:
            task_id: The ID of the task to update.
            data: The update data.

        Returns:
            The updated Task.

        Raises:
            NotFoundException: If task not found.
        """
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise NotFoundException(f"Task with id {task_id} not found")

        update_data = data.model_dump(exclude_unset=True)
        updated_task = self.task_repo.update(task_id, update_data)

        return updated_task

    def delete_task(self, task_id: int) -> bool:
        """Delete a task.

        Args:
            task_id: The ID of the task to delete.

        Returns:
            True if task was deleted.

        Raises:
            NotFoundException: If task not found.
        """
        task = self.task_repo.get_by_id(task_id)
        if not task:
            raise NotFoundException(f"Task with id {task_id} not found")

        return self.task_repo.delete(task_id)

    def get_task(self, task_id: int) -> Optional[Task]:
        """Get a task by ID.

        Args:
            task_id: The task ID.

        Returns:
            The Task if found, None otherwise.
        """
        return self.task_repo.get_by_id(task_id)

    def get_project_tasks(self, project_id: int) -> List[Task]:
        """Get all tasks for a project.

        Args:
            project_id: The project ID.

        Returns:
            List of Tasks in the project.
        """
        return self.task_repo.get_by_project(project_id)

    def get_user_tasks(self, user_id: int) -> List[Task]:
        """Get all tasks assigned to a user.

        Args:
            user_id: The user ID.

        Returns:
            List of Tasks assigned to the user.
        """
        return self.task_repo.get_by_assignee(user_id)

    def get_overdue_tasks(self) -> List[Task]:
        """Get all overdue tasks.

        Returns tasks where the due_date is before today
        and the status is not 'completed'.

        Returns:
            List of overdue Tasks.
        """
        return self.task_repo.get_overdue()
