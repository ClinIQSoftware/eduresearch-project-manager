"""Department routes for EduResearch Project Manager.

Handles department CRUD operations.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_enterprise_id, get_current_user, get_tenant_db, get_unscoped_db, is_institution_admin
from app.models.user import User
from app.schemas import (
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
    DepartmentWithMembers,
    UserBrief,
)
from app.services import DepartmentService

router = APIRouter()


@router.get("", response_model=List[DepartmentResponse])
def get_departments(
    institution_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Get departments, optionally filtered by institution."""
    department_service = DepartmentService(db)

    if institution_id:
        try:
            return department_service.get_by_institution(institution_id)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    # Default to user's institution if not superuser
    if not current_user.is_superuser and current_user.institution_id:
        try:
            return department_service.get_by_institution(current_user.institution_id)
        except Exception:
            return []

    # Superusers with no filter - return all departments
    # Note: DepartmentService doesn't have get_all, so we query directly
    from app.models.department import Department

    return db.query(Department).all()


@router.get("/public", response_model=List[DepartmentResponse])
def get_departments_public(
    institution_id: Optional[int] = None, db: Session = Depends(get_unscoped_db)
):
    """Get all departments (public endpoint for registration)."""
    from app.models.department import Department

    query = db.query(Department)
    if institution_id:
        query = query.filter(Department.institution_id == institution_id)
    return query.all()


@router.post("", response_model=DepartmentResponse)
def create_department(
    dept_data: DepartmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
    enterprise_id: UUID = Depends(get_current_enterprise_id),
):
    """Create a new department (superuser or institution admin only)."""
    # Check permissions
    if not current_user.is_superuser and not is_institution_admin(
        db, current_user.id, dept_data.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )

    department_service = DepartmentService(db)

    try:
        department = department_service.create_department(dept_data, enterprise_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return department


@router.get("/{department_id}", response_model=DepartmentWithMembers)
def get_department(
    department_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Get department details."""
    department_service = DepartmentService(db)
    department = department_service.get_department(department_id)

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department not found"
        )

    # Check access
    if not current_user.is_superuser:
        if current_user.institution_id != department.institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
            )

    return department


@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    dept_data: DepartmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Update department (admin only)."""
    department_service = DepartmentService(db)
    department = department_service.get_department(department_id)

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department not found"
        )

    # Check admin access
    if not current_user.is_superuser and not is_institution_admin(
        db, current_user.id, department.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )

    try:
        updated_department = department_service.update_department(
            department_id, dept_data
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return updated_department


@router.delete("/{department_id}")
def delete_department(
    department_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Delete a department (superuser or institution admin only).

    Will fail if department has users.
    """
    department_service = DepartmentService(db)
    department = department_service.get_department(department_id)

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department not found"
        )

    # Check admin access
    if not current_user.is_superuser and not is_institution_admin(
        db, current_user.id, department.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )

    # Check if department has users
    user_count = db.query(User).filter(User.department_id == department_id).count()
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete department with {user_count} user(s). Remove all users first.",
        )

    try:
        department_service.delete_department(department_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {"message": "Department deleted successfully"}


@router.get("/{department_id}/members", response_model=List[UserBrief])
def get_department_members(
    department_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Get department members."""
    department_service = DepartmentService(db)
    department = department_service.get_department(department_id)

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department not found"
        )

    # Check access
    if not current_user.is_superuser:
        if current_user.institution_id != department.institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
            )

    return db.query(User).filter(User.department_id == department_id).all()


@router.post("/{department_id}/members/{user_id}")
def add_department_member(
    department_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Add member to department (admin only)."""
    department_service = DepartmentService(db)
    department = department_service.get_department(department_id)

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department not found"
        )

    # Check admin access
    if not current_user.is_superuser and not is_institution_admin(
        db, current_user.id, department.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Ensure user is in same institution
    if user.institution_id != department.institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be in the same institution as the department",
        )

    user.department_id = department_id
    db.commit()
    return {"message": "Member added successfully"}


@router.delete("/{department_id}/members/{user_id}")
def remove_department_member(
    department_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Remove member from department."""
    department_service = DepartmentService(db)
    department = department_service.get_department(department_id)

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department not found"
        )

    # Check admin access
    if not current_user.is_superuser and not is_institution_admin(
        db, current_user.id, department.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if user.department_id != department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not in this department",
        )

    user.department_id = None
    db.commit()
    return {"message": "Member removed successfully"}
