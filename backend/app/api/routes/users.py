"""User routes for EduResearch Project Manager.

Handles user listing, retrieval, and approval workflows (admin only).
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_superuser, get_db, is_institution_admin
from app.models.user import User
from app.schemas import (
    PendingUserResponse,
    UserResponse,
)
from app.services import UserService

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
def list_users(
    institution_id: Optional[int] = None,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """List all users (superuser only).

    Can optionally filter by institution_id.
    """
    # For now we query directly since UserService doesn't have list_all
    query = db.query(User)
    if institution_id:
        query = query.filter(User.institution_id == institution_id)
    return query.order_by(User.last_name, User.first_name).all()


@router.get("/pending", response_model=List[PendingUserResponse])
def get_pending_users(
    institution_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get users pending approval.

    Superusers can see all pending users.
    Institution admins can see pending users from their institution.
    """
    # Check admin access
    if not current_user.is_superuser:
        if institution_id:
            if not is_institution_admin(db, current_user.id, institution_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin access required"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Superuser access required"
            )

    user_service = UserService(db)
    pending_users = user_service.get_pending_users()

    # Filter by institution if specified or if user is institution admin
    if institution_id:
        pending_users = [u for u in pending_users if u.institution_id == institution_id]
    elif not current_user.is_superuser and current_user.institution_id:
        pending_users = [u for u in pending_users if u.institution_id == current_user.institution_id]

    return pending_users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a user by ID.

    Users can view their own profile.
    Superusers can view any user.
    Institution admins can view users in their institution.
    """
    user_service = UserService(db)
    user = user_service.get_user(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check access
    if current_user.id == user_id:
        return user

    if current_user.is_superuser:
        return user

    if user.institution_id and is_institution_admin(db, current_user.id, user.institution_id):
        return user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied"
    )


@router.post("/{user_id}/approve", response_model=UserResponse)
def approve_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a pending user registration.

    Superusers can approve any user.
    Institution admins can approve users from their institution.
    """
    user_service = UserService(db)
    user = user_service.get_user(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already approved"
        )

    # Check admin access
    if not current_user.is_superuser:
        if user.institution_id:
            if not is_institution_admin(db, current_user.id, user.institution_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin access required"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Superuser access required"
            )

    try:
        # Note: approve_user requires superuser, but we've already checked permissions
        # For institution admins, we temporarily mark them as superuser for this call
        if current_user.is_superuser:
            approved_user = user_service.approve_user(user_id, current_user)
        else:
            # Institution admin approval - do it directly
            from datetime import datetime, timezone
            from app.repositories import UserRepository
            user_repo = UserRepository(db)
            approved_user = user_repo.update(
                user_id,
                {
                    "is_approved": True,
                    "approved_at": datetime.now(timezone.utc),
                    "approved_by_id": current_user.id,
                }
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return approved_user


@router.post("/{user_id}/reject")
def reject_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject and delete a pending user registration.

    Superusers can reject any user.
    Institution admins can reject users from their institution.
    """
    user_service = UserService(db)
    user = user_service.get_user(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reject an approved user"
        )

    # Check admin access
    if not current_user.is_superuser:
        if user.institution_id:
            if not is_institution_admin(db, current_user.id, user.institution_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin access required"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Superuser access required"
            )

    try:
        user_service.reject_user(user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {"message": "User registration rejected and deleted"}
