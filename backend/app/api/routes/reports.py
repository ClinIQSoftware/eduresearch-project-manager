from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app.models.project import Project
from app.models.project_member import ProjectMember, MemberRole
from app.models.user import User
from app.dependencies import get_current_user
from pydantic import BaseModel
from typing import Optional


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
    department: Optional[str] = None
    projects: List[dict]

    class Config:
        from_attributes = True


class UserWithProjects(BaseModel):
    id: int
    name: str
    email: str
    department: Optional[str] = None
    projects: List[dict]

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
            classification=project.classification.value if project.classification else None,
            status=project.status.value if project.status else None,
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
            department=lead.department,
            projects=[{
                "id": p.id,
                "title": p.title,
                "status": p.status.value if p.status else None,
                "classification": p.classification.value if p.classification else None
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
            department=user.department,
            projects=[{
                "id": m.project.id,
                "title": m.project.title,
                "role": m.role.value if m.role else "participant",
                "status": m.project.status.value if m.project.status else None
            } for m in memberships if m.project]
        ))

    return result
