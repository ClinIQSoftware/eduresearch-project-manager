"""IRB (Institutional Review Board) schemas for EduResearch Project Manager."""

from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Literal type aliases
# ---------------------------------------------------------------------------

BoardType = Literal["irb", "research_council"]
BoardMemberRole = Literal["coordinator", "main_reviewer", "associate_reviewer", "statistician"]
SubmissionType = Literal["standard", "exempt"]
SubmissionStatus = Literal[
    "draft",
    "submitted",
    "in_triage",
    "assigned_to_main",
    "under_review",
    "decision_made",
    "accepted",
    "revision_requested",
    "declined",
]
RevisionType = Literal["minor", "major"]
QuestionType = Literal["text", "textarea", "select", "radio", "checkbox", "date", "number", "file_upload"]
SubmissionTypeFilter = Literal["standard", "exempt", "both"]
ConditionOperator = Literal["equals", "not_equals", "contains", "is_empty", "is_not_empty"]
Recommendation = Literal["accept", "minor_revise", "major_revise", "decline"]
DecisionType = Literal["accept", "minor_revise", "major_revise", "decline"]
FileType = Literal["protocol", "consent_form", "supporting_doc"]
AiProvider = Literal["anthropic", "openai", "custom"]


# ---------------------------------------------------------------------------
# Board schemas
# ---------------------------------------------------------------------------

class IrbBoardCreate(BaseModel):
    """Schema for creating an IRB board."""

    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    board_type: BoardType
    institution_id: Optional[int] = None


class IrbBoardUpdate(BaseModel):
    """Schema for updating an IRB board — all fields optional."""

    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class IrbBoardResponse(BaseModel):
    """Schema for IRB board response."""

    id: UUID
    name: str
    description: Optional[str] = None
    board_type: BoardType
    institution_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IrbBoardDetail(IrbBoardResponse):
    """Detailed board response with aggregate counts."""

    members_count: int
    submissions_count: int


# ---------------------------------------------------------------------------
# Board member schemas
# ---------------------------------------------------------------------------

class IrbBoardMemberCreate(BaseModel):
    """Schema for adding a member to a board."""

    user_id: int
    role: BoardMemberRole


class IrbBoardMemberResponse(BaseModel):
    """Schema for board member response."""

    id: int
    board_id: UUID
    user_id: int
    role: BoardMemberRole
    is_active: bool
    assigned_at: datetime
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Question section schemas
# ---------------------------------------------------------------------------

class IrbQuestionSectionCreate(BaseModel):
    """Schema for creating a question section."""

    name: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=100)
    description: Optional[str] = None
    order: int = 0


class IrbQuestionSectionUpdate(BaseModel):
    """Schema for updating a question section — all fields optional."""

    name: Optional[str] = Field(None, max_length=255)
    slug: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    order: Optional[int] = None


class IrbQuestionSectionResponse(BaseModel):
    """Schema for question section response."""

    id: int
    board_id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    order: int

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Question condition schemas (must precede Question schemas)
# ---------------------------------------------------------------------------

class IrbQuestionConditionCreate(BaseModel):
    """Schema for creating a question condition."""

    depends_on_question_id: int
    operator: ConditionOperator
    value: str = Field(..., max_length=500)


class IrbQuestionConditionResponse(BaseModel):
    """Schema for question condition response."""

    id: int
    question_id: int
    depends_on_question_id: int
    operator: ConditionOperator
    value: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Question schemas
# ---------------------------------------------------------------------------

class IrbQuestionCreate(BaseModel):
    """Schema for creating a question."""

    section_id: int
    text: str = Field(..., max_length=1000)
    description: Optional[str] = None
    question_type: QuestionType
    options: Optional[list] = None
    required: bool = False
    order: int = 0
    submission_type: SubmissionTypeFilter = "both"
    conditions: Optional[List[IrbQuestionConditionCreate]] = None


class IrbQuestionUpdate(BaseModel):
    """Schema for updating a question — all fields optional."""

    text: Optional[str] = Field(None, max_length=1000)
    description: Optional[str] = None
    question_type: Optional[QuestionType] = None
    options: Optional[list] = None
    required: Optional[bool] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None
    submission_type: Optional[SubmissionTypeFilter] = None
    section_id: Optional[int] = None
    conditions: Optional[List[IrbQuestionConditionCreate]] = None


