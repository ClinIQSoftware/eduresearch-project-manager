"""Platform Admin routes for EduResearch Project Manager.

Provides endpoints for platform-level administration operations including
enterprise management, platform statistics, and admin authentication.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_platform_admin_id, get_platform_db
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
    PasswordChangeRequest,
    PlatformAdminCredentialsUpdate,
    PlatformAdminLogin,
    PlatformAdminProfileResponse,
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


def require_platform_admin(
    request: Request,
    admin_id: UUID = Depends(get_platform_admin_id),
) -> UUID:
    """Verify that the request is from an authenticated platform admin.

    Checks both the middleware flag AND a valid JWT token to prevent
    header-only bypass attacks.

    Returns:
        The verified platform admin UUID.
    """
    if not getattr(request.state, "is_platform_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required",
        )
    if not admin_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid platform admin token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return admin_id


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

    return {
        "access_token": token,
        "token_type": "bearer",
        "must_change_password": admin.must_change_password,
    }


@router.post("/auth/change-password")
def change_password(
    password_data: PasswordChangeRequest,
    admin_id: UUID = Depends(require_platform_admin),
    db: Session = Depends(get_platform_db),
):
    """Change platform admin password.

    Requires authentication. The current password must be provided
    for verification. On success, clears the must_change_password flag.
    """
    admin = db.query(PlatformAdmin).filter(PlatformAdmin.id == admin_id).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found",
        )

    if not verify_password(password_data.current_password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password incorrect",
        )

    admin.password_hash = hash_password(password_data.new_password)
    admin.must_change_password = False
    db.commit()

    return {"message": "Password changed successfully"}


@router.get("/me", response_model=PlatformAdminProfileResponse)
def get_current_admin_profile(
    admin_id: UUID = Depends(require_platform_admin),
    db: Session = Depends(get_platform_db),
):
    """Get the current platform admin's profile.

    Returns the admin's profile information based on the JWT token.
    """
    admin = db.query(PlatformAdmin).filter(PlatformAdmin.id == admin_id).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin account not found",
        )

    return admin


@router.put("/me", response_model=PlatformAdminProfileResponse)
def update_admin_credentials(
    credentials_data: PlatformAdminCredentialsUpdate,
    admin_id: UUID = Depends(require_platform_admin),
    db: Session = Depends(get_platform_db),
):
    """Update the current platform admin's credentials.

    Requires current password for verification. Can update email,
    password, and/or name.
    """
    admin = db.query(PlatformAdmin).filter(PlatformAdmin.id == admin_id).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin account not found",
        )

    # Verify current password
    if not verify_password(credentials_data.current_password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    # Update email if provided
    if credentials_data.new_email is not None:
        # Check if email is already in use by another admin
        existing = (
            db.query(PlatformAdmin)
            .filter(
                PlatformAdmin.email == credentials_data.new_email,
                PlatformAdmin.id != admin.id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already in use by another admin",
            )
        admin.email = credentials_data.new_email

    # Update password if provided
    if credentials_data.new_password is not None:
        admin.password_hash = hash_password(credentials_data.new_password)

    # Update name if provided
    if credentials_data.new_name is not None:
        admin.name = credentials_data.new_name

    db.commit()
    db.refresh(admin)

    return admin


@router.get("/stats", response_model=PlatformStatsResponse)
def get_platform_stats(
    _admin_id: UUID = Depends(require_platform_admin),
    db: Session = Depends(get_platform_db),
):
    """Get platform-wide statistics.

    Returns counts of enterprises, users, projects, and institutions.
    """

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
    _admin_id: UUID = Depends(require_platform_admin),
    db: Session = Depends(get_platform_db),
):
    """List all enterprises with user and project counts.

    Returns enterprises sorted by creation date (newest first).
    """

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
    enterprise_data: EnterpriseCreate,
    _admin_id: UUID = Depends(require_platform_admin),
    db: Session = Depends(get_platform_db),
):
    """Create a new enterprise.

    Validates that the slug is not reserved and not already in use.
    """

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
    _admin_id: UUID = Depends(require_platform_admin),
    db: Session = Depends(get_platform_db),
):
    """Get detailed information about a specific enterprise."""

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
    enterprise_data: EnterpriseUpdate,
    _admin_id: UUID = Depends(require_platform_admin),
    db: Session = Depends(get_platform_db),
):
    """Update an enterprise's name or active status."""

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
    _admin_id: UUID = Depends(require_platform_admin),
    db: Session = Depends(get_platform_db),
):
    """Soft delete (deactivate) an enterprise.

    This does not permanently delete the enterprise, only marks it as inactive.
    """

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
    _admin_id: UUID = Depends(require_platform_admin),
    db: Session = Depends(get_platform_db),
):
    """Get platform-wide default email settings.

    These settings are inherited by all enterprises that don't have
    their own email configuration.
    """

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
    settings_data: PlatformEmailSettingsUpdate,
    _admin_id: UUID = Depends(require_platform_admin),
    db: Session = Depends(get_platform_db),
):
    """Update platform-wide default email settings.

    These settings are inherited by all enterprises that don't have
    their own email configuration.
    """

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
    test_data: TestEmailRequest,
    _admin_id: UUID = Depends(require_platform_admin),
    db: Session = Depends(get_platform_db),
):
    """Send a test email using platform default settings.

    This verifies that SMTP settings are configured correctly.
    """

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


@router.get("/setup-status")
def get_setup_status(
    admin_id: UUID = Depends(require_platform_admin),
    db: Session = Depends(get_platform_db),
):
    """Get platform setup status for admin dashboard."""
    admin = db.query(PlatformAdmin).filter(PlatformAdmin.id == admin_id).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin account not found",
        )

    return {
        "platform_admin": {
            "configured": True,
            "must_change_password": admin.must_change_password,
        },
        "email": {
            "configured": bool(settings.smtp_user and settings.smtp_password),
            "provider": settings.smtp_host if settings.smtp_user else None,
        },
        "oauth": {
            "google": bool(settings.google_client_id),
            "microsoft": bool(settings.microsoft_client_id),
        },
        "database": {
            "connected": True,  # If we got here, DB is connected
        },
    }
