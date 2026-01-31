"""IRB Admin routes for managing IRB members, assignments, and reporting."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_enterprise_id,
    get_tenant_db,
    require_irb_admin,
    require_plan,
)
from app.models.user import User
from app.schemas.irb import (
    IrbAdminDashboardStats,
    IrbMemberCreate,
    IrbMemberResponse,
    IrbMemberUpdate,
    IrbQuestionCreate,
    IrbQuestionResponse,
    IrbQuestionUpdate,
    IrbReportsResponse,
    IrbSubmissionResponse,
    IrbAssignReviewers,
    IrbReviewResponse as IrbReviewResponseSchema,
)
from app.services.irb_admin_service import IrbAdminService
from app.services.irb_question_service import IrbQuestionService

router = APIRouter()


@router.get("/dashboard", response_model=IrbAdminDashboardStats)
def get_admin_dashboard(
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    db: Session = Depends(get_tenant_db),
    _admin: User = Depends(require_irb_admin),
    _plan: None = Depends(require_plan("team")),
):
    """Get IRB admin dashboard statistics."""
    service = IrbAdminService(db)
    return service.get_dashboard_stats(enterprise_id)


@router.get("/members", response_model=List[IrbMemberResponse])
def list_members(
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    db: Session = Depends(get_tenant_db),
    _admin: User = Depends(require_irb_admin),
    _plan: None = Depends(require_plan("team")),
):
    """List all IRB members with roles and board memberships."""
    service = IrbAdminService(db)
    return service.list_members(enterprise_id)


@router.post("/members", response_model=IrbMemberResponse)
def add_member(
    data: IrbMemberCreate,
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    db: Session = Depends(get_tenant_db),
    _admin: User = Depends(require_irb_admin),
    _plan: None = Depends(require_plan("team")),
):
    """Set IRB role on a user."""
    service = IrbAdminService(db)
    user = service.set_member_role(enterprise_id, data.user_id, data.irb_role)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Return with empty board/review data since we just set the role
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "irb_role": user.irb_role,
        "boards": [],
        "pending_reviews": 0,
        "completed_reviews": 0,
    }


@router.put("/members/{user_id}", response_model=IrbMemberResponse)
def update_member(
    user_id: int,
    data: IrbMemberUpdate,
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    db: Session = Depends(get_tenant_db),
    _admin: User = Depends(require_irb_admin),
    _plan: None = Depends(require_plan("team")),
):
    """Update IRB role for a user."""
    service = IrbAdminService(db)
    user = service.set_member_role(enterprise_id, user_id, data.irb_role)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    members = service.list_members(enterprise_id)
    member = next((m for m in members if m["id"] == user_id), None)
    if member:
        return member
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "irb_role": user.irb_role,
        "boards": [],
        "pending_reviews": 0,
        "completed_reviews": 0,
    }


@router.delete("/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    user_id: int,
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    db: Session = Depends(get_tenant_db),
    _admin: User = Depends(require_irb_admin),
    _plan: None = Depends(require_plan("team")),
):
    """Remove IRB role from a user."""
    service = IrbAdminService(db)
    user = service.remove_member_role(enterprise_id, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")


@router.get("/submissions", response_model=List[IrbSubmissionResponse])
def list_all_submissions(
    board_id: Optional[UUID] = Query(None),
    submission_status: Optional[str] = Query(None, alias="status"),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    db: Session = Depends(get_tenant_db),
    _admin: User = Depends(require_irb_admin),
    _plan: None = Depends(require_plan("team")),
):
    """List all submissions with optional filters."""
    service = IrbAdminService(db)
    return service.get_all_submissions(enterprise_id, board_id, submission_status)


@router.post("/submissions/{submission_id}/assign", response_model=List[IrbReviewResponseSchema])
def assign_reviewers(
    submission_id: UUID,
    data: IrbAssignReviewers,
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    db: Session = Depends(get_tenant_db),
    _admin: User = Depends(require_irb_admin),
    _plan: None = Depends(require_plan("team")),
):
    """Assign reviewers to a submission."""
    service = IrbAdminService(db)
    reviews = service.assign_reviewers(enterprise_id, submission_id, data.reviewer_ids)
    return reviews


@router.get("/boards/{board_id}/review-questions", response_model=List[IrbQuestionResponse])
def list_review_questions(
    board_id: UUID,
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    db: Session = Depends(get_tenant_db),
    _admin: User = Depends(require_irb_admin),
    _plan: None = Depends(require_plan("team")),
):
    """List review questions for a board."""
    service = IrbQuestionService(db)
    return service.list_questions(board_id, enterprise_id, question_context="review")


@router.post("/boards/{board_id}/review-questions", response_model=IrbQuestionResponse)
def create_review_question(
    board_id: UUID,
    data: IrbQuestionCreate,
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    db: Session = Depends(get_tenant_db),
    _admin: User = Depends(require_irb_admin),
    _plan: None = Depends(require_plan("team")),
):
    """Create a review question for a board."""
    service = IrbQuestionService(db)
    # Force question_context to 'review'
    return service.create_question(board_id, enterprise_id, data, question_context="review")


@router.put("/review-questions/{question_id}", response_model=IrbQuestionResponse)
def update_review_question(
    question_id: int,
    data: IrbQuestionUpdate,
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    db: Session = Depends(get_tenant_db),
    _admin: User = Depends(require_irb_admin),
    _plan: None = Depends(require_plan("team")),
):
    """Update a review question."""
    service = IrbQuestionService(db)
    question = service.update_question(question_id, enterprise_id, data)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.delete("/review-questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review_question(
    question_id: int,
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    db: Session = Depends(get_tenant_db),
    _admin: User = Depends(require_irb_admin),
    _plan: None = Depends(require_plan("team")),
):
    """Soft-delete a review question."""
    service = IrbQuestionService(db)
    success = service.delete_question(question_id, enterprise_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")


@router.get("/reports", response_model=IrbReportsResponse)
def get_reports(
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    db: Session = Depends(get_tenant_db),
    _admin: User = Depends(require_irb_admin),
    _plan: None = Depends(require_plan("team")),
):
    """Get IRB reporting data."""
    service = IrbAdminService(db)
    return service.get_reports(enterprise_id)
