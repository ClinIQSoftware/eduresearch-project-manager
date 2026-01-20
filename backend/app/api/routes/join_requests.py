from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime
from app.database import get_db
from app.models.join_request import JoinRequest, RequestStatus
from app.models.project import Project
from app.models.project_member import ProjectMember, MemberRole
from app.models.user import User
from app.schemas.join_request import (
    JoinRequestCreate, JoinRequestResponse, JoinRequestWithUser,
    RespondToJoinRequest
)
from app.dependencies import get_current_user
from app.services.email import email_service
from app.services.notification_service import NotificationService

router = APIRouter()


def get_notification_service(db: Session) -> NotificationService:
    """Get notification service instance."""
    return NotificationService(db)


@router.post("/", response_model=JoinRequestResponse)
async def create_join_request(
    request_data: JoinRequestCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request to join a project. Notifies project lead."""
    project = db.query(Project).filter(Project.id == request_data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.open_to_participants:
        raise HTTPException(status_code=400, detail="Project is not open to new participants")

    # Check if already a member
    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == request_data.project_id,
        ProjectMember.user_id == current_user.id
    ).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="Already a project member")

    # Check if pending request exists
    existing_request = db.query(JoinRequest).filter(
        JoinRequest.project_id == request_data.project_id,
        JoinRequest.user_id == current_user.id,
        JoinRequest.status == RequestStatus.pending
    ).first()
    if existing_request:
        raise HTTPException(status_code=400, detail="Request already pending")

    # Create request
    join_request = JoinRequest(
        project_id=request_data.project_id,
        user_id=current_user.id,
        message=request_data.message
    )
    db.add(join_request)
    db.commit()
    db.refresh(join_request)

    # Notify lead
    if project.lead_id:
        lead = db.query(User).filter(User.id == project.lead_id).first()
        if lead:
            background_tasks.add_task(
                email_service.send_join_request_notification,
                lead.email,
                project.title,
                current_user.name,
                current_user.email,
                request_data.message
            )

    return join_request


@router.get("/", response_model=List[JoinRequestWithUser])
def get_join_requests(
    project_id: int = None,
    status: RequestStatus = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get join requests. Leads see requests for their projects, users see their own."""
    query = db.query(JoinRequest).options(joinedload(JoinRequest.user))

    if project_id:
        # Verify lead access
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        if not current_user.is_superuser and project.lead_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

        query = query.filter(JoinRequest.project_id == project_id)
    else:
        # Get requests for user's projects (as lead) or their own requests
        if current_user.is_superuser:
            pass  # Superuser sees all
        else:
            # Get projects where user is lead
            led_projects = db.query(Project.id).filter(Project.lead_id == current_user.id).subquery()
            query = query.filter(
                (JoinRequest.project_id.in_(led_projects)) |
                (JoinRequest.user_id == current_user.id)
            )

    if status:
        query = query.filter(JoinRequest.status == status)

    return query.order_by(JoinRequest.created_at.desc()).all()


@router.put("/{request_id}", response_model=JoinRequestResponse)
async def respond_to_join_request(
    request_id: int,
    response_data: RespondToJoinRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve or reject a join request (lead only)."""
    join_request = db.query(JoinRequest).filter(JoinRequest.id == request_id).first()
    if not join_request:
        raise HTTPException(status_code=404, detail="Join request not found")

    project = db.query(Project).filter(Project.id == join_request.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Verify lead access
    if not current_user.is_superuser and project.lead_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only project lead can respond")

    if join_request.status != RequestStatus.pending:
        raise HTTPException(status_code=400, detail="Request already processed")

    # Update request status
    join_request.status = response_data.status
    join_request.responded_at = datetime.utcnow()

    # If approved, add as member
    if response_data.status == RequestStatus.approved:
        member = ProjectMember(
            project_id=join_request.project_id,
            user_id=join_request.user_id,
            role=MemberRole.participant
        )
        db.add(member)

    db.commit()
    db.refresh(join_request)

    # Notify requester via email
    requester = db.query(User).filter(User.id == join_request.user_id).first()
    if requester:
        background_tasks.add_task(
            email_service.send_join_request_response,
            requester.email,
            project.title,
            response_data.status == RequestStatus.approved
        )

    # Send in-app notification
    notification_service = get_notification_service(db)
    if response_data.status == RequestStatus.approved:
        background_tasks.add_task(
            notification_service.notify_join_approved,
            join_request
        )
    elif response_data.status == RequestStatus.rejected:
        background_tasks.add_task(
            notification_service.notify_join_rejected,
            join_request
        )

    return join_request


@router.delete("/{request_id}")
def cancel_join_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a pending join request (requester only)."""
    join_request = db.query(JoinRequest).filter(JoinRequest.id == request_id).first()
    if not join_request:
        raise HTTPException(status_code=404, detail="Join request not found")

    if join_request.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Access denied")

    if join_request.status != RequestStatus.pending:
        raise HTTPException(status_code=400, detail="Cannot cancel processed request")

    db.delete(join_request)
    db.commit()

    return {"message": "Request cancelled"}
