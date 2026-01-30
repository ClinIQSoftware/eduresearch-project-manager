"""Pydantic schemas for EduResearch Project Manager."""

# Authentication schemas
from app.schemas.auth import (
    LoginRequest,
    PasswordChange,
    Token,
    TokenData,
    TokenResponse,
)

# User schemas
from app.schemas.user import (
    AuthProvider,
    OnboardingRequest,
    PendingUserResponse,
    UserBase,
    UserBrief,
    UserCreate,
    UserCreateAdmin,
    UserCreateOAuth,
    UserResponse,
    UserUpdate,
    UserUpdateAdmin,
)

# Institution schemas
from app.schemas.institution import (
    AddMemberRequest,
    InstitutionBase,
    InstitutionBrief,
    InstitutionCreate,
    InstitutionResponse,
    InstitutionUpdate,
    InstitutionWithMembers,
)

# Department schemas
from app.schemas.department import (
    DepartmentBase,
    DepartmentBrief,
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
    DepartmentWithMembers,
)

# Project schemas
from app.schemas.project import (
    AddProjectMemberRequest,
    MemberRole,
    ProjectBase,
    ProjectClassification,
    ProjectCreate,
    ProjectDetail,
    ProjectMemberInfo,
    ProjectResponse,
    ProjectStatus,
    ProjectUpdate,
    ProjectWithLead,
)

# Project member schemas
from app.schemas.project_member import (
    ProjectMemberCreate,
    ProjectMemberResponse,
    ProjectMemberUpdate,
)

# Task schemas
from app.schemas.task import (
    TaskBase,
    TaskCreate,
    TaskPriority,
    TaskResponse,
    TaskStatus,
    TaskUpdate,
    TaskWithAssignee,
)

# Join request schemas
from app.schemas.join_request import (
    JoinRequestCreate,
    JoinRequestDetail,
    JoinRequestResponse,
    JoinRequestResponseAction,
    JoinRequestWithProject,
    JoinRequestWithUser,
    RequestStatus,
    RespondToJoinRequest,
)

# File schemas
from app.schemas.file import (
    FileResponse,
    FileUploadResponse,
    FileWithUploader,
)

# Settings schemas
from app.schemas.settings import (
    ApproveUserRequest,
    BulkUploadResult,
    EmailSettingsBase,
    EmailSettingsCreate,
    EmailSettingsResponse,
    EmailSettingsUpdate,
    RegistrationApprovalMode,
    RejectUserRequest,
    SystemSettingsBase,
    SystemSettingsResponse,
    SystemSettingsUpdate,
    TestEmailRequest,
)

# Time entry schemas (kept for backwards compatibility)
from app.schemas.time_entry import (
    TimeEntryCreate,
    TimeEntryResponse,
    TimeEntryUpdate,
)

# Email template schemas (kept for backwards compatibility)
from app.schemas.email_template import (
    EmailTemplateBase,
    EmailTemplateCreate,
    EmailTemplateResponse,
    EmailTemplateUpdate,
)

# Keyword schemas (kept for backwards compatibility)
from app.schemas.keyword import (
    AlertPreferenceResponse,
    AlertPreferenceUpdate,
    KeywordBase,
    KeywordBulkUpdate,
    KeywordCreate,
    KeywordListResponse,
    KeywordResponse,
    MatchedProjectResponse,
    ProjectSearchParams,
    SendAlertsRequest,
)

# Enterprise schemas
from app.schemas.enterprise import (
    EnterpriseBase,
    EnterpriseBrandingResponse,
    EnterpriseBrandingUpdate,
    EnterpriseConfigResponse,
    EnterpriseCreate,
    EnterpriseListResponse,
    EnterpriseOAuthUpdate,
    EnterpriseResponse,
    EnterpriseSmtpUpdate,
    EnterpriseUpdate,
)

