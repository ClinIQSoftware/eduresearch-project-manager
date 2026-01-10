from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.department import Department
from app.models.organization import Institution
from app.models.user import User
from app.schemas.department import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse,
    DepartmentWithMembers
)
from app.schemas.user import UserBrief
from app.dependencies import get_current_user, require_superuser, is_institution_admin

router = APIRouter()


@router.get("/", response_model=List[DepartmentResponse])
def get_departments(
    institution_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get departments, optionally filtered by institution."""
    query = db.query(Department)

    if institution_id:
        query = query.filter(Department.institution_id == institution_id)
    elif not current_user.is_superuser and current_user.institution_id:
        # Default to user's institution
        query = query.filter(Department.institution_id == current_user.institution_id)

    return query.all()


@router.get("/public", response_model=List[DepartmentResponse])
def get_departments_public(
    institution_id: int = None,
    db: Session = Depends(get_db)
):
    """Get all departments (public endpoint for registration)."""
    query = db.query(Department)
    if institution_id:
        query = query.filter(Department.institution_id == institution_id)
    return query.all()


@router.post("/", response_model=DepartmentResponse)
def create_department(
    dept_data: DepartmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new department (superuser or institution admin only)."""
    # Verify institution exists
    inst = db.query(Institution).filter(Institution.id == dept_data.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    # Check permissions
    if not current_user.is_superuser and not is_institution_admin(db, current_user.id, dept_data.institution_id):
        raise HTTPException(status_code=403, detail="Admin access required")

    dept = Department(**dept_data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.get("/{dept_id}", response_model=DepartmentWithMembers)
def get_department(
    dept_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get department details."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Check access
    if not current_user.is_superuser:
        if current_user.institution_id != dept.institution_id:
            raise HTTPException(status_code=403, detail="Access denied")

    return dept


@router.put("/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: int,
    dept_data: DepartmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update department (admin only)."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Check admin access
    if not current_user.is_superuser and not is_institution_admin(db, current_user.id, dept.institution_id):
        raise HTTPException(status_code=403, detail="Admin access required")

    update_data = dept_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dept, key, value)

    db.commit()
    db.refresh(dept)
    return dept


@router.get("/{dept_id}/members", response_model=List[UserBrief])
def get_department_members(
    dept_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get department members."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Check access
    if not current_user.is_superuser:
        if current_user.institution_id != dept.institution_id:
            raise HTTPException(status_code=403, detail="Access denied")

    return db.query(User).filter(User.department_id == dept_id).all()


@router.post("/{dept_id}/members/{user_id}")
def add_department_member(
    dept_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add member to department (admin only)."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Check admin access
    if not current_user.is_superuser and not is_institution_admin(db, current_user.id, dept.institution_id):
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Ensure user is in same institution
    if user.institution_id != dept.institution_id:
        raise HTTPException(
            status_code=400,
            detail="User must be in the same institution as the department"
        )

    user.department_id = dept_id
    db.commit()
    return {"message": "Member added successfully"}


@router.delete("/{dept_id}/members/{user_id}")
def remove_department_member(
    dept_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove member from department."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Check admin access
    if not current_user.is_superuser and not is_institution_admin(db, current_user.id, dept.institution_id):
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.department_id != dept_id:
        raise HTTPException(status_code=400, detail="User is not in this department")

    user.department_id = None
    db.commit()
    return {"message": "Member removed successfully"}


@router.delete("/{dept_id}")
def delete_department(
    dept_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a department (superuser or institution admin only). Will fail if department has users."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Check admin access
    if not current_user.is_superuser and not is_institution_admin(db, current_user.id, dept.institution_id):
        raise HTTPException(status_code=403, detail="Admin access required")

    # Check if department has users
    user_count = db.query(User).filter(User.department_id == dept_id).count()
    if user_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete department with {user_count} user(s). Remove all users first."
        )

    db.delete(dept)
    db.commit()

    return {"message": "Department deleted successfully"}
