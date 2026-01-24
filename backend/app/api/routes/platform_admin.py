"""Platform Admin routes for EduResearch Project Manager.

Provides endpoints for platform-level administration operations including
enterprise management, platform statistics, and admin authentication.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_platform_db
from app.config import settings
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.email_settings import EmailSettings
from app.models.enterprise import Enterprise
from app.models.institution import Institution
from app.models.platform_admin import PlatformAdmin
from app.models.project import Project
from app.models.user import User
from app.schemas.platform_admin import (
    EnterpriseCreate,
    EnterpriseDetailResponse,
    EnterpriseListItem,
    EnterpriseUpdate,
    PlatformAdminLogin,
    PlatformAdminResponse,
    PlatformEmailSettingsResponse,
    PlatformEmailSettingsUpdate,
    PlatformStatsResponse,
    TestEmailRequest,
)
from app.services.email_service import EmailService

router = APIRouter()

# Reserved slugs that cannot be used for enterprises
RESERVED_SLUGS = {"admin", "api", "www", "app", "static", "assets"}


def require_platform_admin(request: Request) -> None:
    """Verify that the request is from a platform admin.

    Args:
        request: The FastAPI request object.

    Raises:
        HTTPException: If user is not a platform admin.
    """
    if not getattr(request.state, "is_platform_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required",
        )


def generate_subdomain_url(slug: str) -> str:
    """Generate the subdomain URL for an enterprise.

    Args:
        slug: The enterprise slug.

    Returns:
        The full subdomain URL.
    """
    base_domain = settings.base_domain
    protocol = "http" if "localhost" in base_domain else "https"
    return f"{protocol}://{slug}.{base_domain}"


@router.post("/auth/login")
def platform_admin_login(
    login_data: PlatformAdminLogin,
    db: Session = Depends(get_platform_db),
):
    """Login as a platform admin.

    Returns a JWT token with platform admin flag set.
    """
    admin = (
        db.query(PlatformAdmin)
        .filter(PlatformAdmin.email == login_data.email)
        .first()
    )

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not admin.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password authentication not configured for this account",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(login_data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    # Create token with platform admin flag
    token = create_access_token(
        data={
            "sub": str(admin.id),
            "email": admin.email,
            "is_platform_admin": True,
        }
    )

    return {"access_token": token, "token_type": "bearer"}


@router.get("/stats", response_model=PlatformStatsResponse)
def get_platform_stats(
    request: Request,
    db: Session = Depends(get_platform_db),
):
    """Get platform-wide statistics.

    Returns counts of enterprises, users, projects, and institutions.
    """
    require_platform_admin(request)

    total_enterprises = db.query(func.count(Enterprise.id)).scalar() or 0
    active_enterprises = (
        db.query(func.count(Enterprise.id))
        .filter(Enterprise.is_active == True)
        .scalar()
        or 0
    )
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_projects = db.query(func.count(Project.id)).scalar() or 0
    total_institutions = db.query(func.count(Institution.id)).scalar() or 0

    return PlatformStatsResponse(
        total_enterprises=total_enterprises,
        active_enterprises=active_enterprises,
        total_users=total_users,
        total_projects=total_projects,
        total_institutions=total_institutions,
    )


@router.get("/enterprises", response_model=List[EnterpriseListItem])
def list_enterprises(
    request: Request,
    db: Session = Depends(get_platform_db),
):
    """List all enterprises with user and project counts.

    Returns enterprises sorted by creation date (newest first).
    """
    require_platform_admin(request)

    # Get enterprises with counts
    enterprises = db.query(Enterprise).order_by(Enterprise.created_at.desc()).all()

    result = []
    for enterprise in enterprises:
        # Get counts for this enterprise
        user_count = (
            db.query(func.count(User.id))
            .filter(User.enterprise_id == enterprise.id)
            .scalar()
            or 0
        )
        project_count = (
            db.query(func.count(Project.id))
            .filter(Project.enterprise_id == enterprise.id)
            .scalar()
            or 0
        )

        result.append(
            EnterpriseListItem(
                id=enterprise.id,
                slug=enterprise.slug,
                name=enterprise.name,
                is_active=enterprise.is_active,
                created_at=enterprise.created_at,
                subdomain_url=generate_subdomain_url(enterprise.slug),
                user_count=user_count,
                project_count=project_count,
            )
        )

    return result


@router.post(
    "/enterprises",
    response_model=EnterpriseDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_enterprise(
    request: Request,
    enterprise_data: EnterpriseCreate,
    db: Session = Depends(get_platform_db),
):
    """Create a new enterprise.

    Validates that the slug is not reserved and not already in use.
    """
    require_platform_admin(request)

    # Check for reserved slugs
    if enterprise_data.slug.lower() in RESERVED_SLUGS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Slug '{enterprise_data.slug}' is reserved and cannot be used",
        )

    # Check for existing slug
    existing = (
        db.query(Enterprise)
        .filter(Enterprise.slug == enterprise_data.slug.lower())
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Enterprise with slug '{enterprise_data.slug}' already exists",
        )

    # Create enterprise
    enterprise = Enterprise(
        slug=enterprise_data.slug.lower(),
        name=enterprise_data.name,
        is_active=True,
    )
    db.add(enterprise)
    db.commit()
    db.refresh(enterprise)

    return EnterpriseDetailResponse(
        id=enterprise.id,
        slug=enterprise.slug,
        name=enterprise.name,
        is_active=enterprise.is_active,
        created_at=enterprise.created_at,
        updated_at=enterprise.updated_at,
        subdomain_url=generate_subdomain_url(enterprise.slug),
        user_count=0,
        project_count=0,
        institution_count=0,
        storage_used_mb=0.0,
    )


@router.get("/enterprises/{enterprise_id}", response_model=EnterpriseDetailResponse)
def get_enterprise(
    enterprise_id: UUID,
    request: Request,
    db: Session = Depends(get_platform_db),
):
    """Get detailed information about a specific enterprise."""
    require_platform_admin(request)

    enterprise = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    if not enterprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enterprise not found",
        )

    # Get counts
    user_count = (
        db.query(func.count(User.id))
        .filter(User.enterprise_id == enterprise.id)
        .scalar()
        or 0
    )
    project_count = (
        db.query(func.count(Project.id))
        .filter(Project.enterprise_id == enterprise.id)
        .scalar()
        or 0
    )
    institution_count = (
        db.query(func.count(Institution.id))
        .filter(Institution.enterprise_id == enterprise.id)
        .scalar()
        or 0
    )

    # TODO: Calculate storage used from file storage
    storage_used_mb = 0.0

    return EnterpriseDetailResponse(
        id=enterprise.id,
        slug=enterprise.slug,
        name=enterprise.name,
        is_active=enterprise.is_active,
        created_at=enterprise.created_at,
        updated_at=enterprise.updated_at,
        subdomain_url=generate_subdomain_url(enterprise.slug),
        user_count=user_count,
        project_count=project_count,
        institution_count=institution_count,
        storage_used_mb=storage_used_mb,
    )


@router.patch("/enterprises/{enterprise_id}", response_model=EnterpriseDetailResponse)
def update_enterprise(
    enterprise_id: UUID,
    request: Request,
    enterprise_data: EnterpriseUpdate,
    db: Session = Depends(get_platform_db),
):
    """Update an enterprise's name or active status."""
    require_platform_admin(request)

    enterprise = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    if not enterprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enterprise not found",
        )

    # Update fields if provided
    if enterprise_data.name is not None:
        enterprise.name = enterprise_data.name
    if enterprise_data.is_active is not None:
        enterprise.is_active = enterprise_data.is_active

    db.commit()
    db.refresh(enterprise)

    # Get counts
    user_count = (
        db.query(func.count(User.id))
        .filter(User.enterprise_id == enterprise.id)
        .scalar()
        or 0
    )
    project_count = (
        db.query(func.count(Project.id))
        .filter(Project.enterprise_id == enterprise.id)
        .scalar()
        or 0
    )
    institution_count = (
        db.query(func.count(Institution.id))
        .filter(Institution.enterprise_id == enterprise.id)
        .scalar()
        or 0
    )

    return EnterpriseDetailResponse(
        id=enterprise.id,
        slug=enterprise.slug,
        name=enterprise.name,
        is_active=enterprise.is_active,
        created_at=enterprise.created_at,
        updated_at=enterprise.updated_at,
        subdomain_url=generate_subdomain_url(enterprise.slug),
        user_count=user_count,
        project_count=project_count,
        institution_count=institution_count,
        storage_used_mb=0.0,
    )