# Platform Admin schemas
from app.schemas.platform_admin import (
    EnterpriseCreate as PlatformEnterpriseCreate,
    EnterpriseDetailResponse,
    EnterpriseListItem,
    EnterpriseUpdate as PlatformEnterpriseUpdate,
    PlatformAdminBase,
    PlatformAdminCreate,
    PlatformAdminLogin,
    PlatformAdminResponse,
    PlatformAdminUpdate,
    PlatformStatsResponse,
)

# Billing schemas
from app.schemas.billing import (
    CreateCheckoutSessionRequest,
    CheckoutSessionResponse,
    PortalSessionResponse,
    SubscriptionStatus,
)

# Invite Code schemas
from app.schemas.invite_code import (
    InviteCodeCreate,
    InviteCodeResponse,
    InviteCodeValidation,
)

# IRB schemas
from app.schemas.irb import (
    AiProvider,
    BoardMemberRole,
    BoardType,
    ConditionOperator,
    DecisionType,
    FileType,
    IrbAiConfigCreate,
    IrbAiConfigResponse,
    IrbAiConfigUpdate,
    IrbAssignMainReviewer,
    IrbAssignReviewers,
    IrbBoardCreate,
    IrbBoardDetail,
    IrbBoardMemberCreate,
    IrbBoardMemberResponse,
    IrbBoardResponse,
    IrbBoardUpdate,
    IrbDashboardResponse,
    IrbDecisionCreate,
    IrbDecisionResponse,
    IrbQuestionConditionCreate,
    IrbQuestionConditionResponse,
    IrbQuestionCreate,
    IrbQuestionResponse,
    IrbQuestionSectionCreate,
    IrbQuestionSectionResponse,
    IrbQuestionSectionUpdate,
    IrbQuestionUpdate,
    IrbReviewCreate,
    IrbReviewResponse,
    IrbSubmissionCreate,
    IrbSubmissionDetail,
    IrbSubmissionFileResponse,
    IrbSubmissionHistoryResponse,
    IrbSubmissionResponse,
    IrbSubmissionResponseCreate,
    IrbSubmissionResponseResponse,
    IrbSubmissionResponseUpdate,
    IrbSubmissionUpdate,
    IrbTriageAction,
    QuestionType,
    Recommendation,
    RevisionType,
    SubmissionStatus,
    SubmissionType,
    SubmissionTypeFilter,
)


