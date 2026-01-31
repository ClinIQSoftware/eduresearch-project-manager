"""IRB submission and review workflow routes."""

import logging
import uuid as uuid_mod
from pathlib import Path
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_enterprise_id,
    get_current_user,
    get_tenant_db,
    require_plan,
)
from app.config import settings
from app.models.irb import IrbSubmission, IrbSubmissionFile
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

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".csv", ".png", ".jpg", ".jpeg", ".gif", ".zip",
}


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
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("team")),
):
    """List submissions with role-based visibility."""
    service = IrbSubmissionService(db)
    # IRB admins and superusers see all submissions
    if current_user.is_superuser or getattr(current_user, "irb_role", None) == "admin":
        user_id = None
    elif getattr(current_user, "irb_role", None) == "member":
        # Members see own + assigned for review (handled in service)
        return service.list_submissions_for_member(
            enterprise_id, current_user.id, board_id=board_id, status=status_filter
        )
    else:
        user_id = current_user.id
    return service.list_submissions(enterprise_id, user_id=user_id, board_id=board_id, status=status_filter)


@router.get("/{submission_id}", response_model=IrbSubmissionDetail)
def get_submission(
    submission_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Get detailed submission with access control."""
    service = IrbSubmissionService(db)
    submission = service.get_submission(submission_id)
    if not service.can_access_submission(current_user, submission):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return submission


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
async def upload_file(
    submission_id: UUID,
    file: UploadFile = File(...),
    file_type: str = Form("supporting_doc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("team")),
):
    """Upload a file to an IRB submission.

    Accepts multipart/form-data with 'file' and 'file_type' fields.
    Stores in S3 or local filesystem depending on configuration.
    """
    # Verify submission exists
    submission = db.query(IrbSubmission).filter(IrbSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    # Validate file type
    valid_file_types = {"protocol", "consent_form", "supporting_doc"}
    if file_type not in valid_file_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file_type. Must be one of: {', '.join(valid_file_types)}",
        )

    # Validate extension
    file_extension = Path(file.filename).suffix.lower() if file.filename else ""
    if file_extension and file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{file_extension}' is not allowed",
        )

    # Read file in chunks, enforcing size limit
    max_size = settings.max_file_size
    chunks = []
    file_size = 0
    while chunk := await file.read(8192):
        file_size += len(chunk)
        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed ({max_size // (1024 * 1024)}MB)",
            )
        chunks.append(chunk)

    data = b"".join(chunks)
    stored_filename = f"{uuid_mod.uuid4()}{file_extension}"
    original_filename = file.filename or "unnamed"

    if settings.use_s3:
        from app.core.storage import upload_to_s3

        object_key = f"irb/{enterprise_id}/{submission_id}/{stored_filename}"
        try:
            upload_to_s3(object_key, data, content_type=file.content_type)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file to storage: {str(e)}",
            )
        file_url = object_key
    else:
        upload_dir = Path(settings.upload_dir) / "irb" / str(submission_id)
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = upload_dir / stored_filename
        try:
            with open(file_path, "wb") as f:
                f.write(data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file: {str(e)}",
            )
        file_url = str(file_path)

    # Create DB record
    file_record = IrbSubmissionFile(
        submission_id=submission_id,
        enterprise_id=enterprise_id,
        file_name=stored_filename,
        file_url=file_url,
        file_type=file_type,
        original_filename=original_filename,
        file_size=file_size,
        content_type=file.content_type,
    )
    db.add(file_record)
    db.commit()
    db.refresh(file_record)
    return file_record


@router.get("/{submission_id}/files/{file_id}/download")
def download_file(
    submission_id: UUID,
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Download an IRB submission file.

    With S3: redirects to a time-limited presigned URL.
    With local storage: serves the file directly.
    """
    # Verify submission and access
    service = IrbSubmissionService(db)
    submission = service.get_submission(submission_id)
    if not service.can_access_submission(current_user, submission):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Get the file record
    file_record = (
        db.query(IrbSubmissionFile)
        .filter(
            IrbSubmissionFile.id == file_id,
            IrbSubmissionFile.submission_id == submission_id,
        )
        .first()
    )
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    display_name = file_record.original_filename or file_record.file_name

    if settings.use_s3:
        from app.core.storage import generate_presigned_url, s3_object_exists

        if not s3_object_exists(file_record.file_url):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="File not found in storage"
            )
        url = generate_presigned_url(
            object_key=file_record.file_url,
            filename=display_name,
            content_type=file_record.content_type,
        )
        return RedirectResponse(url=url, status_code=302)
    else:
        file_path = Path(file_record.file_url)
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk"
            )
        return FileResponse(
            path=str(file_path),
            filename=display_name,
            media_type=file_record.content_type or "application/octet-stream",
        )


@router.delete("/{submission_id}/files/{file_id}")
def delete_file(
    submission_id: UUID,
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Delete a file from an IRB submission. Only allowed for draft submissions."""
    # Verify submission exists
    submission = db.query(IrbSubmission).filter(IrbSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    if submission.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Files can only be deleted from draft submissions",
        )

    # Only submitter, IRB admin, or superuser can delete
    if not (
        current_user.is_superuser
        or getattr(current_user, "irb_role", None) == "admin"
        or submission.submitted_by_id == current_user.id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    file_record = (
        db.query(IrbSubmissionFile)
        .filter(
            IrbSubmissionFile.id == file_id,
            IrbSubmissionFile.submission_id == submission_id,
        )
        .first()
    )
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Delete from storage
    if settings.use_s3:
        try:
            from app.core.storage import delete_from_s3
            delete_from_s3(file_record.file_url)
        except Exception:
            pass  # Don't fail if storage cleanup fails
    else:
        file_path = Path(file_record.file_url)
        if file_path.exists():
            file_path.unlink()

    db.delete(file_record)
    db.commit()
    return {"message": "File deleted successfully"}


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
    from app.services.irb_ai_service import IrbAiService
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
    from app.services.irb_ai_service import IrbAiService
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
    """Get all reviews for a submission with access control."""
    service = IrbSubmissionService(db)
    submission = service.get_submission(submission_id)
    if not service.can_access_submission(current_user, submission):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
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
