"""Notification service for creating and managing notifications."""
import logging
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.notification import (
    Notification, NotificationPreference, NotificationType, DEFAULT_PREFERENCES
)
from app.models.user import User
from app.models.task import Task
from app.models.project import Project
from app.models.join_request import JoinRequest
from app.services.email import EmailService

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for creating and managing user notifications."""

    def __init__(self, db: Session, email_service: Optional[EmailService] = None):
        self.db = db
        self.email_service = email_service or EmailService()

    # ==================== Core Methods ====================

    def get_user_preference(
        self, user_id: int, notification_type: str
    ) -> dict:
        """Get user's preference for a notification type, or return defaults."""
        pref = self.db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user_id,
            NotificationPreference.notification_type == notification_type
        ).first()

        if pref:
            return {
                "in_app": pref.in_app_enabled,
                "email": pref.email_enabled
            }

        # Return default preference for this type
        try:
            ntype = NotificationType(notification_type)
            return DEFAULT_PREFERENCES.get(ntype, {"in_app": True, "email": False})
        except ValueError:
            return {"in_app": True, "email": False}

    def create_notification(
        self,
        user_id: int,
        notification_type: str,
        title: str,
        message: Optional[str] = None,
        project_id: Optional[int] = None,
        task_id: Optional[int] = None,
        actor_id: Optional[int] = None
    ) -> Optional[Notification]:
        """Create a notification if user has in-app enabled for this type."""
        prefs = self.get_user_preference(user_id, notification_type)

        if not prefs["in_app"]:
            logger.debug(f"User {user_id} has in-app disabled for {notification_type}")
            return None

        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            project_id=project_id,
            task_id=task_id,
            actor_id=actor_id,
            is_read=False
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)

        logger.info(f"Created notification {notification.id} for user {user_id}: {title}")
        return notification

    async def send_email_if_enabled(
        self,
        user_id: int,
        notification_type: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None
    ) -> bool:
        """Send email notification if user has email enabled for this type."""
        prefs = self.get_user_preference(user_id, notification_type)

        if not prefs["email"]:
            logger.debug(f"User {user_id} has email disabled for {notification_type}")
            return False

        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.email:
            logger.warning(f"User {user_id} not found or has no email")
            return False

        return await self.email_service.send_email(
            to_email=user.email,
            subject=subject,
            body=body,
            html_body=html_body
        )

    # ==================== Query Methods ====================

    def get_notifications(
        self,
        user_id: int,
        is_read: Optional[bool] = None,
        notification_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Notification]:
        """Get notifications for a user with optional filters."""
        query = self.db.query(Notification).filter(Notification.user_id == user_id)

        if is_read is not None:
            query = query.filter(Notification.is_read == is_read)

        if notification_type:
            query = query.filter(Notification.type == notification_type)

        return query.order_by(desc(Notification.created_at)).offset(offset).limit(limit).all()

    def get_unread_count(self, user_id: int) -> int:
        """Get count of unread notifications for a user."""
        return self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()

    def get_total_count(self, user_id: int, is_read: Optional[bool] = None) -> int:
        """Get total count of notifications for a user."""
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        if is_read is not None:
            query = query.filter(Notification.is_read == is_read)
        return query.count()

    def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        """Mark a notification as read."""
        notification = self.db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()

        if not notification:
            return False

        notification.is_read = True
        self.db.commit()
        return True

    def mark_all_as_read(self, user_id: int) -> int:
        """Mark all notifications as read for a user. Returns count updated."""
        result = self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({"is_read": True})
        self.db.commit()
        return result

    def delete_notification(self, notification_id: int, user_id: int) -> bool:
        """Delete a notification."""
        notification = self.db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()

        if not notification:
            return False

        self.db.delete(notification)
        self.db.commit()
        return True

    # ==================== Preference Methods ====================

    def get_all_preferences(self, user_id: int) -> List[dict]:
        """Get all notification preferences for a user, including defaults."""
        stored_prefs = {
            p.notification_type: p
            for p in self.db.query(NotificationPreference).filter(
                NotificationPreference.user_id == user_id
            ).all()
        }

        result = []
        for ntype in NotificationType:
            if ntype.value in stored_prefs:
                pref = stored_prefs[ntype.value]
                result.append({
                    "id": pref.id,
                    "user_id": user_id,
                    "notification_type": ntype.value,
                    "in_app_enabled": pref.in_app_enabled,
                    "email_enabled": pref.email_enabled
                })
            else:
                defaults = DEFAULT_PREFERENCES.get(ntype, {"in_app": True, "email": False})
                result.append({
                    "id": None,
                    "user_id": user_id,
                    "notification_type": ntype.value,
                    "in_app_enabled": defaults["in_app"],
                    "email_enabled": defaults["email"]
                })

        return result

    def update_preference(
        self,
        user_id: int,
        notification_type: str,
        in_app_enabled: Optional[bool] = None,
        email_enabled: Optional[bool] = None
    ) -> NotificationPreference:
        """Update or create a notification preference."""
        pref = self.db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user_id,
            NotificationPreference.notification_type == notification_type
        ).first()

        if pref:
            if in_app_enabled is not None:
                pref.in_app_enabled = in_app_enabled
            if email_enabled is not None:
                pref.email_enabled = email_enabled
        else:
            # Get defaults for unspecified values
            defaults = DEFAULT_PREFERENCES.get(
                NotificationType(notification_type),
                {"in_app": True, "email": False}
            )
            pref = NotificationPreference(
                user_id=user_id,
                notification_type=notification_type,
                in_app_enabled=in_app_enabled if in_app_enabled is not None else defaults["in_app"],
                email_enabled=email_enabled if email_enabled is not None else defaults["email"]
            )
            self.db.add(pref)

        self.db.commit()
        self.db.refresh(pref)
        return pref

    def bulk_update_preferences(
        self, user_id: int, preferences: List[dict]
    ) -> List[NotificationPreference]:
        """Bulk update notification preferences."""
        result = []
        for pref_data in preferences:
            pref = self.update_preference(
                user_id=user_id,
                notification_type=pref_data["notification_type"],
                in_app_enabled=pref_data.get("in_app_enabled"),
                email_enabled=pref_data.get("email_enabled")
            )
            result.append(pref)
        return result

    def reset_to_defaults(self, user_id: int) -> None:
        """Delete all custom preferences, reverting to defaults."""
        self.db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user_id
        ).delete()
        self.db.commit()

    # ==================== High-Level Notification Methods ====================

    async def notify_task_assigned(
        self, task: Task, assigned_by: Optional[User] = None
    ) -> Optional[Notification]:
        """Notify user when a task is assigned to them."""
        if not task.assigned_to_id:
            return None

        # Don't notify if assigning to self
        if assigned_by and assigned_by.id == task.assigned_to_id:
            return None

        actor_name = f"{assigned_by.first_name} {assigned_by.last_name}" if assigned_by else "Someone"
        title = f"Task assigned: {task.title}"
        message = f"{actor_name} assigned you a task: {task.title}"

        notification = self.create_notification(
            user_id=task.assigned_to_id,
            notification_type=NotificationType.task_assigned.value,
            title=title,
            message=message,
            task_id=task.id,
            project_id=task.project_id,
            actor_id=assigned_by.id if assigned_by else None
        )

        # Send email
        await self.send_email_if_enabled(
            user_id=task.assigned_to_id,
            notification_type=NotificationType.task_assigned.value,
            subject=title,
            body=message
        )

        return notification

    async def notify_task_completed(self, task: Task, completed_by: User) -> Optional[Notification]:
        """Notify task creator when their task is marked complete."""
        if not task.created_by_id:
            return None

        # Don't notify if completing own task
        if completed_by.id == task.created_by_id:
            return None

        title = f"Task completed: {task.title}"
        message = f"{completed_by.first_name} {completed_by.last_name} completed the task: {task.title}"

        notification = self.create_notification(
            user_id=task.created_by_id,
            notification_type=NotificationType.task_completed.value,
            title=title,
            message=message,
            task_id=task.id,
            project_id=task.project_id,
            actor_id=completed_by.id
        )

        await self.send_email_if_enabled(
            user_id=task.created_by_id,
            notification_type=NotificationType.task_completed.value,
            subject=title,
            body=message
        )

        return notification

    async def notify_join_approved(self, join_request: JoinRequest) -> Optional[Notification]:
        """Notify user when their join request is approved."""
        project = self.db.query(Project).filter(Project.id == join_request.project_id).first()
        if not project:
            return None

        title = f"Join request approved: {project.title}"
        message = f"Your request to join '{project.title}' has been approved!"

        notification = self.create_notification(
            user_id=join_request.user_id,
            notification_type=NotificationType.join_approved.value,
            title=title,
            message=message,
            project_id=project.id
        )

        await self.send_email_if_enabled(
            user_id=join_request.user_id,
            notification_type=NotificationType.join_approved.value,
            subject=title,
            body=message
        )

        return notification

    async def notify_join_rejected(self, join_request: JoinRequest) -> Optional[Notification]:
        """Notify user when their join request is rejected."""
        project = self.db.query(Project).filter(Project.id == join_request.project_id).first()
        if not project:
            return None

        title = f"Join request declined: {project.title}"
        message = f"Your request to join '{project.title}' was not approved."

        notification = self.create_notification(
            user_id=join_request.user_id,
            notification_type=NotificationType.join_rejected.value,
            title=title,
            message=message,
            project_id=project.id
        )

        await self.send_email_if_enabled(
            user_id=join_request.user_id,
            notification_type=NotificationType.join_rejected.value,
            subject=title,
            body=message
        )

        return notification

    async def notify_added_to_project(
        self, user_id: int, project: Project, added_by: Optional[User] = None
    ) -> Optional[Notification]:
        """Notify user when they are added to a project."""
        # Don't notify if adding self
        if added_by and added_by.id == user_id:
            return None

        actor_name = f"{added_by.first_name} {added_by.last_name}" if added_by else "Someone"
        title = f"Added to project: {project.title}"
        message = f"{actor_name} added you to the project '{project.title}'"

        notification = self.create_notification(
            user_id=user_id,
            notification_type=NotificationType.added_to_project.value,
            title=title,
            message=message,
            project_id=project.id,
            actor_id=added_by.id if added_by else None
        )

        await self.send_email_if_enabled(
            user_id=user_id,
            notification_type=NotificationType.added_to_project.value,
            subject=title,
            body=message
        )

        return notification

    async def notify_removed_from_project(
        self, user_id: int, project: Project, removed_by: Optional[User] = None
    ) -> Optional[Notification]:
        """Notify user when they are removed from a project."""
        title = f"Removed from project: {project.title}"
        message = f"You have been removed from the project '{project.title}'"

        notification = self.create_notification(
            user_id=user_id,
            notification_type=NotificationType.removed_from_project.value,
            title=title,
            message=message,
            project_id=project.id,
            actor_id=removed_by.id if removed_by else None
        )

        await self.send_email_if_enabled(
            user_id=user_id,
            notification_type=NotificationType.removed_from_project.value,
            subject=title,
            body=message
        )

        return notification

    async def notify_project_status_changed(
        self, project: Project, changed_by: Optional[User] = None
    ) -> List[Notification]:
        """Notify all project members when project status changes."""
        from app.models.project_member import ProjectMember

        notifications = []
        members = self.db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id
        ).all()

        title = f"Project status updated: {project.title}"
        message = f"The project '{project.title}' status has been changed to {project.status}"

        for member in members:
            # Don't notify the person who made the change
            if changed_by and member.user_id == changed_by.id:
                continue

            notification = self.create_notification(
                user_id=member.user_id,
                notification_type=NotificationType.project_status_changed.value,
                title=title,
                message=message,
                project_id=project.id,
                actor_id=changed_by.id if changed_by else None
            )
            if notification:
                notifications.append(notification)

            await self.send_email_if_enabled(
                user_id=member.user_id,
                notification_type=NotificationType.project_status_changed.value,
                subject=title,
                body=message
            )

        return notifications

    async def notify_file_uploaded(
        self, project: Project, filename: str, uploaded_by: User
    ) -> List[Notification]:
        """Notify project members when a file is uploaded."""
        from app.models.project_member import ProjectMember

        notifications = []
        members = self.db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id
        ).all()

        title = f"New file in {project.title}"
        message = f"{uploaded_by.first_name} {uploaded_by.last_name} uploaded '{filename}'"

        for member in members:
            # Don't notify the uploader
            if member.user_id == uploaded_by.id:
                continue

            notification = self.create_notification(
                user_id=member.user_id,
                notification_type=NotificationType.file_uploaded.value,
                title=title,
                message=message,
                project_id=project.id,
                actor_id=uploaded_by.id
            )
            if notification:
                notifications.append(notification)

            await self.send_email_if_enabled(
                user_id=member.user_id,
                notification_type=NotificationType.file_uploaded.value,
                subject=title,
                body=message
            )

        return notifications

    def notify_meeting_approaching(
        self, user_id: int, project: Project, meeting_date: str, days_until: int
    ) -> Optional[Notification]:
        """Create in-app notification for upcoming meeting (email sent separately by cron).

        Args:
            user_id: The user to notify
            project: The project with the meeting
            meeting_date: Formatted meeting date string
            days_until: Number of days until the meeting
        """
        if days_until == 0:
            time_text = "today"
        elif days_until == 1:
            time_text = "tomorrow"
        else:
            time_text = f"in {days_until} days"

        title = f"Meeting {time_text}: {project.title}"
        message = f"You have a meeting for '{project.title}' scheduled for {meeting_date}"

        return self.create_notification(
            user_id=user_id,
            notification_type=NotificationType.meeting_approaching.value,
            title=title,
            message=message,
            project_id=project.id
        )

    def notify_deadline_approaching(
        self, user_id: int, project: Project, deadline_date: str, days_until: int
    ) -> Optional[Notification]:
        """Create in-app notification for upcoming deadline (email sent separately by cron).

        Args:
            user_id: The user to notify
            project: The project with the deadline
            deadline_date: Formatted deadline date string
            days_until: Number of days until the deadline
        """
        if days_until == 0:
            time_text = "today"
            title = f"Deadline TODAY: {project.title}"
        elif days_until == 1:
            time_text = "tomorrow"
            title = f"Deadline tomorrow: {project.title}"
        else:
            time_text = f"in {days_until} days"
            title = f"Deadline approaching: {project.title}"

        message = f"The project '{project.title}' has a deadline on {deadline_date} ({time_text})"

        return self.create_notification(
            user_id=user_id,
            notification_type=NotificationType.deadline_approaching.value,
            title=title,
            message=message,
            project_id=project.id
        )
