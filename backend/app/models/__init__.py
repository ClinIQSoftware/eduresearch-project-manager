"""SQLAlchemy models for EduResearch Project Manager."""

from app.models.enterprise import Enterprise
from app.models.enterprise_config import EnterpriseConfig
from app.models.institution import Institution
from app.models.institution_admin import institution_admins
from app.models.department import Department
from app.models.user import User
from app.models.platform_admin import PlatformAdmin
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.time_entry import TimeEntry
from app.models.join_request import JoinRequest
from app.models.project_file import ProjectFile
from app.models.email_settings import EmailSettings
from app.models.system_settings import SystemSettings
from app.models.user_keyword import UserKeyword
from app.models.user_alert_preference import UserAlertPreference

# Keep organization_admins import for backward compatibility with authorization.py
from app.models.organization import organization_admins

__all__ = [
    # Core entities
    "Enterprise",
    "EnterpriseConfig",
    "Institution",
    "Department",
    "User",
    "PlatformAdmin",
    # Projects
    "Project",
    "ProjectMember",
    "Task",
    "TimeEntry",
    "JoinRequest",
    "ProjectFile",
    # Settings
    "EmailSettings",
    "SystemSettings",
    # Keywords
    "UserKeyword",
    "UserAlertPreference",
    # Association tables
    "institution_admins",
    "organization_admins",  # Backward compatibility alias
]
