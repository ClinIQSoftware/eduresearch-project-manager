from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.project_member import ProjectMember
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.dependencies import get_current_user

router = APIRouter()


def is_project_member(db: Session, user_id: int, project_id: int) -> bool:
    """Check if user is a member of the project."""
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()
    return member is not None


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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

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
