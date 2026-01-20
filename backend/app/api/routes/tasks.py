"""Task routes for EduResearch Project Manager.

Handles task CRUD operations and assignment.
"""
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, is_project_member as check_project_member
from app.models.task import Task
from app.schemas.task import TaskStatus, TaskPriority
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.schemas import (
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from app.services import TaskService, EmailService

router = APIRouter()


def is_project_member(db: Session, user_id: int, project_id: int) -> bool:
    """Check if user is a member of the project."""
    return check_project_member(db, user_id, project_id)


def send_task_assignment_email(
    background_tasks: BackgroundTasks,
    db: Session,
    task: Task,
    assigned_by: User
):
    """Send email notification when task is assigned to a user."""
    if not task.assigned_to_id:
        return

    # Get the assigned user
    assigned_user = db.query(User).filter(User.id == task.assigned_to_id).first()
    if not assigned_user:
        return

    # Get project name if task belongs to a project
    project_name = None
    if task.project_id:
        project = db.query(Project).filter(Project.id == task.project_id).first()
        project_name = project.title if project else None

    # Format due date
    due_date = None
    if task.due_date:
        due_date = task.due_date.strftime("%Y-%m-%d") if hasattr(task.due_date, 'strftime') else str(task.due_date)

    assigned_by_name = f"{assigned_by.first_name} {assigned_by.last_name}".strip()

    email_service = EmailService(db)
    background_tasks.add_task(
        email_service.send_task_assignment,
        assigned_user.email,
        task.title,
        task.description,
        project_name,
        task.priority.value if task.priority else None,
        due_date,
        assigned_by_name
    )


@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    project_id: Optional[int] = None,
    assigned_to_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List tasks with optional filters."""
    task_service = TaskService(db)

    if project_id:
        tasks = task_service.get_project_tasks(project_id)
    elif assigned_to_id:
        tasks = task_service.get_user_tasks(assigned_to_id)
    else:
        # Get all tasks (for now, query directly)
        query = db.query(Task)
        if status:
            query = query.filter(Task.status == status)
        if priority:
            query = query.filter(Task.priority == priority)
        return query.order_by(Task.created_at.desc()).all()

    # Apply additional filters
    if status:
        tasks = [t for t in tasks if t.status == status]
    if priority:
        tasks = [t for t in tasks if t.priority == priority]

    return tasks


@router.get("/my", response_model=List[TaskResponse])
def get_my_tasks(
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tasks assigned to current user."""
    task_service = TaskService(db)
    tasks = task_service.get_user_tasks(current_user.id)

    if status:
        tasks = [t for t in tasks if t.status == status]
    if priority:
        tasks = [t for t in tasks if t.priority == priority]

    return tasks


@router.get("/overdue", response_model=List[TaskResponse])
def get_overdue_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overdue tasks."""
    task_service = TaskService(db)
    return task_service.get_overdue_tasks()


@router.post("/", response_model=TaskResponse)
def create_task(
    task_data: TaskCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task."""
    # If task is for a project, verify user is a member
    if task_data.project_id:
        if not is_project_member(db, current_user.id, task_data.project_id) and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a project member to create tasks for this project"
            )

        # If assigning to someone, verify they are also a project member
        if task_data.assigned_to_id:
            if not is_project_member(db, task_data.assigned_to_id, task_data.project_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assigned user must be a project member"
                )

    task_service = TaskService(db)

    try:
        task = task_service.create_task(task_data, current_user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Send assignment email if task is assigned to someone (other than creator)
    if task.assigned_to_id and task.assigned_to_id != current_user.id:
        send_task_assignment_email(background_tasks, db, task, current_user)

    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a task by ID."""
    task_service = TaskService(db)
    task = task_service.get_task(task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a task."""
    task_service = TaskService(db)
    task = task_service.get_task(task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Track if assignment is changing
    old_assigned_to_id = task.assigned_to_id
    new_assigned_to_id = task_data.assigned_to_id if task_data.assigned_to_id is not None else old_assigned_to_id

    # If task belongs to a project, verify user is a member
    if task.project_id:
        if not is_project_member(db, current_user.id, task.project_id) and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a project member to update this task"
            )

        # If changing assignment, verify new assignee is a project member
        if task_data.assigned_to_id is not None:
            if task_data.assigned_to_id and not is_project_member(db, task_data.assigned_to_id, task.project_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assigned user must be a project member"
                )

    try:
        updated_task = task_service.update_task(task_id, task_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Send assignment email if task is newly assigned to someone different
    if (new_assigned_to_id and
        new_assigned_to_id != old_assigned_to_id and
        new_assigned_to_id != current_user.id):
        send_task_assignment_email(background_tasks, db, updated_task, current_user)

    return updated_task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a task."""
    task_service = TaskService(db)
    task = task_service.get_task(task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # If task belongs to a project, verify user is a member
    if task.project_id:
        if not is_project_member(db, current_user.id, task.project_id) and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a project member to delete this task"
            )

    try:
        task_service.delete_task(task_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {"message": "Task deleted successfully"}
