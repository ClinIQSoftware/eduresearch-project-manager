from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, select
from typing import List, Optional
from datetime import datetime, date, timedelta
from pydantic import BaseModel
import logging
from app.database import get_db
from app.models.project import Project, ProjectClassification, ProjectStatus
from app.models.project_member import ProjectMember, MemberRole
from app.models.user import User
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectWithLead,
    ProjectDetail, ProjectMemberInfo, AddProjectMemberRequest
)
from app.dependencies import (
    get_current_user, is_project_lead, is_project_member, count_project_leads
)
from app.services.email import email_service, get_email_service_from_db
from app.config import settings

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
    db: Session = Depends(get_db)
):
    """Get all projects with optional filters.

    Args:
        view: Optional view mode - "global" to see all projects, otherwise filters by institution
    """
    query = db.query(Project).options(
        joinedload(Project.lead),
        joinedload(Project.institution),
        joinedload(Project.department)
    )

    if classification:
        query = query.filter(Project.classification == classification)
    if status:
        query = query.filter(Project.status == status)
    if open_to_participants is not None:
        query = query.filter(Project.open_to_participants == open_to_participants)

    # View-based filtering
    if view == "global":
        # Global view - no institution filter, show all projects
        pass
    elif institution_id:
        query = query.filter(Project.institution_id == institution_id)
    elif not current_user.is_superuser and current_user.institution_id:
        # Default: filter by user's institution
        query = query.filter(Project.institution_id == current_user.institution_id)

    return query.order_by(Project.created_at.desc()).all()


@router.get("/my-projects", response_model=List[ProjectWithLead])
def get_my_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get projects where current user is lead or participant."""
    from sqlalchemy import union, select

    # Get project IDs where user is the lead
    lead_project_ids = db.query(Project.id).filter(Project.lead_id == current_user.id)

    # Get project IDs where user is a member
    member_project_ids = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id == current_user.id
    )

    # Combine both sets of project IDs
    all_project_ids = lead_project_ids.union(member_project_ids).subquery()

    # Fetch full project data with lead info
    projects = db.query(Project).options(
        joinedload(Project.lead),
        joinedload(Project.institution),
        joinedload(Project.department)
    ).filter(
        Project.id.in_(select(all_project_ids))
    ).order_by(Project.created_at.desc()).all()

    return projects


@router.get("/upcoming-deadlines", response_model=List[ProjectWithLead])
def get_upcoming_deadlines(
    weeks: int = Query(default=2, ge=1, le=52, description="Number of weeks to look ahead"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get projects with deadlines within the specified number of weeks.

    Returns projects where the user is a member and the deadline is:
    - Set (not null)
    - Today or in the future
    - Within the specified number of weeks

    Sorted by deadline (earliest first).
    """
    today = date.today()
    end_date = today + timedelta(weeks=weeks)

    # Get project IDs where user is a member
    member_project_ids = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id == current_user.id
    ).subquery()

    # Fetch projects with upcoming deadlines
    projects = db.query(Project).options(
        joinedload(Project.lead),
        joinedload(Project.institution),
        joinedload(Project.department)
    ).filter(
        Project.id.in_(select(member_project_ids)),
        Project.end_date.isnot(None),
        Project.end_date >= today,
        Project.end_date <= end_date
    ).order_by(Project.end_date.asc()).all()

    return projects


