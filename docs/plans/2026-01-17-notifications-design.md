# In-App Notifications System Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an in-app notification system that keeps users informed about project activity without requiring them to constantly check for updates.

**Problem Solved:** Users miss important updates because they don't receive timely alerts about task assignments, project changes, or approaching deadlines.

**Architecture:** Event-driven notifications with user-configurable preferences per notification type.

**Tech Stack:** Python 3.x, FastAPI, SQLAlchemy, React, TypeScript, React Query

---

## Data Model

### notifications table

| Column | Type | Notes |
|--------|------|-------|
| id | Integer | Primary key |
| user_id | Integer | FK to users.id, indexed |
| type | String(50) | Notification type (see types below) |
| title | String(200) | Short notification title |
| message | Text | Full notification message |
| project_id | Integer | FK to projects.id, nullable |
| task_id | Integer | FK to tasks.id, nullable |
| actor_id | Integer | FK to users.id (who triggered it), nullable |
| is_read | Boolean | Default false, indexed |
| created_at | DateTime | Auto-set, indexed |

**Indexes:**
- `(user_id, is_read, created_at DESC)` - for fetching unread notifications
- `(user_id, created_at DESC)` - for notification history

### notification_preferences table

| Column | Type | Notes |
|--------|------|-------|
| id | Integer | Primary key |
| user_id | Integer | FK to users.id, unique constraint with type |
| notification_type | String(50) | Which notification type |
| in_app_enabled | Boolean | Default true |
| email_enabled | Boolean | Default true |

**Unique constraint:** `(user_id, notification_type)`

---

## Notification Types

### Task Notifications

| Type | Trigger | Default |
|------|---------|---------|
| `task_assigned` | Task assigned to you | in-app + email |
| `task_due_soon` | Task due within 24 hours | in-app + email |
| `task_completed` | Task you created is marked complete | in-app only |

### Membership Notifications

| Type | Trigger | Default |
|------|---------|---------|
| `join_approved` | Your join request approved | in-app + email |
| `join_rejected` | Your join request rejected | in-app + email |
| `added_to_project` | Added to project by lead | in-app + email |
| `removed_from_project` | Removed from project | in-app + email |

### Project Notifications

| Type | Trigger | Default |
|------|---------|---------|
| `project_status_changed` | Project status updated | in-app only |
| `file_uploaded` | New file uploaded to your project | in-app only |
| `deadline_approaching` | Project deadline within 7 days | in-app + email |
| `meeting_approaching` | Project meeting within 24 hours | in-app + email |

---

## Backend API

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | List notifications (paginated, filterable) |
| GET | `/api/notifications/unread-count` | Get count of unread notifications |
| PUT | `/api/notifications/{id}/read` | Mark single notification as read |
| PUT | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/{id}` | Delete single notification |
| GET | `/api/notifications/preferences` | Get user's notification preferences |
| PUT | `/api/notifications/preferences` | Update notification preferences |

### NotificationService

Located at `backend/app/services/notification_service.py`:

```python
class NotificationService:
    def create_notification(
        self,
        user_id: int,
        type: str,
        title: str,
        message: str,
        project_id: int = None,
        task_id: int = None,
        actor_id: int = None
    ) -> Notification:
        """Create notification if user has in-app enabled for this type."""

    def send_email_if_enabled(
        self,
        user_id: int,
        type: str,
        ...
    ):
        """Check preferences and send email if enabled."""

    def notify_task_assigned(self, task: Task, assigned_by: User):
        """High-level method for task assignment notification."""

    def notify_join_request_approved(self, join_request: JoinRequest):
        """High-level method for join request approval notification."""

    # ... similar methods for each notification type
```

### Integration Points

Notifications are triggered from existing service methods:

- `TaskService.assign_task()` → calls `notify_task_assigned()`
- `JoinRequestService.approve()` → calls `notify_join_request_approved()`
- `ProjectService.add_member()` → calls `notify_added_to_project()`
- `ProjectService.update_status()` → calls `notify_project_status_changed()`
- `FileService.upload()` → calls `notify_file_uploaded()`

---

## Frontend Components

### Bell Icon (Header)

Location: Header component (all pages)

Behavior:
- Shows unread count badge (red circle with number)
- Click opens dropdown with recent 5 notifications
- "View all" link to /notifications page
- Click notification marks as read and navigates to related item

### Notifications Page

Location: `/notifications`

Features:
- Full list of all notifications (paginated)
- Filter by: All / Unread / Read
- Filter by type category (Tasks, Membership, Projects)
- "Mark all as read" button
- Individual delete buttons
- Click notification navigates to related item

### Dashboard Widget

Location: Dashboard page, right sidebar or dedicated section

Features:
- Shows 5 most recent unread notifications
- "View all" link to /notifications page
- Compact card format

### Settings Section

Location: Settings page, new "Notifications" tab

Features:
- Table of all notification types
- Toggle for in-app enabled (per type)
- Toggle for email enabled (per type)
- "Reset to defaults" button

---

## Implementation Tasks

### Phase 1: Backend Foundation

1. Create migration for `notifications` and `notification_preferences` tables
2. Create `Notification` and `NotificationPreference` SQLAlchemy models
3. Create Pydantic schemas for notifications
4. Create `NotificationRepository` with CRUD operations
5. Create `NotificationService` with core methods

### Phase 2: Backend API

6. Create `/api/notifications` routes (all 7 endpoints)
7. Add notification triggers to `TaskService`
8. Add notification triggers to `JoinRequestService`
9. Add notification triggers to `ProjectService`
10. Add notification triggers to `FileService`

### Phase 3: Frontend Foundation

11. Create notification API client functions
12. Create React Query hooks for notifications
13. Create notification type constants and labels

### Phase 4: Frontend Components

14. Create `NotificationBell` component for header
15. Create `NotificationsPage` component
16. Create `NotificationsDashboardWidget` component
17. Add notifications section to Settings page

### Phase 5: Integration & Polish

18. Integrate `NotificationBell` into Header
19. Add dashboard widget to Dashboard page
20. Add route for /notifications page
21. Test all notification triggers end-to-end

---

## Testing Notes

### Backend Tests

- Test notification creation respects user preferences
- Test email sending respects user preferences
- Test notification CRUD operations
- Test preference updates

### Frontend Tests

- Test bell icon shows correct unread count
- Test marking notifications as read updates UI
- Test preference toggles persist correctly

### End-to-End Tests

- Assign task → recipient sees notification
- Approve join request → requester sees notification
- Upload file → project members see notification
- Update preferences → future notifications respect settings

---

## Summary of New Files

| File | Purpose |
|------|---------|
| `backend/alembic/versions/XXX_add_notifications.py` | Migration |
| `backend/app/models/notification.py` | SQLAlchemy models |
| `backend/app/schemas/notification.py` | Pydantic schemas |
| `backend/app/repositories/notification_repository.py` | Data access |
| `backend/app/services/notification_service.py` | Business logic |
| `backend/app/api/routes/notifications.py` | API endpoints |
| `frontend/src/api/notifications.ts` | API client |
| `frontend/src/hooks/useNotifications.ts` | React Query hooks |
| `frontend/src/components/notifications/NotificationBell.tsx` | Header bell |
| `frontend/src/components/notifications/NotificationsDashboardWidget.tsx` | Dashboard widget |
| `frontend/src/pages/Notifications.tsx` | Full notifications page |
| `frontend/src/constants/notificationConstants.ts` | Types and labels |
