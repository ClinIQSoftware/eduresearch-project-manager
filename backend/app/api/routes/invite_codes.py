"""Invite code routes for enterprise registration."""

import secrets
import string
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_tenant_db, get_current_enterprise_id, get_unscoped_db
from app.models.invite_code import InviteCode
from app.models.enterprise import Enterprise
from app.models.user import User
from app.schemas.invite_code import (
    InviteCodeCreate,
    InviteCodeResponse,
    InviteCodeValidation,
)

router = APIRouter()


def generate_join_code(length: int = 8) -> str:
    """Generate a short alphanumeric join code."""
    chars = string.ascii_uppercase + string.digits
    # Remove ambiguous characters
    chars = chars.replace("O", "").replace("0", "").replace("I", "").replace("1", "").replace("L", "")
    return "".join(secrets.choice(chars) for _ in range(length))


# ── Admin endpoints (require superuser) ──────────────────────────


@router.get("/admin/invite-codes", response_model=List[InviteCodeResponse])
def list_invite_codes(
    request: Request,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user),
):
    """List all invite codes for the current enterprise."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")

    enterprise_id = request.state.enterprise_id
    codes = (
        db.query(InviteCode)
        .filter(InviteCode.enterprise_id == enterprise_id)
        .order_by(InviteCode.created_at.desc())
        .all()
    )

    results = []
    for code in codes:
        creator_name = None
        if code.created_by:
            creator_name = f"{code.created_by.first_name} {code.created_by.last_name}".strip()

        results.append(
            InviteCodeResponse(
                id=code.id,
                code=code.code,
                token=str(code.token),
                label=code.label,
                invite_url=None,
                max_uses=code.max_uses,
                use_count=code.use_count,
                is_active=code.is_active,
                is_valid=code.is_valid,
                expires_at=code.expires_at,
                created_at=code.created_at,
                created_by_name=creator_name,
            )
        )

    return results


@router.post("/admin/invite-codes", response_model=InviteCodeResponse, status_code=201)
def create_invite_code(
    data: InviteCodeCreate,
    request: Request,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new invite code for the current enterprise."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")

    enterprise_id = request.state.enterprise_id

    # Generate unique code
    for _ in range(10):
        code = generate_join_code()
        existing = db.query(InviteCode).filter(InviteCode.code == code).first()
        if not existing:
            break
    else:
        raise HTTPException(status_code=500, detail="Could not generate unique code")

    expires_at = None
    if data.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)

    invite = InviteCode(
        enterprise_id=enterprise_id,
        code=code,
        token=uuid.uuid4(),
        label=data.label,
        created_by_id=current_user.id,
        expires_at=expires_at,
        max_uses=data.max_uses,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    creator_name = f"{current_user.first_name} {current_user.last_name}".strip()

    return InviteCodeResponse(
        id=invite.id,
        code=invite.code,
        token=str(invite.token),
        label=invite.label,
        invite_url=None,
        max_uses=invite.max_uses,
        use_count=invite.use_count,
        is_active=invite.is_active,
        is_valid=invite.is_valid,
        expires_at=invite.expires_at,
        created_at=invite.created_at,
        created_by_name=creator_name,
    )


@router.delete("/admin/invite-codes/{code_id}")
def deactivate_invite_code(
    code_id: int,
    request: Request,
    db: Session = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user),
):
    """Deactivate an invite code."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")

    enterprise_id = request.state.enterprise_id
    invite = (
        db.query(InviteCode)
        .filter(
            InviteCode.id == code_id,
            InviteCode.enterprise_id == enterprise_id,
        )
        .first()
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invite code not found")

    invite.is_active = False
    db.commit()

    return {"message": "Invite code deactivated"}


# ── Public endpoints ─────────────────────────────────────────────


@router.get("/join/validate", response_model=InviteCodeValidation)
def validate_invite_code(
    code: str,
    db: Session = Depends(get_unscoped_db),
):
    """Validate an invite code or link token and return enterprise info.

    This is a public endpoint - no authentication required.
    Accepts either a short join code or a UUID invite link token.
    """
    invite = None

    # Try as short code first
    invite = db.query(InviteCode).filter(InviteCode.code == code).first()

    # Try as UUID token if not found
    if not invite:
        try:
            token_uuid = uuid.UUID(code)
            invite = db.query(InviteCode).filter(InviteCode.token == token_uuid).first()
        except (ValueError, TypeError):
            pass

    if not invite:
        return InviteCodeValidation(
            valid=False, message="Invalid invite code"
        )

    if not invite.is_valid:
        if not invite.is_active:
            msg = "This invite code has been deactivated"
        elif invite.expires_at and datetime.now(invite.expires_at.tzinfo) > invite.expires_at:
            msg = "This invite code has expired"
        elif invite.max_uses is not None and invite.use_count >= invite.max_uses:
            msg = "This invite code has reached its maximum number of uses"
        else:
            msg = "This invite code is no longer valid"

        return InviteCodeValidation(valid=False, message=msg)

    enterprise = db.query(Enterprise).filter(Enterprise.id == invite.enterprise_id).first()
    if not enterprise or not enterprise.is_active:
        return InviteCodeValidation(
            valid=False, message="The enterprise associated with this invite is not available"
        )

    return InviteCodeValidation(
        valid=True,
        enterprise_name=enterprise.name,
        enterprise_slug=enterprise.slug,
    )