@router.get("/upcoming-meetings", response_model=List[ProjectWithLead])
def get_upcoming_meetings(
    weeks: int = Query(default=2, ge=1, le=52, description="Number of weeks to look ahead"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get projects with meetings within the specified number of weeks.

    Returns projects where the user is a member and the next meeting is:
    - Set (not null)
    - Today or in the future
    - Within the specified number of weeks

    Sorted by meeting date (earliest first).
    """
    today = date.today()
    end_date = today + timedelta(weeks=weeks)

    # Get project IDs where user is a member
    member_project_ids = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id == current_user.id
    ).subquery()

    # Fetch projects with upcoming meetings
    projects = db.query(Project).options(
        joinedload(Project.lead),
        joinedload(Project.institution),
        joinedload(Project.department)
    ).filter(
        Project.id.in_(select(member_project_ids)),
        Project.next_meeting_date.isnot(None),
        Project.next_meeting_date >= today,
        Project.next_meeting_date <= end_date
    ).order_by(Project.next_meeting_date.asc()).all()

    return projects


@router.get("/search", response_model=List[ProjectWithLead])
def search_projects(
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),
    classification: Optional[ProjectClassification] = None,
    status: Optional[ProjectStatus] = None,
    open_to_participants: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search projects by keyword in title or description."""
    pattern = f"%{q}%"

    query = db.query(Project).options(
        joinedload(Project.lead),
        joinedload(Project.institution),
        joinedload(Project.department)
    ).filter(
        or_(
            Project.title.ilike(pattern),
            Project.description.ilike(pattern)
        )
    )

    if classification:
        query = query.filter(Project.classification == classification)
    if status:
        query = query.filter(Project.status == status)
    if open_to_participants is not None:
        query = query.filter(Project.open_to_participants == open_to_participants)

    return query.order_by(Project.created_at.desc()).limit(50).all()


@router.post("", response_model=ProjectResponse)
def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project. Creator becomes the lead."""
    project = Project(
        **project_data.model_dump(),
        lead_id=current_user.id,
        last_status_change=datetime.utcnow()
    )

    # Use user's institution if not specified
    if not project.institution_id and current_user.institution_id:
        project.institution_id = current_user.institution_id

    db.add(project)
    db.commit()
    db.refresh(project)

    # Add creator as lead member
    member = ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role=MemberRole.lead
    )
    db.add(member)
    db.commit()

    return project


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get project details with members."""
    project = db.query(Project).options(
        joinedload(Project.lead),
        joinedload(Project.institution),
        joinedload(Project.department),
        joinedload(Project.members).joinedload(ProjectMember.user)
    ).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update project (lead only). Notifies all participants."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check lead access (any lead can update)
    if not current_user.is_superuser and not is_project_lead(db, current_user.id, project_id):
        raise HTTPException(status_code=403, detail="Only project lead can update")

    update_data = project_data.model_dump(exclude_unset=True)

    # Track status change
    old_status = project.status
    if "status" in update_data and update_data["status"] != old_status:
        project.last_status_change = datetime.utcnow()

    for key, value in update_data.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)

    # Notify participants in background
    members = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id != current_user.id
    ).all()

    if members:
        member_emails = [
            db.query(User).filter(User.id == m.user_id).first().email
            for m in members
        ]
        member_emails = [e for e in member_emails if e]

        update_summary = ", ".join([f"{k}: {v}" for k, v in update_data.items()])

        background_tasks.add_task(
            email_service.send_project_update_notification,
            member_emails,
            project.title,
            update_summary,
            current_user.name
        )

    return project


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete project (lead only)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Any lead can delete the project
    if not current_user.is_superuser and not is_project_lead(db, current_user.id, project_id):
        raise HTTPException(status_code=403, detail="Only project lead can delete")

    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}


@router.get("/{project_id}/members", response_model=List[ProjectMemberInfo])
def get_project_members(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get project members."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    members = db.query(ProjectMember).options(
        joinedload(ProjectMember.user)
    ).filter(ProjectMember.project_id == project_id).all()

    return members


@router.post("/{project_id}/members")
def add_project_member(
    project_id: int,
    member_data: AddProjectMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add member to project (lead only)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Any lead can add members
    if not current_user.is_superuser and not is_project_lead(db, current_user.id, project_id):
        raise HTTPException(status_code=403, detail="Only project lead can add members")

    # Check if user exists
    user = db.query(User).filter(User.id == member_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already a member
    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == member_data.user_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="User is already a project member")

    # Add member
    role = MemberRole.lead if member_data.role == "lead" else MemberRole.participant
    member = ProjectMember(
        project_id=project_id,
        user_id=member_data.user_id,
        role=role
    )
    db.add(member)
    db.commit()

    return {"message": "Member added successfully"}


@router.delete("/{project_id}/members/{user_id}")
def remove_project_member(
    project_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove member from project (lead only)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Any lead can remove members
    if not current_user.is_superuser and not is_project_lead(db, current_user.id, project_id):
        raise HTTPException(status_code=403, detail="Only project lead can remove members")

    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # If removing a lead, ensure at least one lead remains
    if member.role == MemberRole.lead:
        lead_count = count_project_leads(db, project_id)
        if lead_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove the last project lead. Assign another lead first."
            )

    db.delete(member)
    db.commit()

    return {"message": "Member removed successfully"}


@router.put("/{project_id}/members/{user_id}/role")
def update_member_role(
    project_id: int,
    user_id: int,
    role: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change a member's role (lead only). Ensure at least one lead remains."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Any lead can change roles
    if not current_user.is_superuser and not is_project_lead(db, current_user.id, project_id):
        raise HTTPException(status_code=403, detail="Only project lead can change member roles")

    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    new_role = MemberRole.lead if role == "lead" else MemberRole.participant

    # If demoting from lead, ensure at least one lead remains
    if member.role == MemberRole.lead and new_role == MemberRole.participant:
        lead_count = count_project_leads(db, project_id)
        if lead_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot demote the last project lead. Assign another lead first."
            )

    member.role = new_role
    db.commit()

    return {"message": f"Member role updated to {role}"}


@router.post("/{project_id}/leave")
def leave_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave a project. Leads can only leave if other leads exist."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id
    ).first()

    if not member:
        raise HTTPException(status_code=400, detail="You are not a member of this project")

    # If user is a lead, ensure at least one lead remains
    if member.role == MemberRole.lead:
        lead_count = count_project_leads(db, project_id)
        if lead_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="You are the only project lead. Assign another lead before leaving."
            )

    db.delete(member)
    db.commit()

    return {"message": "You have left the project"}


