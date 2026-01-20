from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.dependencies import get_current_user
from app.services.email import email_service
from app.services.notification_service import NotificationService

router = APIRouter()


def get_notification_service(db: Session) -> NotificationService:
    """Get notification service instance."""
    return NotificationService(db)


def is_project_member(db: Session, user_id: int, project_id: int) -> bool:
    """Check if user is a member of the project."""
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()
    return member is not None


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
    query = db.query(Task)

    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if assigned_to_id:
        query = query.filter(Task.assigned_to_id == assigned_to_id)

    return query.order_by(Task.created_at.desc()).all()


@router.post("/", response_model=TaskResponse)
def create_task(
    task: TaskCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # If task is for a project, verify user is a member
    if task.project_id:
        if not is_project_member(db, current_user.id, task.project_id) and not current_user.is_superuser:
            raise HTTPException(
                status_code=403,
                detail="You must be a project member to create tasks for this project"
            )

        # If assigning to someone, verify they are also a project member
        if task.assigned_to_id:
            if not is_project_member(db, task.assigned_to_id, task.project_id):
                raise HTTPException(
                    status_code=400,
                    detail="Assigned user must be a project member"
                )

    db_task = Task(
        **task.model_dump(),
        created_by_id=current_user.id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    # Send assignment email if task is assigned to someone (other than creator)
    if db_task.assigned_to_id and db_task.assigned_to_id != current_user.id:
        send_task_assignment_email(background_tasks, db, db_task, current_user)
        # Also create in-app notification
        notification_service = get_notification_service(db)
        background_tasks.add_task(
            notification_service.notify_task_assigned,
            db_task,
            current_user
        )

    return db_task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task: TaskUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Track if assignment is changing
    old_assigned_to_id = db_task.assigned_to_id
    old_status = db_task.status
    new_assigned_to_id = task.assigned_to_id if task.assigned_to_id is not None else old_assigned_to_id

    # If task belongs to a project, verify user is a member
    if db_task.project_id:
        if not is_project_member(db, current_user.id, db_task.project_id) and not current_user.is_superuser:
            raise HTTPException(
                status_code=403,
                detail="You must be a project member to update this task"
            )

        # If changing assignment, verify new assignee is a project member
        if task.assigned_to_id is not None:
            if task.assigned_to_id and not is_project_member(db, task.assigned_to_id, db_task.project_id):
                raise HTTPException(
                    status_code=400,
                    detail="Assigned user must be a project member"
                )

    update_data = task.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)

    db.commit()
    db.refresh(db_task)

    # Send assignment email if task is newly assigned to someone different
    if (new_assigned_to_id and
        new_assigned_to_id != old_assigned_to_id and
        new_assigned_to_id != current_user.id):
        send_task_assignment_email(background_tasks, db, db_task, current_user)
        # Also create in-app notification
        notification_service = get_notification_service(db)
        background_tasks.add_task(
            notification_service.notify_task_assigned,
            db_task,
            current_user
        )

    # Notify task creator if task was just completed
    if (task.status == TaskStatus.COMPLETED and
        old_status != TaskStatus.COMPLETED and
        db_task.created_by_id and
        db_task.created_by_id != current_user.id):
        notification_service = get_notification_service(db)
        background_tasks.add_task(
            notification_service.notify_task_completed,
            db_task,
            current_user
        )

    return db_task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # If task belongs to a project, verify user is a member
    if task.project_id:
        if not is_project_member(db, current_user.id, task.project_id) and not current_user.is_superuser:
            raise HTTPException(
                status_code=403,
                detail="You must be a project member to delete this task"
            )

    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}
