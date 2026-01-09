from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List
from app.database import get_db
from app.models.task import Task, TaskStatus
from app.models.time_entry import TimeEntry
from app.models.project import Project

router = APIRouter()


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    total_tasks = db.query(Task).count()
    completed_tasks = db.query(Task).filter(Task.status == TaskStatus.COMPLETED).count()
    in_progress_tasks = db.query(Task).filter(Task.status == TaskStatus.IN_PROGRESS).count()

    total_time = db.query(func.sum(TimeEntry.duration)).scalar() or 0

    # Time tracked today
    today = datetime.utcnow().date()
    today_time = db.query(func.sum(TimeEntry.duration)).filter(
        func.date(TimeEntry.start_time) == today
    ).scalar() or 0

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "pending_tasks": total_tasks - completed_tasks - in_progress_tasks,
        "completion_rate": round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1),
        "total_time_minutes": round(total_time, 1),
        "today_time_minutes": round(today_time, 1),
    }


@router.get("/time-by-project")
def get_time_by_project(db: Session = Depends(get_db)):
    results = db.query(
        Project.id,
        Project.name,
        Project.color,
        func.coalesce(func.sum(TimeEntry.duration), 0).label("total_minutes")
    ).outerjoin(
        Task, Task.project_id == Project.id
    ).outerjoin(
        TimeEntry, TimeEntry.task_id == Task.id
    ).group_by(
        Project.id, Project.name, Project.color
    ).all()

    return [
        {
            "project_id": r.id,
            "project_name": r.name,
            "color": r.color,
            "total_minutes": round(r.total_minutes, 1)
        }
        for r in results
    ]


@router.get("/tasks-completed")
def get_tasks_completed(days: int = 7, db: Session = Depends(get_db)):
    start_date = datetime.utcnow() - timedelta(days=days)

    # Get task completion by day
    results = db.query(
        func.date(Task.updated_at).label("date"),
        func.count(Task.id).label("count")
    ).filter(
        Task.status == TaskStatus.COMPLETED,
        Task.updated_at >= start_date
    ).group_by(
        func.date(Task.updated_at)
    ).order_by(
        func.date(Task.updated_at)
    ).all()

    return [
        {"date": str(r.date), "completed": r.count}
        for r in results
    ]


@router.get("/daily-time")
def get_daily_time(days: int = 7, db: Session = Depends(get_db)):
    start_date = datetime.utcnow() - timedelta(days=days)

    results = db.query(
        func.date(TimeEntry.start_time).label("date"),
        func.sum(TimeEntry.duration).label("total_minutes")
    ).filter(
        TimeEntry.start_time >= start_date
    ).group_by(
        func.date(TimeEntry.start_time)
    ).order_by(
        func.date(TimeEntry.start_time)
    ).all()

    return [
        {"date": str(r.date), "minutes": round(r.total_minutes or 0, 1)}
        for r in results
    ]
