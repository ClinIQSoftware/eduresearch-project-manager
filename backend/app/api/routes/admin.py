from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.email_settings import EmailSettings
from app.schemas.user import UserResponse, UserUpdateAdmin, UserCreate
from app.schemas.project import ProjectResponse, ProjectUpdate
from app.schemas.email_settings import (
    EmailSettingsCreate, EmailSettingsUpdate, EmailSettingsResponse
)
from app.dependencies import get_current_user, require_superuser, is_organization_admin
from app.services.auth import create_user, get_password_hash

router = APIRouter()


# User Management

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    organization_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)."""
    query = db.query(User)

    if current_user.is_superuser:
        if organization_id:
            query = query.filter(User.organization_id == organization_id)
    else:
        # Org admin can only see their org's users
        if current_user.organization_id:
            if not is_organization_admin(db, current_user.id, current_user.organization_id):
                raise HTTPException(status_code=403, detail="Admin access required")
            query = query.filter(User.organization_id == current_user.organization_id)
        else:
            raise HTTPException(status_code=403, detail="Admin access required")

    return query.order_by(User.name).all()


@router.post("/users", response_model=UserResponse)
def create_user_admin(
    user_data: UserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new user (admin only)."""
    # Check admin access
    if not current_user.is_superuser:
        if user_data.organization_id:
            if not is_organization_admin(db, current_user.id, user_data.organization_id):
                raise HTTPException(status_code=403, detail="Admin access required")
        else:
            raise HTTPException(status_code=403, detail="Superuser access required")

    # Check if email exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = create_user(
        db=db,
        email=user_data.email,
        password=user_data.password,
        name=user_data.name,
        department=user_data.department,
        phone=user_data.phone,
        bio=user_data.bio,
        organization_id=user_data.organization_id
    )

    return user


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user_admin(
    user_id: int,
    user_data: UserUpdateAdmin,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a user (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check admin access
    if not current_user.is_superuser:
        if user.organization_id:
            if not is_organization_admin(db, current_user.id, user.organization_id):
                raise HTTPException(status_code=403, detail="Admin access required")
        else:
            raise HTTPException(status_code=403, detail="Superuser access required")

    # Only superuser can change superuser status
    if user_data.is_superuser is not None and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only superuser can grant superuser status")

    update_data = user_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    """Deactivate a user (superuser only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    user.is_active = False
    db.commit()

    return {"message": "User deactivated"}


# Project Management (Superuser)

@router.get("/projects", response_model=List[ProjectResponse])
def get_all_projects_admin(
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    """Get all projects (superuser only)."""
    return db.query(Project).order_by(Project.created_at.desc()).all()


@router.put("/projects/{project_id}", response_model=ProjectResponse)
def update_project_admin(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    """Update any project (superuser only)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = project_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)
    return project


# Email Settings

@router.get("/email-settings", response_model=EmailSettingsResponse)
def get_email_settings(
    organization_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get email settings."""
    # Check admin access
    if not current_user.is_superuser:
        if organization_id:
            if not is_organization_admin(db, current_user.id, organization_id):
                raise HTTPException(status_code=403, detail="Admin access required")
        else:
            raise HTTPException(status_code=403, detail="Superuser access required")

    settings = db.query(EmailSettings).filter(
        EmailSettings.organization_id == organization_id
    ).first()

    if not settings:
        # Return default settings
        return EmailSettingsResponse(
            id=0,
            organization_id=organization_id,
            smtp_host="smtp.gmail.com",
            smtp_port=587,
            from_name="EduResearch Project Manager",
            is_active=False
        )

    return settings


@router.put("/email-settings", response_model=EmailSettingsResponse)
def update_email_settings(
    settings_data: EmailSettingsUpdate,
    organization_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update email settings."""
    # Check admin access
    if not current_user.is_superuser:
        if organization_id:
            if not is_organization_admin(db, current_user.id, organization_id):
                raise HTTPException(status_code=403, detail="Admin access required")
        else:
            raise HTTPException(status_code=403, detail="Superuser access required")

    settings = db.query(EmailSettings).filter(
        EmailSettings.organization_id == organization_id
    ).first()

    if not settings:
        # Create new settings
        settings = EmailSettings(organization_id=organization_id)
        db.add(settings)

    update_data = settings_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)

    db.commit()
    db.refresh(settings)
    return settings
