"""IRB question and section management routes."""

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
    IrbQuestionCreate,
    IrbQuestionResponse,
    IrbQuestionSectionCreate,
    IrbQuestionSectionResponse,
    IrbQuestionSectionUpdate,
    IrbQuestionUpdate,
)
from app.services.irb_question_service import IrbQuestionService

logger = logging.getLogger(__name__)
router = APIRouter()


# --- Sections ---

@router.get("/boards/{board_id}/sections", response_model=List[IrbQuestionSectionResponse])
def list_sections(
    board_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """List question sections for a board."""
    service = IrbQuestionService(db)
    return service.list_sections(board_id)


@router.post("/boards/{board_id}/sections", response_model=IrbQuestionSectionResponse)
def create_section(
    board_id: UUID,
    data: IrbQuestionSectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("team")),
):
    """Create a question section for a board."""
    service = IrbQuestionService(db)
    return service.create_section(board_id, data, enterprise_id)


@router.put("/sections/{section_id}", response_model=IrbQuestionSectionResponse)
def update_section(
    section_id: int,
    data: IrbQuestionSectionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Update a question section."""
    service = IrbQuestionService(db)
    return service.update_section(section_id, data)


# --- Questions ---

@router.get("/boards/{board_id}/questions", response_model=List[IrbQuestionResponse])
def list_questions(
    board_id: UUID,
    section_id: Optional[int] = Query(None),
    submission_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """List active questions for a board with optional filters."""
    service = IrbQuestionService(db)
    return service.list_questions(board_id, section_id=section_id, submission_type=submission_type)


@router.post("/boards/{board_id}/questions", response_model=IrbQuestionResponse)
def create_question(
    board_id: UUID,
    data: IrbQuestionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("team")),
):
    """Create a question for a board, optionally with conditional display rules."""
    service = IrbQuestionService(db)
    return service.create_question(board_id, enterprise_id, data)


@router.put("/questions/{question_id}", response_model=IrbQuestionResponse)
def update_question(
    question_id: int,
    data: IrbQuestionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Update a question and optionally its conditions."""
    service = IrbQuestionService(db)
    return service.update_question(question_id, data=data)


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Soft-delete a question (sets is_active=False)."""
    service = IrbQuestionService(db)
    service.delete_question(question_id)
    return {"message": "Question deleted"}
