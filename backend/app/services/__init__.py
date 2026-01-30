"""Service layer for EduResearch Project Manager.

This module provides service classes that contain business logic,
orchestrating repositories and implementing business rules.
"""

from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.services.project_service import ProjectService
from app.services.task_service import TaskService
from app.services.join_request_service import JoinRequestService
from app.services.file_service import FileService
from app.services.email_service import EmailService
from app.services.institution_service import InstitutionService
from app.services.department_service import DepartmentService
from app.services.settings_service import SettingsService
from app.services.billing_service import BillingService

# IRB services
from app.services.irb_board_service import IrbBoardService
from app.services.irb_question_service import IrbQuestionService
from app.services.irb_submission_service import IrbSubmissionService
from app.services.irb_ai_service import IrbAiService

__all__ = [
    "AuthService",
    "UserService",
    "ProjectService",
    "TaskService",
    "JoinRequestService",
    "FileService",
    "EmailService",
    "InstitutionService",
    "DepartmentService",
    "SettingsService",
    "BillingService",
    # IRB
    "IrbBoardService",
    "IrbQuestionService",
    "IrbSubmissionService",
    "IrbAiService",
]
