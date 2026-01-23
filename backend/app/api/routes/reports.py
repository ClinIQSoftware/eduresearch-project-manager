from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.api.deps import get_db, get_current_user
from app.models.project import Project
from app.models.project_member import ProjectMember, MemberRole
from app.models.task import Task
from app.models.user import User
from pydantic import BaseModel


router = APIRouter()


class ProjectWithLeadReport(BaseModel):
    id: int
    title: str
    classification: str
    status: str
    open_to_participants: bool
    start_date: Optional[str] = None
    last_status_change: Optional[str] = None
    lead_id: Optional[int] = None
    lead_name: Optional[str] = None
    lead_email: Optional[str] = None

    class Config:
        from_attributes = True


class LeadWithProjects(BaseModel):
    id: int
    name: str
    email: str
    department_id: Optional[int] = None
    projects: List[dict]

    class Config:
        from_attributes = True


class UserWithProjects(BaseModel):
    id: int
    name: str
    email: str
    department_id: Optional[int] = None
    projects: List[dict]

    class Config:
        from_attributes = True


class ReportsOverview(BaseModel):
    total_projects: int
    active_projects: int
    total_tasks: int
    open_tasks: int
    overdue_tasks: int
    completed_this_month: int
    total_members: int
    projects_by_status: dict
    projects_by_classification: dict

    class Config:
        from_attributes = True


@router.get("/projects-with-leads", response_model=List[ProjectWithLeadReport])
def get_projects_with_leads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all projects with their lead information."""
    query = db.query(Project).options(joinedload(Project.lead))

    # Filter by institution unless superuser
    if not current_user.is_superuser and current_user.institution_id:
        query = query.filter(Project.institution_id == current_user.institution_id)

    projects = query.order_by(Project.title).all()

    result = []
    for project in projects:
        result.append(ProjectWithLeadReport(
            id=project.id,
            title=project.title,
            classification=project.classification or None,
            status=project.status or None,
            open_to_participants=project.open_to_participants,
            start_date=str(project.start_date) if project.start_date else None,
            last_status_change=str(project.last_status_change) if project.last_status_change else None,
            lead_id=project.lead_id,
            lead_name=project.lead.name if project.lead else None,
            lead_email=project.lead.email if project.lead else None
        ))

    return result


@router.get("/leads-with-projects", response_model=List[LeadWithProjects])
def get_leads_with_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all active leads with their projects."""
    # Get users who are leads of at least one project
    query = db.query(User).join(
        Project, Project.lead_id == User.id
    ).distinct()

    # Filter by institution
    if not current_user.is_superuser and current_user.institution_id:
        query = query.filter(User.institution_id == current_user.institution_id)

    leads = query.order_by(User.first_name, User.last_name).all()

    result = []
    for lead in leads:
        # Get projects for this lead
        projects_query = db.query(Project).filter(Project.lead_id == lead.id)

        if not current_user.is_superuser and current_user.institution_id:
            projects_query = projects_query.filter(
                Project.institution_id == current_user.institution_id
            )

        projects = projects_query.all()

        result.append(LeadWithProjects(
            id=lead.id,
            name=lead.name,
            email=lead.email,
            department_id=lead.department_id,
            projects=[{
                "id": p.id,
                "title": p.title,
                "status": p.status or None,
                "classification": p.classification or None
            } for p in projects]
        ))

    return result


@router.get("/users-with-projects", response_model=List[UserWithProjects])
def get_users_with_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all users with their project involvement."""
    # Get users who are members of at least one project
    query = db.query(User).join(
        ProjectMember, ProjectMember.user_id == User.id
    ).distinct()

    # Filter by institution
    if not current_user.is_superuser and current_user.institution_id:
        query = query.filter(User.institution_id == current_user.institution_id)

    users = query.order_by(User.first_name, User.last_name).all()

    result = []
    for user in users:
        # Get project memberships
        memberships = db.query(ProjectMember).options(
            joinedload(ProjectMember.project)
        ).filter(ProjectMember.user_id == user.id).all()

        # Filter by institution
        if not current_user.is_superuser and current_user.institution_id:
            memberships = [
                m for m in memberships
                if m.project and m.project.institution_id == current_user.institution_id
            ]

        result.append(UserWithProjects(
            id=user.id,
            name=user.name,
            email=user.email,
            department_id=user.department_id,
            projects=[{
                "id": m.project.id,
                "title": m.project.title,
                "role": m.role or "participant",
                "status": m.project.status or None
            } for m in memberships if m.project]
        ))

    return result


@router.get("/overview", response_model=ReportsOverview)
def get_reports_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get aggregated statistics for reports dashboard."""
    # Base query filters
    project_filter = []
    if not current_user.is_superuser and current_user.institution_id:
        project_filter.append(Project.institution_id == current_user.institution_id)

    # Project counts
    projects_query = db.query(Project)
    if project_filter:
        projects_query = projects_query.filter(*project_filter)

    total_projects = projects_query.count()
    active_projects = projects_query.filter(Project.status == 'active').count()

    # Project status breakdown
    status_counts = db.query(
        Project.status, func.count(Project.id)
    ).filter(*project_filter).group_by(Project.status).all()
    projects_by_status = {s or 'unknown': c for s, c in status_counts}

    # Project classification breakdown
    class_counts = db.query(
        Project.classification, func.count(Project.id)
    ).filter(*project_filter).group_by(Project.classification).all()
    projects_by_classification = {c or 'unclassified': cnt for c, cnt in class_counts}

    # Task counts - get project IDs first
    project_ids = [p.id for p in projects_query.all()]

    tasks_query = db.query(Task).filter(Task.project_id.in_(project_ids)) if project_ids else db.query(Task).filter(False)

    total_tasks = tasks_query.count()
    open_tasks = tasks_query.filter(Task.status.in_(['open', 'in_progress'])).count()

    # Overdue tasks
    today = datetime.utcnow().date()
    overdue_tasks = tasks_query.filter(
        Task.status.in_(['open', 'in_progress']),
        Task.due_date < today
    ).count()

    # Completed this month
    first_of_month = today.replace(day=1)
    completed_this_month = tasks_query.filter(
        Task.status == 'completed',
        Task.updated_at >= first_of_month
    ).count()

    # Total members
    members_query = db.query(func.count(func.distinct(ProjectMember.user_id))).join(
        Project, ProjectMember.project_id == Project.id
    )
    if project_filter:
        members_query = members_query.filter(*project_filter)
    total_members = members_query.scalar() or 0

    return ReportsOverview(
        total_projects=total_projects,
        active_projects=active_projects,
        total_tasks=total_tasks,
        open_tasks=open_tasks,
        overdue_tasks=overdue_tasks,
        completed_this_month=completed_this_month,
        total_members=total_members,
        projects_by_status=projects_by_status,
        projects_by_classification=projects_by_classification
    )