@router.delete("/enterprises/{enterprise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enterprise(
    enterprise_id: UUID,
    request: Request,
    db: Session = Depends(get_platform_db),
):
    """Soft delete (deactivate) an enterprise.

    This does not permanently delete the enterprise, only marks it as inactive.
    """
    require_platform_admin(request)

    enterprise = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    if not enterprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enterprise not found",
        )

    # Soft delete by deactivating
    enterprise.is_active = False
    db.commit()

    return None


# Platform Email Settings endpoints
@router.get("/settings/email", response_model=PlatformEmailSettingsResponse)
def get_platform_email_settings(
    request: Request,
    db: Session = Depends(get_platform_db),
):
    """Get platform-wide default email settings.

    These settings are inherited by all enterprises that don't have
    their own email configuration.
    """
    require_platform_admin(request)

    email_settings = (
        db.query(EmailSettings)
        .filter(
            EmailSettings.enterprise_id.is_(None),
            EmailSettings.institution_id.is_(None),
        )
        .first()
    )

    if not email_settings:
        # Return defaults if no settings exist yet
        return PlatformEmailSettingsResponse(
            smtp_host="smtp.gmail.com",
            smtp_port=587,
            smtp_user=None,
            from_email=None,
            from_name="EduResearch Project Manager",
            is_active=False,
        )

    return email_settings


@router.put("/settings/email", response_model=PlatformEmailSettingsResponse)
def update_platform_email_settings(
    request: Request,
    settings_data: PlatformEmailSettingsUpdate,
    db: Session = Depends(get_platform_db),
):
    """Update platform-wide default email settings.

    These settings are inherited by all enterprises that don't have
    their own email configuration.
    """
    require_platform_admin(request)

    email_settings = (
        db.query(EmailSettings)
        .filter(
            EmailSettings.enterprise_id.is_(None),
            EmailSettings.institution_id.is_(None),
        )
        .first()
    )

    if not email_settings:
        # Create new platform settings
        email_settings = EmailSettings(
            enterprise_id=None,
            institution_id=None,
        )
        db.add(email_settings)

    # Update fields if provided
    update_data = settings_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(email_settings, field, value)

    db.commit()
    db.refresh(email_settings)

    return email_settings


@router.post("/settings/email/test")
def test_platform_email(
    request: Request,
    test_data: TestEmailRequest,
    db: Session = Depends(get_platform_db),
):
    """Send a test email using platform default settings.

    This verifies that SMTP settings are configured correctly.
    """
    require_platform_admin(request)

    email_service = EmailService(db)
    success = email_service.test_email_settings(
        to=test_data.to,
        institution_id=None,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to send test email. Check SMTP settings.",
        )

    return {"message": f"Test email sent to {test_data.to}"}
