from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from io import BytesIO
import secrets
import string
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.email_settings import EmailSettings
from app.models.system_settings import SystemSettings
from app.schemas.user import UserResponse, UserUpdateAdmin, UserCreate, PendingUserResponse
from app.schemas.project import ProjectResponse, ProjectUpdate
from app.schemas.email_settings import (
    EmailSettingsCreate, EmailSettingsUpdate, EmailSettingsResponse
)
from app.schemas.system_settings import (
    SystemSettingsResponse, SystemSettingsUpdate, BulkUploadResult
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


# System Settings

@router.get("/system-settings", response_model=SystemSettingsResponse)
def get_system_settings(
    organization_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get system settings (superuser only for global, org admin for org-specific)."""
    if not current_user.is_superuser:
        if organization_id:
            if not is_organization_admin(db, current_user.id, organization_id):
                raise HTTPException(status_code=403, detail="Admin access required")
        else:
            raise HTTPException(status_code=403, detail="Superuser access required")

    settings = db.query(SystemSettings).filter(
        SystemSettings.organization_id == organization_id
    ).first()

    if not settings:
        # Return default settings
        return SystemSettingsResponse(
            id=0,
            organization_id=organization_id,
            require_registration_approval=False,
            registration_approval_mode="block",
            min_password_length=8,
            require_uppercase=True,
            require_lowercase=True,
            require_numbers=True,
            require_special_chars=False,
            session_timeout_minutes=30,
            google_oauth_enabled=True,
            microsoft_oauth_enabled=True
        )

    return settings


@router.put("/system-settings", response_model=SystemSettingsResponse)
def update_system_settings(
    settings_data: SystemSettingsUpdate,
    organization_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update system settings (superuser only for global, org admin for org-specific)."""
    if not current_user.is_superuser:
        if organization_id:
            if not is_organization_admin(db, current_user.id, organization_id):
                raise HTTPException(status_code=403, detail="Admin access required")
        else:
            raise HTTPException(status_code=403, detail="Superuser access required")

    settings = db.query(SystemSettings).filter(
        SystemSettings.organization_id == organization_id
    ).first()

    if not settings:
        # Create new settings
        settings = SystemSettings(organization_id=organization_id)
        db.add(settings)

    update_data = settings_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)

    db.commit()
    db.refresh(settings)
    return settings


# User Approval

@router.get("/pending-users", response_model=List[PendingUserResponse])
def get_pending_users(
    organization_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get users pending approval."""
    if not current_user.is_superuser:
        if organization_id:
            if not is_organization_admin(db, current_user.id, organization_id):
                raise HTTPException(status_code=403, detail="Admin access required")
        else:
            raise HTTPException(status_code=403, detail="Superuser access required")

    query = db.query(User).filter(User.is_approved == False)

    if organization_id:
        query = query.filter(User.organization_id == organization_id)
    elif not current_user.is_superuser and current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)

    return query.order_by(User.created_at.desc()).all()


@router.post("/approve-user/{user_id}", response_model=UserResponse)
def approve_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a pending user registration."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_approved:
        raise HTTPException(status_code=400, detail="User is already approved")

    # Check admin access
    if not current_user.is_superuser:
        if user.organization_id:
            if not is_organization_admin(db, current_user.id, user.organization_id):
                raise HTTPException(status_code=403, detail="Admin access required")
        else:
            raise HTTPException(status_code=403, detail="Superuser access required")

    user.is_approved = True
    user.approved_at = datetime.utcnow()
    user.approved_by_id = current_user.id

    db.commit()
    db.refresh(user)
    return user


@router.post("/reject-user/{user_id}")
def reject_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject and delete a pending user registration."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_approved:
        raise HTTPException(status_code=400, detail="Cannot reject an approved user")

    # Check admin access
    if not current_user.is_superuser:
        if user.organization_id:
            if not is_organization_admin(db, current_user.id, user.organization_id):
                raise HTTPException(status_code=403, detail="Admin access required")
        else:
            raise HTTPException(status_code=403, detail="Superuser access required")

    db.delete(user)
    db.commit()

    return {"message": "User registration rejected and deleted"}


# Bulk User Upload

def generate_temp_password(length: int = 12) -> str:
    """Generate a secure temporary password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


@router.post("/users/bulk-upload", response_model=BulkUploadResult)
async def bulk_upload_users(
    file: UploadFile = File(...),
    current_user: User = Depends(require_superuser),
    db: Session = Depends(get_db)
):
    """
    Bulk upload users from Excel file.
    Expected columns: email, name, department, phone, bio, organization_id, is_superuser
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")

    try:
        import openpyxl

        contents = await file.read()
        workbook = openpyxl.load_workbook(BytesIO(contents))
        sheet = workbook.active

        # Get headers from first row
        headers = [cell.value.lower().strip() if cell.value else '' for cell in sheet[1]]

        required_columns = ['email', 'name']
        for col in required_columns:
            if col not in headers:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required column: {col}"
                )

        created = 0
        skipped = 0
        errors = []

        for row_num, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            if not any(row):  # Skip empty rows
                continue

            row_data = dict(zip(headers, row))

            email = row_data.get('email', '').strip() if row_data.get('email') else ''
            name = row_data.get('name', '').strip() if row_data.get('name') else ''

            if not email or not name:
                errors.append(f"Row {row_num}: Missing email or name")
                continue

            # Check if user already exists
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                skipped += 1
                continue

            try:
                # Generate temporary password
                temp_password = generate_temp_password()

                # Get optional fields
                department = row_data.get('department', '').strip() if row_data.get('department') else None
                phone = row_data.get('phone', '').strip() if row_data.get('phone') else None
                bio = row_data.get('bio', '').strip() if row_data.get('bio') else None

                org_id = row_data.get('organization_id')
                if org_id and str(org_id).strip():
                    try:
                        org_id = int(org_id)
                    except (ValueError, TypeError):
                        org_id = None
                else:
                    org_id = None

                is_superuser = False
                superuser_val = row_data.get('is_superuser', '')
                if superuser_val:
                    is_superuser = str(superuser_val).lower() in ('true', 'yes', '1', 'y')

                # Create user
                user = User(
                    email=email,
                    name=name,
                    password_hash=get_password_hash(temp_password),
                    department=department,
                    phone=phone,
                    bio=bio,
                    organization_id=org_id,
                    is_superuser=is_superuser,
                    is_approved=True,  # Auto-approve bulk uploaded users
                    is_active=True
                )
                db.add(user)
                created += 1

                # TODO: Send email with temporary password

            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")

        db.commit()

        return BulkUploadResult(
            total_processed=created + skipped + len(errors),
            created=created,
            skipped=skipped,
            errors=errors
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.get("/users/upload-template")
async def get_upload_template(
    current_user: User = Depends(require_superuser)
):
    """Download Excel template for bulk user upload."""
    import openpyxl
    from fastapi.responses import StreamingResponse

    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = "Users"

    # Add headers
    headers = ['email', 'name', 'department', 'phone', 'bio', 'organization_id', 'is_superuser']
    for col, header in enumerate(headers, start=1):
        sheet.cell(row=1, column=col, value=header)

    # Add example row
    example = ['user@example.com', 'John Doe', 'Research', '+1234567890', 'Bio text', '', 'false']
    for col, value in enumerate(example, start=1):
        sheet.cell(row=2, column=col, value=value)

    # Save to BytesIO
    output = BytesIO()
    workbook.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=user_upload_template.xlsx"}
    )
