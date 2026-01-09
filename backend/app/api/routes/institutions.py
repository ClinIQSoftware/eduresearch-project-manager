from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.organization import Institution, organization_admins
from app.models.user import User
from app.schemas.institution import (
    InstitutionCreate, InstitutionUpdate, InstitutionResponse,
    InstitutionWithMembers, AddMemberRequest
)
from app.schemas.user import UserBrief
from app.dependencies import get_current_user, require_superuser, is_institution_admin

router = APIRouter()


@router.get("/", response_model=List[InstitutionResponse])
def get_institutions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get institutions the user belongs to."""
    if current_user.is_superuser:
        return db.query(Institution).all()

    # Return user's institution
    if current_user.institution_id:
        inst = db.query(Institution).filter(
            Institution.id == current_user.institution_id
        ).first()
        return [inst] if inst else []

    return []


@router.post("/", response_model=InstitutionResponse)
def create_institution(
    inst_data: InstitutionCreate,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    """Create a new institution (superuser only)."""
    inst = Institution(**inst_data.model_dump())
    db.add(inst)
    db.commit()
    db.refresh(inst)
    return inst


@router.get("/{inst_id}", response_model=InstitutionWithMembers)
def get_institution(
    inst_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get institution details."""
    inst = db.query(Institution).filter(Institution.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    # Check access
    if not current_user.is_superuser and current_user.institution_id != inst_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return inst


@router.put("/{inst_id}", response_model=InstitutionResponse)
def update_institution(
    inst_id: int,
    inst_data: InstitutionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update institution (admin only)."""
    inst = db.query(Institution).filter(Institution.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    # Check admin access
    if not current_user.is_superuser and not is_institution_admin(db, current_user.id, inst_id):
        raise HTTPException(status_code=403, detail="Admin access required")

    update_data = inst_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(inst, key, value)

    db.commit()
    db.refresh(inst)
    return inst


@router.get("/{inst_id}/members", response_model=List[UserBrief])
def get_institution_members(
    inst_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get institution members."""
    inst = db.query(Institution).filter(Institution.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    # Check access
    if not current_user.is_superuser and current_user.institution_id != inst_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return db.query(User).filter(User.institution_id == inst_id).all()


@router.post("/{inst_id}/members")
def add_institution_member(
    inst_id: int,
    member_data: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add member to institution (admin only)."""
    inst = db.query(Institution).filter(Institution.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    # Check admin access
    if not current_user.is_superuser and not is_institution_admin(db, current_user.id, inst_id):
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(User).filter(User.id == member_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Add to institution
    user.institution_id = inst_id

    # Add as admin if specified
    if member_data.is_admin:
        db.execute(
            organization_admins.insert().values(
                user_id=user.id,
                organization_id=inst_id
            )
        )

    db.commit()
    return {"message": "Member added successfully"}


@router.delete("/{inst_id}/members/{user_id}")
def remove_institution_member(
    inst_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove member from institution."""
    inst = db.query(Institution).filter(Institution.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    # Check admin access
    if not current_user.is_superuser and not is_institution_admin(db, current_user.id, inst_id):
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.institution_id = None

    # Remove admin status if exists
    db.execute(
        organization_admins.delete().where(
            organization_admins.c.user_id == user_id,
            organization_admins.c.organization_id == inst_id
        )
    )

    db.commit()
    return {"message": "Member removed successfully"}


@router.delete("/{inst_id}")
def delete_institution(
    inst_id: int,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    """Delete an institution (superuser only). Will fail if institution has users or projects."""
    inst = db.query(Institution).filter(Institution.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    # Check if institution has users
    user_count = db.query(User).filter(User.institution_id == inst_id).count()
    if user_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete institution with {user_count} user(s). Remove all users first."
        )

    # Check if institution has projects
    from app.models.project import Project
    project_count = db.query(Project).filter(Project.institution_id == inst_id).count()
    if project_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete institution with {project_count} project(s). Remove all projects first."
        )

    # Remove all admin associations
    db.execute(
        organization_admins.delete().where(
            organization_admins.c.organization_id == inst_id
        )
    )

    db.delete(inst)
    db.commit()

    return {"message": "Institution deleted successfully"}
