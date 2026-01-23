"""Repository layer for EduResearch Project Manager.

This module provides a repository pattern implementation for database operations,
offering a clean abstraction over SQLAlchemy models.
"""

from app.repositories.base import BaseRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.file_repository import FileRepository
from app.repositories.institution_repository import InstitutionRepository
from app.repositories.join_request_repository import JoinRequestRepository
from app.repositories.project_member_repository import ProjectMemberRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.settings_repository import (
    EmailSettingsRepository,
    SystemSettingsRepository,
)
from app.repositories.task_repository import TaskRepository
from app.repositories.user_repository import UserRepository

__all__ = [
    # Base
    "BaseRepository",
    # Entity repositories
    "UserRepository",
    "InstitutionRepository",
    "DepartmentRepository",
    "ProjectRepository",
    "ProjectMemberRepository",
    "TaskRepository",
    "JoinRequestRepository",
    "FileRepository",
    # Settings repositories
    "EmailSettingsRepository",
    "SystemSettingsRepository",
]
