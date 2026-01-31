"""Project routes for EduResearch Project Manager.

Handles project CRUD operations, membership management, and search.
"""

import logging
from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.api.deps import (
    get_current_enterprise_id,
    get_current_user,
    get_tenant_db,
    get_unscoped_db,
    is_project_lead,
    count_project_leads,
    require_project_lead,
)
from app.config import settings
from app.models.enterprise import Enterprise
from app.models.project import Project
from app.schemas.project import ProjectClassification, ProjectStatus
from app.models.project_member import ProjectMember, MemberRole
from app.models.user import User
from app.schemas import (
    AddProjectMemberRequest,
    ProjectCreate,
    ProjectDetail,
    ProjectMemberInfo,
    ProjectResponse,
    ProjectUpdate,
    ProjectWithLead,
)
from app.services import ProjectService, EmailService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=List[ProjectWithLead])
def get_projects(
    view: Optional[str] = None,
    classification: Optional[ProjectClassification] = None,
    status: Optional[ProjectStatus] = None,
    open_to_participants: Optional[bool] = None,
    institution_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Get all projects with optional filters.

    Args:
        view: Optional view mode - "global" to see all projects
        classification: Filter by project classification
        status: Filter by project status
        open_to_participants: Filter by open to participants flag
        institution_id: Filter by institution ID
    """
    query = db.query(Project).options(
        joinedload(Project.lead),
        joinedload(Project.institution),
        joinedload(Project.department),
    )

    if classification:
        query = query.filter(Project.classification == classification)
    if status:
        query = query.filter(Project.status == status)
    if open_to_participants is not None:
        query = query.filter(Project.open_to_participants == open_to_participants)

    # View-based filtering
    if view == "global":
        pass  # No institution filter for global view
    elif institution_id:
        query = query.filter(Project.institution_id == institution_id)
    elif not current_user.is_superuser and current_user.institution_id:
        query = query.filter(Project.institution_id == current_user.institution_id)

    return query.order_by(Project.created_at.desc()).all()


@router.get("/my", response_model=List[ProjectWithLead])
def get_my_projects(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_tenant_db)
):
    """Get projects where current user is lead or participant."""
    project_service = ProjectService(db)
    return project_service.get_user_projects(current_user.id)


@router.get("/upcoming-deadlines", response_model=List[ProjectWithLead])
def get_upcoming_deadlines(
    weeks: int = Query(
        default=2, ge=1, le=52, description="Number of weeks to look ahead"
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Get projects with deadlines within the specified number of weeks."""
    project_service = ProjectService(db)
    days = weeks * 7
    return project_service.get_upcoming_deadlines(days)


@router.get("/upcoming-meetings", response_model=List[ProjectWithLead])
def get_upcoming_meetings(
    weeks: int = Query(
        default=2, ge=1, le=52, description="Number of weeks to look ahead"
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Get projects with meetings within the specified number of weeks."""
    project_service = ProjectService(db)
    days = weeks * 7
    return project_service.get_upcoming_meetings(days)


@router.get("/search", response_model=List[ProjectWithLead])
def search_projects(
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),
    classification: Optional[ProjectClassification] = None,
    status: Optional[ProjectStatus] = None,
    open_to_participants: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Search projects by keyword in title or description."""
    project_service = ProjectService(db)
    projects = project_service.search_projects(q)

    # Apply additional filters
    if classification:
        projects = [p for p in projects if p.classification == classification]
    if status:
        projects = [p for p in projects if p.status == status]
    if open_to_participants is not None:
        projects = [
            p for p in projects if p.open_to_participants == open_to_participants
        ]

    return projects[:50]  # Limit results


@router.post("", response_model=ProjectResponse)
def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
):
    """Create a new project. Creator becomes the lead."""
    project_service = ProjectService(db)

    # Check project limit
    if enterprise_id:
        enterprise = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
        if enterprise and enterprise.max_projects is not None:
            current_projects = db.query(Project).filter(Project.enterprise_id == enterprise.id).count()
            if current_projects >= enterprise.max_projects:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"code": "PROJECT_LIMIT_REACHED", "max": enterprise.max_projects},
                )

    # Use user's institution if not specified
    if not project_data.institution_id and current_user.institution_id:
        project_data.institution_id = current_user.institution_id

    try:
        project = project_service.create_project(project_data, current_user, enterprise_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return project


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Get project details with members."""
    project_service = ProjectService(db)
    project = project_service.get_project_detail(project_id)

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    background_tasks: BackgroundTasks,
    project: Project = Depends(require_project_lead),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Update project (lead only). Notifies all participants."""
    project_service = ProjectService(db)

    try:
        updated_project = project_service.update_project(project_id, project_data)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Notify participants in background
    members = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id != current_user.id,
        )
        .all()
    )

    if members:
        email_service = EmailService(db)
        member_emails = [
            db.query(User).filter(User.id == m.user_id).first().email for m in members
        ]
        member_emails = [e for e in member_emails if e]

        update_data = project_data.model_dump(exclude_unset=True)
        update_summary = ", ".join([f"{k}: {v}" for k, v in update_data.items()])

        background_tasks.add_task(
            email_service.send_project_update_notification,
            member_emails,
            updated_project.title,
            update_summary,
            current_user.name,
        )

    return updated_project


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    _project: Project = Depends(require_project_lead),
    db: Session = Depends(get_tenant_db),
):
    """Delete project (lead or superuser only)."""
    project_service = ProjectService(db)

    try:
        project_service.delete_project(project_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {"message": "Project deleted successfully"}


@router.get("/{project_id}/members", response_model=List[ProjectMemberInfo])
def get_project_members(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Get project members."""
    project_service = ProjectService(db)
    project = project_service.get_project(project_id)

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    members = (
        db.query(ProjectMember)
        .options(joinedload(ProjectMember.user))
        .filter(ProjectMember.project_id == project_id)
        .all()
    )

    return members


@router.post("/{project_id}/members")
def add_project_member(
    project_id: int,
    member_data: AddProjectMemberRequest,
    _project: Project = Depends(require_project_lead),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
):
    """Add member to project (lead only)."""
    project_service = ProjectService(db)

    # Check if user exists
    user = db.query(User).filter(User.id == member_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    role = member_data.role if member_data.role else "participant"

    try:
        project_service.add_member(project_id, member_data.user_id, enterprise_id, role)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {"message": "Member added successfully"}


@router.delete("/{project_id}/members/{user_id}")
def remove_project_member(
    project_id: int,
    user_id: int,
    _project: Project = Depends(require_project_lead),
    db: Session = Depends(get_tenant_db),
):
    """Remove member from project (lead only)."""
    project_service = ProjectService(db)

    # Check if removing a lead - ensure at least one lead remains
    member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id, ProjectMember.user_id == user_id
        )
        .first()
    )

    if member and member.role == MemberRole.lead:
        lead_count = count_project_leads(db, project_id)
        if lead_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last project lead. Assign another lead first.",
            )

    try:
        project_service.remove_member(project_id, user_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {"message": "Member removed successfully"}


@router.put("/{project_id}/members/{user_id}/role")
def update_member_role(
    project_id: int,
    user_id: int,
    role: str,
    _project: Project = Depends(require_project_lead),
    db: Session = Depends(get_tenant_db),
):
    """Change a member's role (lead only). Ensure at least one lead remains."""
    member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id, ProjectMember.user_id == user_id
        )
        .first()
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Member not found"
        )

    new_role = MemberRole.lead if role == "lead" else MemberRole.participant

    # If demoting from lead, ensure at least one lead remains
    if member.role == MemberRole.lead and new_role == MemberRole.participant:
        lead_count = count_project_leads(db, project_id)
        if lead_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last project lead. Assign another lead first.",
            )

    member.role = new_role
    db.commit()

    return {"message": f"Member role updated to {role}"}


