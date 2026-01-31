"""IRB dashboard and AI configuration routes."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_enterprise_id,
    get_current_user,
    get_tenant_db,
    require_irb_member,
    require_plan,
)
from app.models.user import User
from app.schemas.irb import (
    IrbAiConfigCreate,
    IrbAiConfigResponse,
    IrbAiConfigUpdate,
    IrbDashboardResponse,
    IrbMyReviewsResponse,
)
from app.services.irb_ai_service import IrbAiService
from app.services.irb_submission_service import IrbSubmissionService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/dashboard", response_model=IrbDashboardResponse)
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("team")),
):
    """Get role-aware IRB dashboard data."""
    service = IrbSubmissionService(db)
    data = service.get_dashboard(current_user.id, enterprise_id)
    return data


@router.get("/my-reviews", response_model=IrbMyReviewsResponse)
def get_my_reviews(
    current_user: User = Depends(require_irb_member),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("team")),
):
    """Get pending and completed reviews for the current IRB member."""
    service = IrbSubmissionService(db)
    return service.get_my_reviews(current_user.id, enterprise_id)


# --- AI Config (institution plan) ---

@router.get("/ai-config", response_model=IrbAiConfigResponse)
def get_ai_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("institution")),
):
    """Get AI configuration for the enterprise."""
    service = IrbAiService(db)
    config = service.get_config(enterprise_id)
    if not config:
        return IrbAiConfigResponse(
            id=0,
            provider="anthropic",
            model_name="",
            custom_endpoint=None,
            max_tokens=4096,
            is_active=False,
            updated_at=None,
            api_key_set=False,
        )
    return IrbAiConfigResponse(
        id=config.id,
        provider=config.provider,
        model_name=config.model_name,
        custom_endpoint=config.custom_endpoint,
        max_tokens=config.max_tokens,
        is_active=config.is_active,
        updated_at=config.updated_at,
        api_key_set=bool(config.api_key_encrypted),
    )


@router.post("/ai-config", response_model=IrbAiConfigResponse)
def save_ai_config(
    data: IrbAiConfigCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("institution")),
):
    """Save AI configuration for the enterprise."""
    service = IrbAiService(db)
    config = service.save_config(enterprise_id, data)
    return IrbAiConfigResponse(
        id=config.id,
        provider=config.provider,
        model_name=config.model_name,
        custom_endpoint=config.custom_endpoint,
        max_tokens=config.max_tokens,
        is_active=config.is_active,
        updated_at=config.updated_at,
        api_key_set=bool(config.api_key_encrypted),
    )


@router.post("/ai-config/test")
async def test_ai_connection(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
    _plan: None = Depends(require_plan("institution")),
):
    """Test AI provider connection."""
    service = IrbAiService(db)
    result = await service.test_connection(enterprise_id)
    return result