# Cron job request model
class SendRemindersRequest(BaseModel):
    cron_secret: str


@router.post("/send-reminders")
async def send_project_reminders(
    data: SendRemindersRequest,
    db: Session = Depends(get_db)
):
    """
    Cron-triggered endpoint to send project meeting and deadline reminders.
    Should be called daily. Requires cron_secret for authentication.
    """
    # Validate cron secret
    if not settings.cron_secret or data.cron_secret != settings.cron_secret:
        raise HTTPException(
            status_code=403,
            detail="Invalid cron secret"
        )

    today = date.today()
    meeting_reminders_sent = 0
    deadline_reminders_sent = 0
    errors = []

    # Get email service with database settings
    configured_email_service = get_email_service_from_db(db)

    # Check if email is configured
    if not configured_email_service.smtp_user or not configured_email_service.smtp_password:
        return {
            "success": False,
            "message": "Email not configured",
            "meeting_reminders_sent": 0,
            "deadline_reminders_sent": 0
        }

    # === MEETING REMINDERS ===
    # Find projects with meeting reminders enabled and meetings coming up
    meeting_projects = db.query(Project).options(
        joinedload(Project.members).joinedload(ProjectMember.user)
    ).filter(
        Project.meeting_reminder_enabled == True,
        Project.next_meeting_date.isnot(None),
        Project.next_meeting_date >= today
    ).all()

    for project in meeting_projects:
        try:
            days_until = (project.next_meeting_date - today).days

            # Check if reminder should be sent today
            if days_until != project.meeting_reminder_days:
                continue

            # Check if we already sent a reminder for this meeting date
            if project.meeting_reminder_sent_date == project.next_meeting_date:
                continue

            # Get all member emails
            member_emails = [m.user.email for m in project.members if m.user and m.user.email]

            if not member_emails:
                continue

            # Send the reminder
            await configured_email_service.send_meeting_reminder(
                to_emails=member_emails,
                project_title=project.title,
                meeting_date=project.next_meeting_date.strftime("%A, %B %d, %Y"),
                days_until=days_until,
                project_id=project.id
            )

            # Update the sent date
            project.meeting_reminder_sent_date = project.next_meeting_date
            meeting_reminders_sent += 1

        except Exception as e:
            logger.error(f"Error sending meeting reminder for project {project.id}: {str(e)}")
            errors.append(f"Meeting reminder for project {project.id}: {str(e)}")

    # === DEADLINE REMINDERS ===
    # Find projects with deadline reminders enabled and deadlines coming up
    deadline_projects = db.query(Project).options(
        joinedload(Project.members).joinedload(ProjectMember.user)
    ).filter(
        Project.deadline_reminder_enabled == True,
        Project.end_date.isnot(None),
        Project.end_date >= today
    ).all()

    for project in deadline_projects:
        try:
            days_until = (project.end_date - today).days

            # Check if reminder should be sent today
            if days_until != project.deadline_reminder_days:
                continue

            # Check if we already sent a reminder for this deadline
            if project.deadline_reminder_sent_date == project.end_date:
                continue

            # Get all member emails
            member_emails = [m.user.email for m in project.members if m.user and m.user.email]

            if not member_emails:
                continue

            # Send the reminder
            await configured_email_service.send_deadline_reminder(
                to_emails=member_emails,
                project_title=project.title,
                deadline_date=project.end_date.strftime("%A, %B %d, %Y"),
                days_until=days_until,
                project_id=project.id
            )

            # Update the sent date
            project.deadline_reminder_sent_date = project.end_date
            deadline_reminders_sent += 1

        except Exception as e:
            logger.error(f"Error sending deadline reminder for project {project.id}: {str(e)}")
            errors.append(f"Deadline reminder for project {project.id}: {str(e)}")

    # Commit changes
    db.commit()

    return {
        "success": True,
        "meeting_reminders_sent": meeting_reminders_sent,
        "deadline_reminders_sent": deadline_reminders_sent,
        "errors": errors if errors else None
    }
