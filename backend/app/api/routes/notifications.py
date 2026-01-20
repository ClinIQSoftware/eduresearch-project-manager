"""API routes for notifications."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.notification import NotificationType
from app.services.notification_service import NotificationService
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
    NotificationPreferenceResponse,
    NotificationPreferencesListResponse,
    NotificationPreferencesBulkUpdate
)

router = APIRouter()


def get_notification_service(db: Session = Depends(get_db)) -> NotificationService:
    """Dependency to get notification service."""
    return NotificationService(db)


# ==================== Notification Endpoints ====================

@router.get("/", response_model=NotificationListResponse)
def get_notifications(
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    notification_type: Optional[str] = Query(None, description="Filter by notification type"),
    limit: int = Query(50, ge=1, le=100, description="Maximum notifications to return"),
    offset: int = Query(0, ge=0, description="Number of notifications to skip"),
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Get notifications for the current user."""
    notifications = service.get_notifications(
        user_id=current_user.id,
        is_read=is_read,
        notification_type=notification_type,
        limit=limit,
        offset=offset
    )

    total = service.get_total_count(current_user.id, is_read=is_read)
    unread_count = service.get_unread_count(current_user.id)

    return NotificationListResponse(
        notifications=notifications,
        total=total,
        unread_count=unread_count
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Get the count of unread notifications."""
    count = service.get_unread_count(current_user.id)
    return UnreadCountResponse(count=count)


@router.put("/{notification_id}/read", response_model=dict)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Mark a single notification as read."""
    success = service.mark_as_read(notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True, "message": "Notification marked as read"}


@router.put("/read-all", response_model=dict)
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Mark all notifications as read."""
    count = service.mark_all_as_read(current_user.id)
    return {"success": True, "message": f"Marked {count} notifications as read"}


@router.delete("/{notification_id}", response_model=dict)
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Delete a notification."""
    success = service.delete_notification(notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True, "message": "Notification deleted"}


# ==================== Preference Endpoints ====================

@router.get("/preferences", response_model=NotificationPreferencesListResponse)
def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Get all notification preferences for the current user."""
    preferences = service.get_all_preferences(current_user.id)

    # Convert to response format
    pref_responses = []
    for pref in preferences:
        pref_responses.append(NotificationPreferenceResponse(
            id=pref["id"] or 0,  # Use 0 for defaults that aren't stored
            user_id=pref["user_id"],
            notification_type=pref["notification_type"],
            in_app_enabled=pref["in_app_enabled"],
            email_enabled=pref["email_enabled"]
        ))

    return NotificationPreferencesListResponse(preferences=pref_responses)


@router.put("/preferences", response_model=NotificationPreferencesListResponse)
def update_notification_preferences(
    update_data: NotificationPreferencesBulkUpdate,
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Update notification preferences."""
    # Validate notification types
    valid_types = {nt.value for nt in NotificationType}
    for pref in update_data.preferences:
        if pref.notification_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid notification type: {pref.notification_type}"
            )

    # Convert to dict format for service
    pref_dicts = [
        {
            "notification_type": p.notification_type,
            "in_app_enabled": p.in_app_enabled,
            "email_enabled": p.email_enabled
        }
        for p in update_data.preferences
    ]

    service.bulk_update_preferences(current_user.id, pref_dicts)

    # Return updated preferences
    return get_notification_preferences(current_user, service)


@router.post("/preferences/reset", response_model=dict)
def reset_preferences_to_defaults(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Reset all notification preferences to defaults."""
    service.reset_to_defaults(current_user.id)
    return {"success": True, "message": "Preferences reset to defaults"}


# ==================== Notification Type Info ====================

@router.get("/types", response_model=List[dict])
def get_notification_types():
    """Get all available notification types with their default settings."""
    from app.models.notification import DEFAULT_PREFERENCES

    result = []
    for ntype in NotificationType:
        defaults = DEFAULT_PREFERENCES.get(ntype, {"in_app": True, "email": False})
        result.append({
            "type": ntype.value,
            "category": _get_type_category(ntype),
            "label": _get_type_label(ntype),
            "description": _get_type_description(ntype),
            "default_in_app": defaults["in_app"],
            "default_email": defaults["email"]
        })

    return result


def _get_type_category(ntype: NotificationType) -> str:
    """Get the category for a notification type."""
    if ntype in [NotificationType.task_assigned, NotificationType.task_due_soon, NotificationType.task_completed]:
        return "tasks"
    elif ntype in [NotificationType.join_approved, NotificationType.join_rejected,
                   NotificationType.added_to_project, NotificationType.removed_from_project]:
        return "membership"
    else:
        return "projects"


def _get_type_label(ntype: NotificationType) -> str:
    """Get a human-readable label for a notification type."""
    labels = {
        NotificationType.task_assigned: "Task Assigned",
        NotificationType.task_due_soon: "Task Due Soon",
        NotificationType.task_completed: "Task Completed",
        NotificationType.join_approved: "Join Request Approved",
        NotificationType.join_rejected: "Join Request Rejected",
        NotificationType.added_to_project: "Added to Project",
        NotificationType.removed_from_project: "Removed from Project",
        NotificationType.project_status_changed: "Project Status Changed",
        NotificationType.file_uploaded: "File Uploaded",
        NotificationType.deadline_approaching: "Deadline Approaching",
        NotificationType.meeting_approaching: "Meeting Approaching",
    }
    return labels.get(ntype, ntype.value.replace("_", " ").title())


def _get_type_description(ntype: NotificationType) -> str:
    """Get a description for a notification type."""
    descriptions = {
        NotificationType.task_assigned: "When a task is assigned to you",
        NotificationType.task_due_soon: "When a task is due within 24 hours",
        NotificationType.task_completed: "When a task you created is marked complete",
        NotificationType.join_approved: "When your join request is approved",
        NotificationType.join_rejected: "When your join request is rejected",
        NotificationType.added_to_project: "When you are added to a project",
        NotificationType.removed_from_project: "When you are removed from a project",
        NotificationType.project_status_changed: "When a project's status changes",
        NotificationType.file_uploaded: "When a file is uploaded to your project",
        NotificationType.deadline_approaching: "When a project deadline is within 7 days",
        NotificationType.meeting_approaching: "When a project meeting is within 24 hours",
    }
    return descriptions.get(ntype, "")
