"""IRB submission and review workflow routes."""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_enterprise_id,
    get_current_user,
    get_tenant_db,
    require_plan,
)
from app.models.user import User
from app.schemas.irb import (
    IrbAssignMainReviewer,
    IrbAssignReviewers,
    IrbDecisionCreate,
    IrbDecisionResponse,
    IrbReviewCreate,
    IrbReviewResponse,
    IrbSubmissionCreate,
    IrbSubmissionDetail,
    IrbSubmissionFileResponse,
    IrbSubmissionResponse,
    IrbSubmissionResponseCreate,
    IrbSubmissionResponseResponse,
    IrbSubmissionUpdate,
    IrbTriageAction,
)
from app.services.irb_submission_service import IrbSubmissionService
from app.services.irb_ai_service import IrbAiService

logger = logging.getLogger(__name__)
router = APIRouter()


# --- CRUD ---

@router.post("", response_model=IrbSubmissionResponse)
def create_submission(
    data: IrbSubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("team")),
):
    """Create a new draft submission."""
    service = IrbSubmissionService(db)
    return service.create_submission(data, current_user.id, enterprise_id)


@router.get("", response_model=List[IrbSubmissionResponse])
def list_submissions(
    board_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("team")),
):
    """List submissions. Filters by current user unless superuser."""
    service = IrbSubmissionService(db)
    user_id = None if current_user.is_superuser else current_user.id
    return service.list_submissions(enterprise_id, user_id=user_id, board_id=board_id, status=status)


@router.get("/{submission_id}", response_model=IrbSubmissionDetail)
def get_submission(
    submission_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Get detailed submission with responses, files, reviews, decision, and history."""
    service = IrbSubmissionService(db)
    return service.get_submission(submission_id)


@router.put("/{submission_id}", response_model=IrbSubmissionResponse)
def update_submission(
    submission_id: UUID,
    data: IrbSubmissionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Update a draft submission."""
    service = IrbSubmissionService(db)
    return service.update_submission(submission_id, data)


# --- Submit ---

@router.post("/{submission_id}/submit", response_model=IrbSubmissionResponse)
def submit_submission(
    submission_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Finalize and submit a draft."""
    service = IrbSubmissionService(db)
    return service.submit(submission_id, current_user.id)


# --- Files ---

@router.post("/{submission_id}/files", response_model=IrbSubmissionFileResponse)
def upload_file(
    submission_id: UUID,
    file_name: str = Query(...),
    file_url: str = Query(...),
    file_type: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("team")),
):
    """Record an uploaded file for a submission."""
    service = IrbSubmissionService(db)
    return service.upload_file(submission_id, file_name, file_url, file_type, enterprise_id)


# --- Responses ---

@router.post("/{submission_id}/responses", response_model=List[IrbSubmissionResponseResponse])
def save_responses(
    submission_id: UUID,
    responses: List[IrbSubmissionResponseCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("team")),
):
    """Save or update question responses for a submission."""
    service = IrbSubmissionService(db)
    return service.save_responses(submission_id, responses, enterprise_id)


# --- AI endpoints (institution plan) ---

@router.post("/{submission_id}/ai-summary")
async def generate_ai_summary(
    submission_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("institution")),
):
    """Generate AI summary of the protocol. Requires Institution plan."""
    service = IrbAiService(db)
    summary = await service.summarize_protocol(submission_id, enterprise_id)
    return {"ai_summary": summary}


@router.post("/{submission_id}/ai-prefill", response_model=List[IrbSubmissionResponseResponse])
async def ai_prefill_questions(
    submission_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("institution")),
):
    """AI pre-fill question responses from protocol. Requires Institution plan."""
    service = IrbAiService(db)
    return await service.prefill_questions(submission_id, enterprise_id)


# --- Workflow ---

@router.post("/{submission_id}/triage", response_model=IrbSubmissionResponse)
def triage(
    submission_id: UUID,
    data: IrbTriageAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Coordinator triages a submission (accept or return)."""
    service = IrbSubmissionService(db)
    return service.triage(submission_id, data.action, data.note, current_user.id)


@router.post("/{submission_id}/assign-main", response_model=IrbSubmissionResponse)
def assign_main_reviewer(
    submission_id: UUID,
    data: IrbAssignMainReviewer,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Coordinator assigns main reviewer."""
    service = IrbSubmissionService(db)
    return service.assign_main_reviewer(submission_id, data.reviewer_id, current_user.id)


@router.post("/{submission_id}/assign-reviewers", response_model=List[IrbReviewResponse])
def assign_reviewers(
    submission_id: UUID,
    data: IrbAssignReviewers,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Main reviewer assigns associate reviewers."""
    service = IrbSubmissionService(db)
    return service.assign_reviewers(submission_id, data.reviewer_ids, current_user.id)


@router.get("/{submission_id}/reviews", response_model=List[IrbReviewResponse])
def list_reviews(
    submission_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Get all reviews for a submission."""
    from app.models.irb import IrbReview
    reviews = db.query(IrbReview).filter(IrbReview.submission_id == submission_id).all()
    return reviews


@router.post("/{submission_id}/reviews", response_model=IrbReviewResponse)
def submit_review(
    submission_id: UUID,
    data: IrbReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Reviewer submits their assessment."""
    service = IrbSubmissionService(db)
    return service.submit_review(submission_id, data, current_user.id)


@router.post("/{submission_id}/decision", response_model=IrbDecisionResponse)
def issue_decision(
    submission_id: UUID,
    data: IrbDecisionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Main reviewer issues final decision."""
    service = IrbSubmissionService(db)
    return service.issue_decision(submission_id, data, current_user.id)


@router.post("/{submission_id}/escalate", response_model=IrbSubmissionResponse)
def escalate(
    submission_id: UUID,
    target_board_id: UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("team")),
):
    """Escalate submission to enterprise IRB."""
    service = IrbSubmissionService(db)
    return service.escalate(submission_id, target_board_id, current_user.id, enterprise_id)
