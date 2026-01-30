"""IRB board management routes."""

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
    IrbBoardCreate,
    IrbBoardMemberCreate,
    IrbBoardMemberResponse,
    IrbBoardResponse,
    IrbBoardUpdate,
)
from app.services.irb_board_service import IrbBoardService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=List[IrbBoardResponse])
def list_boards(
    institution_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("team")),
):
    """List IRB boards for the current enterprise."""
    service = IrbBoardService(db)
    return service.list_boards(enterprise_id, institution_id=institution_id)


@router.post("", response_model=IrbBoardResponse)
def create_board(
    data: IrbBoardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("team")),
):
    """Create a new IRB board. Requires admin access."""
    # TODO: add admin/superuser check
    service = IrbBoardService(db)
    return service.create_board(data, enterprise_id)


@router.put("/{board_id}", response_model=IrbBoardResponse)
def update_board(
    board_id: UUID,
    data: IrbBoardUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Update an IRB board."""
    service = IrbBoardService(db)
    return service.update_board(board_id, data)


@router.get("/{board_id}/members", response_model=List[IrbBoardMemberResponse])
def list_members(
    board_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """List members of an IRB board."""
    service = IrbBoardService(db)
    return service.get_members(board_id)


@router.post("/{board_id}/members", response_model=IrbBoardMemberResponse)
def add_member(
    board_id: UUID,
    data: IrbBoardMemberCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("team")),
):
    """Add a member to an IRB board."""
    service = IrbBoardService(db)
    return service.add_member(board_id, data, enterprise_id)


@router.delete("/{board_id}/members/{user_id}")
def remove_member(
    board_id: UUID,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    _plan: None = Depends(require_plan("team")),
):
    """Remove a member from an IRB board."""
    service = IrbBoardService(db)
    service.remove_member(board_id, user_id)
    return {"message": "Member removed"}
