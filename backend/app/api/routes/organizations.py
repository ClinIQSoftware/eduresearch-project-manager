from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.organization import Organization, organization_admins
from app.models.user import User
from app.schemas.organization import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse,
    OrganizationWithMembers, AddMemberRequest
)
from app.schemas.user import UserBrief
from app.dependencies import get_current_user, require_superuser, is_organization_admin

router = APIRouter()


@router.get("/", response_model=List[OrganizationResponse])
def get_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get organizations the user belongs to."""
    if current_user.is_superuser:
        return db.query(Organization).all()

    # Return user's organization
    if current_user.organization_id:
        org = db.query(Organization).filter(
            Organization.id == current_user.organization_id
        ).first()
        return [org] if org else []

    return []


@router.post("/", response_model=OrganizationResponse)
def create_organization(
    org_data: OrganizationCreate,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    """Create a new organization (superuser only)."""
    org = Organization(**org_data.model_dump())
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@router.get("/{org_id}", response_model=OrganizationWithMembers)
def get_organization(
    org_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get organization details."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check access
    if not current_user.is_superuser and current_user.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return org


@router.put("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: int,
    org_data: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update organization (admin only)."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check admin access
    if not current_user.is_superuser and not is_organization_admin(db, current_user.id, org_id):
        raise HTTPException(status_code=403, detail="Admin access required")

    update_data = org_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(org, key, value)

    db.commit()
    db.refresh(org)
    return org


@router.get("/{org_id}/members", response_model=List[UserBrief])
def get_organization_members(
    org_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get organization members."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check access
    if not current_user.is_superuser and current_user.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return db.query(User).filter(User.organization_id == org_id).all()


@router.post("/{org_id}/members")
def add_organization_member(
    org_id: int,
    member_data: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add member to organization (admin only)."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check admin access
    if not current_user.is_superuser and not is_organization_admin(db, current_user.id, org_id):
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(User).filter(User.id == member_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Add to organization
    user.organization_id = org_id

    # Add as admin if specified
    if member_data.is_admin:
        db.execute(
            organization_admins.insert().values(
                user_id=user.id,
                organization_id=org_id
            )
        )

    db.commit()
    return {"message": "Member added successfully"}


@router.delete("/{org_id}/members/{user_id}")
def remove_organization_member(
    org_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove member from organization."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check admin access
    if not current_user.is_superuser and not is_organization_admin(db, current_user.id, org_id):
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.organization_id = None

    # Remove admin status if exists
    db.execute(
        organization_admins.delete().where(
            organization_admins.c.user_id == user_id,
            organization_admins.c.organization_id == org_id
        )
    )

    db.commit()
    return {"message": "Member removed successfully"}
