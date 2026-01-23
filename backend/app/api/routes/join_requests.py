"""Join request routes for EduResearch Project Manager.

Handles project join request operations.
"""

from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db, is_project_lead
from app.models.join_request import JoinRequest, RequestStatus
from app.schemas.join_request import RequestStatus as RequestStatusType
from app.models.project import Project
from app.models.user import User
from app.schemas import (
    JoinRequestCreate,
    JoinRequestResponse,
    JoinRequestWithUser,
    RespondToJoinRequest,
)
from app.services import JoinRequestService, EmailService

router = APIRouter()


@router.get("/", response_model=List[JoinRequestWithUser])
def get_join_requests(
    project_id: Optional[int] = None,
    request_status: Optional[RequestStatusType] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get join requests.

    Leads see requests for their projects, users see their own.
    """
    query = db.query(JoinRequest).options(joinedload(JoinRequest.user))

    if project_id:
        # Verify lead access
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
            )

        # Check if user is lead of this project
        if not current_user.is_superuser and not is_project_lead(
            db, current_user.id, project_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
            )

        query = query.filter(JoinRequest.project_id == project_id)
    else:
        # Get requests for user's projects (as lead) or their own requests
        if current_user.is_superuser:
            pass  # Superuser sees all
        else:
            # Get projects where user is lead
            led_projects = (
                db.query(Project.id)
                .filter(Project.lead_id == current_user.id)
                .subquery()
            )
            query = query.filter(
                (JoinRequest.project_id.in_(led_projects))
                | (JoinRequest.user_id == current_user.id)
            )

    if request_status:
        query = query.filter(JoinRequest.status == request_status)

    return query.order_by(JoinRequest.created_at.desc()).all()


@router.get("/my", response_model=List[JoinRequestWithUser])
def get_my_join_requests(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get current user's join requests."""
    join_request_service = JoinRequestService(db)
    return join_request_service.get_user_requests(current_user.id)


@router.post("/", response_model=JoinRequestResponse)
async def create_join_request(
    request_data: JoinRequestCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Request to join a project. Notifies project lead."""
    join_request_service = JoinRequestService(db)

    try:
        join_request = join_request_service.create_request(
            project_id=request_data.project_id,
            user=current_user,
            message=request_data.message,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Notify lead
    project = db.query(Project).filter(Project.id == request_data.project_id).first()
    if project and project.lead_id:
        lead = db.query(User).filter(User.id == project.lead_id).first()
        if lead:
            email_service = EmailService(db)
            background_tasks.add_task(
                email_service.send_join_request_notification,
                lead.email,
                project.title,
                current_user.name,
                current_user.email,
                request_data.message,
            )

    return join_request


@router.post("/{request_id}/approve", response_model=JoinRequestResponse)
async def approve_join_request(
    request_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Approve a join request (project lead)."""
    join_request_service = JoinRequestService(db)

    # Get the request
    join_request = db.query(JoinRequest).filter(JoinRequest.id == request_id).first()
    if not join_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Join request not found"
        )

    # Verify lead access
    if not current_user.is_superuser and not is_project_lead(
        db, current_user.id, join_request.project_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project lead can respond",
        )

    try:
        approved_request = join_request_service.approve_request(request_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Notify requester
    requester = db.query(User).filter(User.id == join_request.user_id).first()
    project = db.query(Project).filter(Project.id == join_request.project_id).first()
    if requester and project:
        email_service = EmailService(db)
        background_tasks.add_task(
            email_service.send_join_request_response,
            requester.email,
            project.title,
            True,  # approved
        )

    return approved_request


@router.post("/{request_id}/reject", response_model=JoinRequestResponse)
async def reject_join_request(
    request_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reject a join request (project lead)."""
    join_request_service = JoinRequestService(db)

    # Get the request
    join_request = db.query(JoinRequest).filter(JoinRequest.id == request_id).first()
    if not join_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Join request not found"
        )

    # Verify lead access
    if not current_user.is_superuser and not is_project_lead(
        db, current_user.id, join_request.project_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project lead can respond",
        )

    try:
        rejected_request = join_request_service.reject_request(request_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Notify requester
    requester = db.query(User).filter(User.id == join_request.user_id).first()
    project = db.query(Project).filter(Project.id == join_request.project_id).first()
    if requester and project:
        email_service = EmailService(db)
        background_tasks.add_task(
            email_service.send_join_request_response,
            requester.email,
            project.title,
            False,  # rejected
        )

    return rejected_request


# Keep PUT endpoint for backwards compatibility
@router.put("/{request_id}", response_model=JoinRequestResponse)
async def respond_to_join_request(
    request_id: int,
    response_data: RespondToJoinRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Approve or reject a join request (lead only)."""
    if response_data.status == RequestStatus.approved:
        return await approve_join_request(
            request_id, background_tasks, current_user, db
        )
    elif response_data.status == RequestStatus.rejected:
        return await reject_join_request(request_id, background_tasks, current_user, db)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status"
        )


@router.delete("/{request_id}")
def cancel_join_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a pending join request (requester only)."""
    join_request = db.query(JoinRequest).filter(JoinRequest.id == request_id).first()
    if not join_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Join request not found"
        )

    if join_request.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    if join_request.status != RequestStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel processed request",
        )

    db.delete(join_request)
    db.commit()

    return {"message": "Request cancelled"}
