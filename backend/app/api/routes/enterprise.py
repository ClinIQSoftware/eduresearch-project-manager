"""Enterprise API routes."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_unscoped_db, get_current_superuser
from app.models.user import User
from app.models.enterprise import Enterprise
from app.models.enterprise_config import EnterpriseConfig
from app.schemas.enterprise import (
    EnterpriseBrandingResponse,
    EnterpriseConfigResponse,
)

router = APIRouter()


@router.get("/branding", response_model=EnterpriseBrandingResponse)
def get_enterprise_branding(request: Request, db: Session = Depends(get_unscoped_db)):
    """Get public branding for current enterprise (no auth required)."""
    if not hasattr(request.state, "enterprise") or not request.state.enterprise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enterprise not found")

    enterprise = request.state.enterprise
    config = db.query(EnterpriseConfig).filter_by(enterprise_id=enterprise.id).first()

    return EnterpriseBrandingResponse(
        enterprise_name=enterprise.name,
        logo_url=config.logo_url if config else None,
        primary_color=config.primary_color if config else "#3B82F6",
        favicon_url=config.favicon_url if config else None,
    )


@router.get("/config", response_model=EnterpriseConfigResponse)
def get_enterprise_config(
    request: Request,
    db: Session = Depends(get_unscoped_db),
    current_user: User = Depends(get_current_superuser),
):
    """Get enterprise configuration (superuser only)."""
    enterprise_id = request.state.enterprise_id
    config = db.query(EnterpriseConfig).filter_by(enterprise_id=enterprise_id).first()

    if not config:
        # Return defaults
        return EnterpriseConfigResponse(
            google_oauth_enabled=False,
            microsoft_oauth_enabled=False,
            saml_enabled=False,
            smtp_port=587,
            primary_color="#3B82F6",
            features={},
        )

    return config
