from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember, MemberRole
from app.models.organization import organization_admins
from app.services.auth import decode_access_token, get_user_by_id

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user from the JWT token."""
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user_by_id(db, int(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get the current user if authenticated, otherwise return None."""
    if credentials is None:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Require the current user to be a superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required"
        )
    return current_user


def check_admin_access(
    db: Session,
    current_user: User,
    institution_id: Optional[int] = None
) -> bool:
    """
    Check if user has admin access.
    - Superusers always have access
    - Institution admins have access to their institution
    - Non-superusers without institution_id are denied
    """
    if current_user.is_superuser:
        return True
    if institution_id:
        return is_institution_admin(db, current_user.id, institution_id)
    return False


def require_admin_access_check(
    institution_id: Optional[int],
    current_user: User,
    db: Session
) -> User:
    """
    Verify admin access and return user or raise 403.
    Use this helper in routes that need admin access.
    """
    if not check_admin_access(db, current_user, institution_id):
        if institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Superuser access required"
            )
    return current_user


def is_organization_admin(db: Session, user_id: int, organization_id: int) -> bool:
    """Check if user is an admin of the organization/institution."""
    result = db.execute(
        organization_admins.select().where(
            organization_admins.c.user_id == user_id,
            organization_admins.c.organization_id == organization_id
        )
    ).first()
    return result is not None


# Alias for institution terminology
def is_institution_admin(db: Session, user_id: int, institution_id: int) -> bool:
    """Check if user is an admin of the institution."""
    return is_organization_admin(db, user_id, institution_id)


def require_organization_admin(organization_id: int):
    """Dependency factory to require organization admin access."""
    def dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        if current_user.is_superuser:
            return current_user

        if not is_organization_admin(db, current_user.id, organization_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Institution admin access required"
            )
        return current_user

    return dependency


def require_institution_admin(institution_id: int):
    """Dependency factory to require institution admin access."""
    return require_organization_admin(institution_id)


def get_project_or_404(project_id: int, db: Session = Depends(get_db)) -> Project:
    """Get a project by ID or raise 404."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project


def is_project_lead(db: Session, user_id: int, project_id: int) -> bool:
    """Check if user is a lead of the project (via ProjectMember role)."""
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id,
        ProjectMember.role == MemberRole.lead
    ).first()
    return member is not None


def count_project_leads(db: Session, project_id: int) -> int:
    """Count the number of leads for a project."""
    return db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.role == MemberRole.lead
    ).count()


def get_project_leads(db: Session, project_id: int) -> list:
    """Get all leads for a project."""
    return db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.role == MemberRole.lead
    ).all()


def is_project_member(db: Session, user_id: int, project_id: int) -> bool:
    """Check if user is a member of the project."""
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()
    return member is not None


def require_project_lead(project_id: int):
    """Dependency factory to require project lead access."""
    def dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        if current_user.is_superuser:
            return current_user

        if not is_project_lead(db, current_user.id, project_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Project lead access required"
            )
        return current_user

    return dependency


def require_project_access(project_id: int):
    """Dependency factory to require at least project member access."""
    def dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        if current_user.is_superuser:
            return current_user

        if is_project_lead(db, current_user.id, project_id):
            return current_user

        if is_project_member(db, current_user.id, project_id):
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project access required"
        )

    return dependency
