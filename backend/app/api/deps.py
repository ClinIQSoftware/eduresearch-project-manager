"""Shared dependencies for API routes.

This module provides dependency injection functions for FastAPI routes,
including authentication, authorization, and database session management.
"""

from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.database import SessionLocal, get_tenant_session, get_platform_session
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember, MemberRole
from app.models.organization import organization_admins
from app.services import AuthService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_db():
    """Get a database session.

    Yields:
        Session: SQLAlchemy database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Get the current authenticated user from JWT token.

    Args:
        request: The FastAPI request object.
        token: JWT access token from Authorization header.
        db: Database session.

    Returns:
        The authenticated User.

    Raises:
        HTTPException: If token is invalid or user is not active/approved.
        HTTPException: If JWT enterprise_id doesn't match subdomain enterprise_id.
    """
    auth_service = AuthService(db)
    user = auth_service.get_user_from_token(token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated"
        )

    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account pending approval"
        )

    # Validate JWT enterprise_id matches subdomain enterprise_id
    if hasattr(request.state, "enterprise_id") and request.state.enterprise_id:
        payload = decode_token(token)
        if payload:
            jwt_enterprise_id = payload.get("enterprise_id")
            if jwt_enterprise_id:
                subdomain_enterprise_id = str(request.state.enterprise_id)
                if jwt_enterprise_id != subdomain_enterprise_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Token not valid for this enterprise",
                    )

    return user


def get_current_user_optional(
    token: Optional[str] = Depends(
        OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)
    ),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Get the current user if authenticated, otherwise return None.

    Useful for endpoints that have different behavior for authenticated
    vs unauthenticated users.

    Args:
        token: Optional JWT access token.
        db: Database session.

    Returns:
        The User if authenticated and valid, None otherwise.
    """
    if not token:
        return None

    try:
        return get_current_user(token, db)
    except HTTPException:
        return None


def get_current_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Require the current user to be a superuser.

    Args:
        current_user: The authenticated user.

    Returns:
        The superuser.

    Raises:
        HTTPException: If user is not a superuser.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Superuser access required"
        )
    return current_user


# Alias for backwards compatibility
require_superuser = get_current_superuser


def is_institution_admin(db: Session, user_id: int, institution_id: int) -> bool:
    """Check if a user is an admin of an institution.

    Args:
        db: Database session.
        user_id: The user's ID.
        institution_id: The institution's ID.

    Returns:
        True if user is an admin of the institution.
    """
    result = db.execute(
        organization_admins.select().where(
            organization_admins.c.user_id == user_id,
            organization_admins.c.organization_id == institution_id,
        )
    ).first()
    return result is not None


def is_project_lead(db: Session, user_id: int, project_id: int) -> bool:
    """Check if a user is a lead of a project.

    Args:
        db: Database session.
        user_id: The user's ID.
        project_id: The project's ID.

    Returns:
        True if user is a lead of the project.
    """
    member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
            ProjectMember.role == MemberRole.lead,
        )
        .first()
    )
    return member is not None


def is_project_member(db: Session, user_id: int, project_id: int) -> bool:
    """Check if a user is a member of a project.

    Args:
        db: Database session.
        user_id: The user's ID.
        project_id: The project's ID.

    Returns:
        True if user is a member of the project.
    """
    member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id, ProjectMember.user_id == user_id
        )
        .first()
    )
    return member is not None


def count_project_leads(db: Session, project_id: int) -> int:
    """Count the number of leads for a project.

    Args:
        db: Database session.
        project_id: The project's ID.

    Returns:
        Number of leads for the project.
    """
    return (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.role == MemberRole.lead,
        )
        .count()
    )


def get_project_or_404(project_id: int, db: Session = Depends(get_db)) -> Project:
    """Get a project by ID or raise 404.

    Args:
        project_id: The project's ID.
        db: Database session.

    Returns:
        The Project.

    Raises:
        HTTPException: If project not found.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return project


def check_admin_access(
    db: Session, current_user: User, institution_id: Optional[int] = None
) -> bool:
    """Check if user has admin access.

    Superusers always have access. Institution admins have access
    to their institution only.

    Args:
        db: Database session.
        current_user: The current user.
        institution_id: Optional institution ID to check.

    Returns:
        True if user has admin access.
    """
    if current_user.is_superuser:
        return True
    if institution_id:
        return is_institution_admin(db, current_user.id, institution_id)
    return False


def require_admin_access(
    institution_id: Optional[int], current_user: User, db: Session
) -> User:
    """Verify admin access and return user or raise 403.

    Args:
        institution_id: Optional institution ID.
        current_user: The current user.
        db: Database session.

    Returns:
        The current user if they have admin access.

    Raises:
        HTTPException: If user doesn't have admin access.
    """
    if not check_admin_access(db, current_user, institution_id):
        if institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Superuser access required",
            )
    return current_user


def get_tenant_db(request: Request) -> Session:
    """Dependency for tenant-scoped database access."""
    yield from get_tenant_session(request)


def get_platform_db() -> Session:
    """Dependency for platform admin database access (no RLS)."""
    yield from get_platform_session()


def get_current_enterprise_id(request: Request) -> UUID:
    """Get current enterprise ID from request state."""
    if not hasattr(request.state, "enterprise_id") or not request.state.enterprise_id:
        raise HTTPException(status_code=400, detail="Enterprise context required")
    return request.state.enterprise_id


def get_platform_admin_id(
    request: Request,
    token: str = Depends(OAuth2PasswordBearer(tokenUrl="/api/platform/auth/login", auto_error=False)),
) -> Optional[UUID]:
    """Extract platform admin ID from JWT token.

    This is used for platform admin routes that need to identify the current admin.
    Sets the platform_admin_id on request.state for use in route handlers.

    Args:
        request: The FastAPI request object.
        token: JWT access token from Authorization header.

    Returns:
        The platform admin ID if token is valid and is_platform_admin is True.
    """
    if not token:
        return None

    payload = decode_token(token)
    if not payload:
        return None

    # Verify this is a platform admin token
    if not payload.get("is_platform_admin"):
        return None

    admin_id_str = payload.get("sub")
    if not admin_id_str:
        return None

    try:
        admin_id = UUID(admin_id_str)
        # Set on request state for use in require_platform_admin
        request.state.platform_admin_id = admin_id
        request.state.is_platform_admin = True
        return admin_id
    except (ValueError, TypeError):
        return None