__all__ = [
    # Auth
    "LoginRequest",
    "PasswordChange",
    "Token",
    "TokenData",
    "TokenResponse",
    # User
    "AuthProvider",
    "OnboardingRequest",
    "PendingUserResponse",
    "UserBase",
    "UserBrief",
    "UserCreate",
    "UserCreateAdmin",
    "UserCreateOAuth",
    "UserResponse",
    "UserUpdate",
    "UserUpdateAdmin",
    # Institution
    "AddMemberRequest",
    "InstitutionBase",
    "InstitutionBrief",
    "InstitutionCreate",
    "InstitutionResponse",
    "InstitutionUpdate",
    "InstitutionWithMembers",
    # Department
    "DepartmentBase",
    "DepartmentBrief",
    "DepartmentCreate",
    "DepartmentResponse",
    "DepartmentUpdate",
    "DepartmentWithMembers",
    # Project
    "AddProjectMemberRequest",
    "MemberRole",
    "ProjectBase",
    "ProjectClassification",
    "ProjectCreate",
    "ProjectDetail",
    "ProjectMemberInfo",
    "ProjectResponse",
    "ProjectStatus",
    "ProjectUpdate",
    "ProjectWithLead",
    # Project Member
    "ProjectMemberCreate",
    "ProjectMemberResponse",
    "ProjectMemberUpdate",
    # Task
    "TaskBase",
    "TaskCreate",
    "TaskPriority",
    "TaskResponse",
    "TaskStatus",
    "TaskUpdate",
    "TaskWithAssignee",
    # Join Request
    "JoinRequestCreate",
    "JoinRequestDetail",
    "JoinRequestResponse",
    "JoinRequestResponseAction",
    "JoinRequestWithProject",
    "JoinRequestWithUser",
    "RequestStatus",
    "RespondToJoinRequest",
    # File
    "FileResponse",
    "FileUploadResponse",
    "FileWithUploader",
    # Settings
    "ApproveUserRequest",
    "BulkUploadResult",
    "EmailSettingsBase",
    "EmailSettingsCreate",
    "EmailSettingsResponse",
    "EmailSettingsUpdate",
    "RegistrationApprovalMode",
    "RejectUserRequest",
    "SystemSettingsBase",
    "SystemSettingsResponse",
    "SystemSettingsUpdate",
    "TestEmailRequest",
    # Time Entry
    "TimeEntryCreate",
    "TimeEntryResponse",
    "TimeEntryUpdate",
    # Email Template
    "EmailTemplateBase",
    "EmailTemplateCreate",
    "EmailTemplateResponse",
    "EmailTemplateUpdate",
    # Keyword
    "AlertPreferenceResponse",
    "AlertPreferenceUpdate",
    "KeywordBase",
    "KeywordBulkUpdate",
    "KeywordCreate",
    "KeywordListResponse",
    "KeywordResponse",
    "MatchedProjectResponse",
    "ProjectSearchParams",
    "SendAlertsRequest",
    # Enterprise
    "EnterpriseBase",
    "EnterpriseBrandingResponse",
    "EnterpriseBrandingUpdate",
    "EnterpriseConfigResponse",
    "EnterpriseCreate",
    "EnterpriseListResponse",
    "EnterpriseOAuthUpdate",
    "EnterpriseResponse",
    "EnterpriseSmtpUpdate",
    "EnterpriseUpdate",
    # Platform Admin
    "EnterpriseDetailResponse",
    "EnterpriseListItem",
    "PlatformAdminBase",
    "PlatformAdminCreate",
    "PlatformAdminLogin",
    "PlatformAdminResponse",
    "PlatformAdminUpdate",
    "PlatformEnterpriseCreate",
    "PlatformEnterpriseUpdate",
    "PlatformStatsResponse",
    # Billing
    "CreateCheckoutSessionRequest",
    "CheckoutSessionResponse",
    "PortalSessionResponse",
    "SubscriptionStatus",
    # Invite Code
    "InviteCodeCreate",
    "InviteCodeResponse",
    "InviteCodeValidation",
    # IRB
    "AiProvider",
    "BoardMemberRole",
    "BoardType",
    "ConditionOperator",
    "DecisionType",
    "FileType",
    "IrbAiConfigCreate",
    "IrbAiConfigResponse",
    "IrbAiConfigUpdate",
    "IrbAssignMainReviewer",
    "IrbAssignReviewers",
    "IrbBoardCreate",
    "IrbBoardDetail",
    "IrbBoardMemberCreate",
    "IrbBoardMemberResponse",
    "IrbBoardResponse",
    "IrbBoardUpdate",
    "IrbDashboardResponse",
    "IrbDecisionCreate",
    "IrbDecisionResponse",
    "IrbQuestionConditionCreate",
    "IrbQuestionConditionResponse",
    "IrbQuestionCreate",
    "IrbQuestionResponse",
    "IrbQuestionSectionCreate",
    "IrbQuestionSectionResponse",
    "IrbQuestionSectionUpdate",
    "IrbQuestionUpdate",
    "IrbReviewCreate",
    "IrbReviewResponse",
    "IrbSubmissionCreate",
    "IrbSubmissionDetail",
    "IrbSubmissionFileResponse",
    "IrbSubmissionHistoryResponse",
    "IrbSubmissionResponse",
    "IrbSubmissionResponseCreate",
    "IrbSubmissionResponseResponse",
    "IrbSubmissionResponseUpdate",
    "IrbSubmissionUpdate",
    "IrbTriageAction",
    "QuestionType",
    "Recommendation",
    "RevisionType",
    "SubmissionStatus",
    "SubmissionType",
    "SubmissionTypeFilter",
]