@router.post("/{project_id}/leave")
def leave_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Leave a project. Leads can only leave if other leads exist."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )

    member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
        )
        .first()
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not a member of this project",
        )

    # If user is a lead, ensure at least one lead remains
    if member.role == MemberRole.lead:
        lead_count = count_project_leads(db, project_id)
        if lead_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are the only project lead. Assign another lead before leaving.",
            )

    db.delete(member)
    db.commit()

    return {"message": "You have left the project"}


# Cron job request model
class SendRemindersRequest(BaseModel):
    cron_secret: str


@router.post("/send-reminders")
def send_project_reminders(
    data: SendRemindersRequest, db: Session = Depends(get_unscoped_db)
):
    """Cron-triggered endpoint to send project meeting and deadline reminders."""
    # Validate cron secret
    if not settings.cron_secret or data.cron_secret != settings.cron_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid cron secret"
        )

    today = date.today()
    meeting_reminders_sent = 0
    deadline_reminders_sent = 0
    errors = []

    email_service = EmailService(db)

    # Check if email is configured
    if not email_service.is_configured():
        return {
            "success": False,
            "message": "Email not configured",
            "meeting_reminders_sent": 0,
            "deadline_reminders_sent": 0,
        }

    # Meeting reminders
    meeting_projects = (
        db.query(Project)
        .options(joinedload(Project.members).joinedload(ProjectMember.user))
        .filter(
            Project.meeting_reminder_enabled.is_(True),
            Project.next_meeting_date.isnot(None),
            Project.next_meeting_date >= today,
        )
        .all()
    )

    for project in meeting_projects:
        try:
            days_until = (project.next_meeting_date - today).days

            if days_until != project.meeting_reminder_days:
                continue

            if project.meeting_reminder_sent_date == project.next_meeting_date:
                continue

            member_emails = [
                m.user.email for m in project.members if m.user and m.user.email
            ]

            if not member_emails:
                continue

            email_service.send_meeting_reminder(
                to_emails=member_emails,
                project_title=project.title,
                meeting_date=project.next_meeting_date.strftime("%A, %B %d, %Y"),
                days_until=days_until,
                project_id=project.id,
            )

            project.meeting_reminder_sent_date = project.next_meeting_date
            meeting_reminders_sent += 1

        except Exception as e:
            logger.error(
                f"Error sending meeting reminder for project {project.id}: {str(e)}"
            )
            errors.append(f"Meeting reminder for project {project.id}: {str(e)}")

    # Deadline reminders
    deadline_projects = (
        db.query(Project)
        .options(joinedload(Project.members).joinedload(ProjectMember.user))
        .filter(
            Project.deadline_reminder_enabled.is_(True),
            Project.end_date.isnot(None),
            Project.end_date >= today,
        )
        .all()
    )

    for project in deadline_projects:
        try:
            days_until = (project.end_date - today).days

            if days_until != project.deadline_reminder_days:
                continue

            if project.deadline_reminder_sent_date == project.end_date:
                continue

            member_emails = [
                m.user.email for m in project.members if m.user and m.user.email
            ]

            if not member_emails:
                continue

            email_service.send_deadline_reminder(
                to_emails=member_emails,
                project_title=project.title,
                deadline_date=project.end_date.strftime("%A, %B %d, %Y"),
                days_until=days_until,
                project_id=project.id,
            )

            project.deadline_reminder_sent_date = project.end_date
            deadline_reminders_sent += 1

        except Exception as e:
            logger.error(
                f"Error sending deadline reminder for project {project.id}: {str(e)}"
            )
            errors.append(f"Deadline reminder for project {project.id}: {str(e)}")

    db.commit()

    return {
        "success": True,
        "meeting_reminders_sent": meeting_reminders_sent,
        "deadline_reminders_sent": deadline_reminders_sent,
        "errors": errors if errors else None,
    }
