"""Institution routes for EduResearch Project Manager.

Handles institution CRUD operations and admin management.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_enterprise_id,
    get_current_user,
    get_current_superuser,
    get_tenant_db,
    get_unscoped_db,
    is_institution_admin,
)
from app.models.user import User
from app.schemas import (
    InstitutionCreate,
    InstitutionResponse,
    InstitutionUpdate,
    InstitutionWithMembers,
    UserBrief,
)
from app.services import InstitutionService

router = APIRouter()


@router.get("", response_model=List[InstitutionResponse])
def get_institutions(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_tenant_db)
):
    """Get institutions the user has access to.

    Superusers see all institutions.
    Regular users see only their institution.
    """
    institution_service = InstitutionService(db)

    if current_user.is_superuser:
        return institution_service.get_all_institutions()

    # Return user's institution
    if current_user.institution_id:
        inst = institution_service.get_institution(current_user.institution_id)
        return [inst] if inst else []

    return []


@router.get("/public", response_model=List[InstitutionResponse])
def get_institutions_public(db: Session = Depends(get_unscoped_db)):
    """Get all institutions (public endpoint for registration)."""
    institution_service = InstitutionService(db)
    return institution_service.get_all_institutions()


@router.post("", response_model=InstitutionResponse)
def create_institution(
    inst_data: InstitutionCreate,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
):
    """Create a new institution (superuser only)."""
    institution_service = InstitutionService(db)

    try:
        institution = institution_service.create_institution(inst_data, enterprise_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return institution


@router.get("/{institution_id}", response_model=InstitutionWithMembers)
def get_institution(
    institution_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Get institution details."""
    institution_service = InstitutionService(db)
    institution = institution_service.get_institution(institution_id)

    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found"
        )

    # Check access
    if not current_user.is_superuser and current_user.institution_id != institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    return institution


@router.put("/{institution_id}", response_model=InstitutionResponse)
def update_institution(
    institution_id: int,
    inst_data: InstitutionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Update institution (superuser or institution admin)."""
    # Check admin access
    if not current_user.is_superuser and not is_institution_admin(
        db, current_user.id, institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )

    institution_service = InstitutionService(db)

    try:
        institution = institution_service.update_institution(institution_id, inst_data)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return institution


@router.delete("/{institution_id}")
def delete_institution(
    institution_id: int,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_tenant_db),
):
    """Delete an institution (superuser only).

    Will fail if institution has users or projects.
    """
    institution_service = InstitutionService(db)

    # Check for users
    # We need to check if any users belong to this institution
    users = db.query(User).filter(User.institution_id == institution_id).count()
    if users > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete institution with {users} user(s). Remove all users first.",
        )

    # Check for projects
    from app.models.project import Project

    projects = (
        db.query(Project).filter(Project.institution_id == institution_id).count()
    )
    if projects > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete institution with {projects} project(s). Remove all projects first.",
        )

    try:
        institution_service.delete_institution(institution_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {"message": "Institution deleted successfully"}


@router.get("/{institution_id}/admins", response_model=List[UserBrief])
def get_institution_admins(
    institution_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Get institution admins."""
    institution_service = InstitutionService(db)

    # Check institution exists
    institution = institution_service.get_institution(institution_id)
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found"
        )

    # Check access
    if not current_user.is_superuser and current_user.institution_id != institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    try:
        admins = institution_service.get_admins(institution_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return admins


@router.post("/{institution_id}/admins/{user_id}")
def add_institution_admin(
    institution_id: int,
    user_id: int,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_tenant_db),
):
    """Add a user as an admin of an institution (superuser only)."""
    institution_service = InstitutionService(db)

    try:
        institution_service.add_admin(institution_id, user_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {"message": "Admin added successfully"}


@router.delete("/{institution_id}/admins/{user_id}")
def remove_institution_admin(
    institution_id: int,
    user_id: int,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_tenant_db),
):
    """Remove a user as an admin of an institution (superuser only)."""
    institution_service = InstitutionService(db)

    try:
        institution_service.remove_admin(institution_id, user_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {"message": "Admin removed successfully"}


# Keep the members endpoints for backwards compatibility
@router.get("/{institution_id}/members", response_model=List[UserBrief])
def get_institution_members(
    institution_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Get institution members."""
    institution_service = InstitutionService(db)

    institution = institution_service.get_institution(institution_id)
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found"
        )

    # Check access
    if not current_user.is_superuser and current_user.institution_id != institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    return db.query(User).filter(User.institution_id == institution_id).all()