class IrbQuestionResponse(BaseModel):
    """Schema for question response."""

    id: int
    board_id: UUID
    section_id: int
    text: str
    description: Optional[str] = None
    question_type: QuestionType
    options: Optional[list] = None
    required: bool
    order: int
    is_active: bool
    submission_type: SubmissionTypeFilter
    created_at: datetime
    conditions: List[IrbQuestionConditionResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Submission file schemas (must precede SubmissionDetail)
# ---------------------------------------------------------------------------

class IrbSubmissionFileResponse(BaseModel):
    """Schema for submission file response."""

    id: int
    submission_id: UUID
    file_name: str
    file_url: str
    file_type: FileType
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Submission response schemas (must precede SubmissionDetail)
# ---------------------------------------------------------------------------

class IrbSubmissionResponseCreate(BaseModel):
    """Schema for creating a submission response (answer to a question)."""

    question_id: int
    answer: Optional[str] = None


class IrbSubmissionResponseUpdate(BaseModel):
    """Schema for updating a submission response."""

    answer: Optional[str] = None
    user_confirmed: bool = False


class IrbSubmissionResponseResponse(BaseModel):
    """Schema for submission response response."""

    id: int
    submission_id: UUID
    question_id: int
    answer: Optional[str] = None
    ai_prefilled: Optional[bool] = None
    user_confirmed: Optional[bool] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Review schemas (must precede SubmissionDetail)
# ---------------------------------------------------------------------------

class IrbReviewCreate(BaseModel):
    """Schema for creating a review."""

    recommendation: Recommendation
    comments: Optional[str] = None
    feedback_to_submitter: Optional[str] = None


class IrbReviewResponse(BaseModel):
    """Schema for review response."""

    id: UUID
    submission_id: UUID
    reviewer_id: int
    role: BoardMemberRole
    recommendation: Optional[Recommendation] = None
    comments: Optional[str] = None
    feedback_to_submitter: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Decision schemas (must precede SubmissionDetail)
# ---------------------------------------------------------------------------

class IrbDecisionCreate(BaseModel):
    """Schema for creating a decision."""

    decision: DecisionType
    rationale: Optional[str] = None
    letter: Optional[str] = None
    conditions: Optional[str] = None


class IrbDecisionResponse(BaseModel):
    """Schema for decision response."""

    id: UUID
    submission_id: UUID
    decided_by_id: int
    decision: DecisionType
    rationale: Optional[str] = None
    letter: Optional[str] = None
    conditions: Optional[str] = None
    decided_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# History schemas (must precede SubmissionDetail)
# ---------------------------------------------------------------------------

class IrbSubmissionHistoryResponse(BaseModel):
    """Schema for submission history response."""

    id: int
    submission_id: UUID
    from_status: Optional[SubmissionStatus] = None
    to_status: SubmissionStatus
    changed_by_id: int
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Submission schemas
# ---------------------------------------------------------------------------

class IrbSubmissionCreate(BaseModel):
    """Schema for creating a submission."""

    board_id: UUID
    project_id: int
    submission_type: SubmissionType


class IrbSubmissionUpdate(BaseModel):
    """Schema for updating a submission — all fields optional."""

    submission_type: Optional[SubmissionType] = None
    protocol_file_url: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_summary_approved: Optional[bool] = None


class IrbSubmissionResponse(BaseModel):
    """Schema for submission response."""

    id: UUID
    board_id: UUID
    project_id: int
    submitted_by_id: int
    submission_type: SubmissionType
    status: SubmissionStatus
    revision_type: Optional[RevisionType] = None
    protocol_file_url: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_summary_approved: Optional[bool] = None
    escalated_from_id: Optional[UUID] = None
    version: int
    main_reviewer_id: Optional[int] = None
    submitted_at: Optional[datetime] = None
    decided_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IrbSubmissionDetail(IrbSubmissionResponse):
    """Detailed submission response with related entities."""

    files: List[IrbSubmissionFileResponse] = []
    responses: List[IrbSubmissionResponseResponse] = []
    reviews: List[IrbReviewResponse] = []
    decision: Optional[IrbDecisionResponse] = None
    history: List[IrbSubmissionHistoryResponse] = []


# ---------------------------------------------------------------------------
# AI config schemas
# ---------------------------------------------------------------------------

class IrbAiConfigCreate(BaseModel):
    """Schema for creating an AI configuration."""

    provider: AiProvider
    api_key: str
    model_name: str
    custom_endpoint: Optional[str] = None
    max_tokens: int = 4096


class IrbAiConfigUpdate(BaseModel):
    """Schema for updating an AI configuration — all fields optional."""

    provider: Optional[AiProvider] = None
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    custom_endpoint: Optional[str] = None
    max_tokens: Optional[int] = None
    is_active: Optional[bool] = None


class IrbAiConfigResponse(BaseModel):
    """Schema for AI configuration response. NOTE: api_key is never exposed."""

    id: int
    provider: AiProvider
    model_name: str
    custom_endpoint: Optional[str] = None
    max_tokens: int
    is_active: bool
    updated_at: Optional[datetime] = None
    api_key_set: bool = True

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Workflow action schemas
# ---------------------------------------------------------------------------

class IrbTriageAction(BaseModel):
    """Schema for triage action (accept or return a submission)."""

    action: Literal["accept", "return"]
    note: Optional[str] = None


class IrbAssignMainReviewer(BaseModel):
    """Schema for assigning a main reviewer."""

    reviewer_id: int


class IrbAssignReviewers(BaseModel):
    """Schema for assigning multiple reviewers."""

    reviewer_ids: List[int]


# ---------------------------------------------------------------------------
# Dashboard schema
# ---------------------------------------------------------------------------

class IrbDashboardResponse(BaseModel):
    """Schema for IRB dashboard response."""

    my_submissions: List[IrbSubmissionResponse] = []
    my_pending_reviews: List[IrbSubmissionResponse] = []
    board_queue: List[IrbSubmissionResponse] = []
