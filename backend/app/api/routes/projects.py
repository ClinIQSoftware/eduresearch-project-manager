from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
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
from app.services.email import email_service

router = APIRouter()


@router.get("/", response_model=List[ProjectWithLead])
def get_projects(
    classification: Optional[ProjectClassification] = None,
    status: Optional[ProjectStatus] = None,
    open_to_participants: Optional[bool] = None,
    organization_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all projects with optional filters."""
    query = db.query(Project).options(joinedload(Project.lead))

    if classification:
        query = query.filter(Project.classification == classification)
    if status:
        query = query.filter(Project.status == status)
    if open_to_participants is not None:
        query = query.filter(Project.open_to_participants == open_to_participants)
    if organization_id:
        query = query.filter(Project.organization_id == organization_id)

    # Filter by user's organization unless superuser
    if not current_user.is_superuser and current_user.organization_id:
        query = query.filter(Project.organization_id == current_user.organization_id)

    return query.order_by(Project.created_at.desc()).all()


@router.post("/", response_model=ProjectResponse)
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

    # Use user's organization if not specified
    if not project.organization_id and current_user.organization_id:
        project.organization_id = current_user.organization_id

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
