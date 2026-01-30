# IRB Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a full IRB (Institutional Review Board) module with board management, structured submission workflow, configurable questions with conditional logic, independent reviewer assessments, AI-assisted summarization/pre-fill, and plan-gated access.

**Architecture:** Backend uses existing FastAPI + SQLAlchemy patterns (repository → service → route). All IRB tables include `enterprise_id` with RLS policies. Frontend adds new `/irb/*` routes with sidebar navigation and admin tabs. AI features use a pluggable LLM provider pattern.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL (RLS), Pydantic v2, React + TypeScript, Tailwind CSS, Axios, PyPDF2, python-docx, httpx (for LLM API calls)

**Design Doc:** `docs/plans/2026-01-30-irb-module-design.md`

---

## Phase 1: Database Migration & Models

### Task 1.1: Create Alembic migration for all IRB tables

**Files:**
- Create: `backend/alembic/versions/027_add_irb_module_tables.py`

**Step 1: Write the migration**

```python
"""Add IRB module tables.

Revision ID: 027
Revises: 026
Create Date: 2026-01-30
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "027"
down_revision: Union[str, None] = "026"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# All IRB tables that need RLS
IRB_TABLES = [
    "irb_boards",
    "irb_board_members",
    "irb_submissions",
    "irb_submission_files",
    "irb_question_sections",
    "irb_questions",
    "irb_question_conditions",
    "irb_submission_responses",
    "irb_reviews",
    "irb_decisions",
    "irb_submission_history",
    "irb_ai_configs",
]


def upgrade() -> None:
    # --- irb_boards ---
    op.create_table(
        "irb_boards",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("enterprise_id", UUID(as_uuid=True), sa.ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("institution_id", sa.Integer, sa.ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("board_type", sa.String(20), nullable=False),  # 'irb' or 'research_council'
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )

    # --- irb_board_members ---
    op.create_table(
        "irb_board_members",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("board_id", UUID(as_uuid=True), sa.ForeignKey("irb_boards.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("enterprise_id", UUID(as_uuid=True), sa.ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("role", sa.String(30), nullable=False),  # coordinator, main_reviewer, associate_reviewer, statistician
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("assigned_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("board_id", "user_id", "role", name="uq_board_member_role"),
    )

    # --- irb_submissions ---
    op.create_table(
        "irb_submissions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("enterprise_id", UUID(as_uuid=True), sa.ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("board_id", UUID(as_uuid=True), sa.ForeignKey("irb_boards.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("project_id", sa.Integer, sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("submitted_by_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("submission_type", sa.String(20), nullable=False),  # 'standard' or 'exempt'
        sa.Column("status", sa.String(30), nullable=False, default="draft"),
        sa.Column("revision_type", sa.String(20), nullable=True),  # 'minor' or 'major'
        sa.Column("protocol_file_url", sa.String(500), nullable=True),
        sa.Column("ai_summary", sa.Text, nullable=True),
        sa.Column("ai_summary_approved", sa.Boolean, default=False, nullable=False),
        sa.Column("escalated_from_id", UUID(as_uuid=True), sa.ForeignKey("irb_submissions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("version", sa.Integer, default=1, nullable=False),
        sa.Column("main_reviewer_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("submitted_at", sa.DateTime, nullable=True),
        sa.Column("decided_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )

    # --- irb_submission_files ---
    op.create_table(
        "irb_submission_files",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("submission_id", UUID(as_uuid=True), sa.ForeignKey("irb_submissions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("enterprise_id", UUID(as_uuid=True), sa.ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("file_type", sa.String(30), nullable=False),  # protocol, consent_form, supporting_doc
        sa.Column("uploaded_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )

    # --- irb_question_sections ---
    op.create_table(
        "irb_question_sections",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("board_id", UUID(as_uuid=True), sa.ForeignKey("irb_boards.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("enterprise_id", UUID(as_uuid=True), sa.ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("order", sa.Integer, nullable=False, default=0),
    )

    # --- irb_questions ---
    op.create_table(
        "irb_questions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("board_id", UUID(as_uuid=True), sa.ForeignKey("irb_boards.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("enterprise_id", UUID(as_uuid=True), sa.ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("section_id", sa.Integer, sa.ForeignKey("irb_question_sections.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("text", sa.String(1000), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("question_type", sa.String(20), nullable=False),  # text, textarea, select, radio, checkbox, date, number, file_upload
        sa.Column("options", JSONB, nullable=True),
        sa.Column("required", sa.Boolean, default=False, nullable=False),
        sa.Column("order", sa.Integer, nullable=False, default=0),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("submission_type", sa.String(20), nullable=False, server_default="both"),  # standard, exempt, both
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )

    # --- irb_question_conditions ---
    op.create_table(
        "irb_question_conditions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("question_id", sa.Integer, sa.ForeignKey("irb_questions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("depends_on_question_id", sa.Integer, sa.ForeignKey("irb_questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("enterprise_id", UUID(as_uuid=True), sa.ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("operator", sa.String(20), nullable=False),  # equals, not_equals, contains, is_empty, is_not_empty
        sa.Column("value", sa.String(500), nullable=False),
    )

    # --- irb_submission_responses ---
    op.create_table(
        "irb_submission_responses",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("submission_id", UUID(as_uuid=True), sa.ForeignKey("irb_submissions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("question_id", sa.Integer, sa.ForeignKey("irb_questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("enterprise_id", UUID(as_uuid=True), sa.ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("answer", sa.Text, nullable=True),
        sa.Column("ai_prefilled", sa.Boolean, default=False, nullable=False),
        sa.Column("user_confirmed", sa.Boolean, default=False, nullable=False),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.UniqueConstraint("submission_id", "question_id", name="uq_submission_response"),
    )

    # --- irb_reviews ---
    op.create_table(
        "irb_reviews",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("submission_id", UUID(as_uuid=True), sa.ForeignKey("irb_submissions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("reviewer_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("enterprise_id", UUID(as_uuid=True), sa.ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("role", sa.String(30), nullable=False),
        sa.Column("recommendation", sa.String(20), nullable=True),  # accept, minor_revise, major_revise, decline
        sa.Column("comments", sa.Text, nullable=True),
        sa.Column("feedback_to_submitter", sa.Text, nullable=True),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )

    # --- irb_decisions ---
    op.create_table(
        "irb_decisions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("submission_id", UUID(as_uuid=True), sa.ForeignKey("irb_submissions.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("decided_by_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("enterprise_id", UUID(as_uuid=True), sa.ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("decision", sa.String(20), nullable=False),  # accept, minor_revise, major_revise, decline
        sa.Column("rationale", sa.Text, nullable=True),
        sa.Column("letter", sa.Text, nullable=True),
        sa.Column("conditions", sa.Text, nullable=True),
        sa.Column("decided_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )

    # --- irb_submission_history ---
    op.create_table(
        "irb_submission_history",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("submission_id", UUID(as_uuid=True), sa.ForeignKey("irb_submissions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("enterprise_id", UUID(as_uuid=True), sa.ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("from_status", sa.String(30), nullable=False),
        sa.Column("to_status", sa.String(30), nullable=False),
        sa.Column("changed_by_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )

    # --- irb_ai_configs ---
    op.create_table(
        "irb_ai_configs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("enterprise_id", UUID(as_uuid=True), sa.ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("provider", sa.String(20), nullable=False),  # anthropic, openai, custom
        sa.Column("api_key_encrypted", sa.Text, nullable=False),
        sa.Column("model_name", sa.String(100), nullable=False),
        sa.Column("custom_endpoint", sa.String(500), nullable=True),
        sa.Column("max_tokens", sa.Integer, default=4096, nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Enable RLS on all IRB tables
    for table in IRB_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"""
            CREATE POLICY tenant_isolation_{table} ON {table}
            USING (enterprise_id = NULLIF(current_setting('app.current_enterprise_id', true), '')::uuid)
        """)
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")


def downgrade() -> None:
    for table in reversed(IRB_TABLES):
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
        op.drop_table(table)
```

**Step 2: Run migration to verify it applies**

Run: `cd backend && alembic upgrade head`
Expected: Migration 027 applied successfully.

**Step 3: Commit**

```bash
git add backend/alembic/versions/027_add_irb_module_tables.py
git commit -m "feat(irb): add database migration for all IRB tables with RLS"
```

---

### Task 1.2: Create IRB SQLAlchemy models

**Files:**
- Create: `backend/app/models/irb.py`
- Modify: `backend/app/models/__init__.py`

**Step 1: Write the models file**

Create `backend/app/models/irb.py` with all 12 IRB models. Use `Mapped` type hints (SQLAlchemy 2.0 style), `enterprise_id` on every model, `UUID(as_uuid=True)` for UUID PKs, `func.now()` for timestamps, and `TYPE_CHECKING` guard for circular imports.

Models to define:
- `IrbBoard` (tablename: `irb_boards`)
- `IrbBoardMember` (tablename: `irb_board_members`)
- `IrbSubmission` (tablename: `irb_submissions`)
- `IrbSubmissionFile` (tablename: `irb_submission_files`)
- `IrbQuestionSection` (tablename: `irb_question_sections`)
- `IrbQuestion` (tablename: `irb_questions`)
- `IrbQuestionCondition` (tablename: `irb_question_conditions`)
- `IrbSubmissionResponse` (tablename: `irb_submission_responses`)
- `IrbReview` (tablename: `irb_reviews`)
- `IrbDecision` (tablename: `irb_decisions`)
- `IrbSubmissionHistory` (tablename: `irb_submission_history`)
- `IrbAiConfig` (tablename: `irb_ai_configs`)

Key relationships:
- `IrbBoard.members` → `IrbBoardMember` (cascade delete)
- `IrbBoard.submissions` → `IrbSubmission`
- `IrbBoard.sections` → `IrbQuestionSection` (cascade delete)
- `IrbBoard.questions` → `IrbQuestion` (cascade delete)
- `IrbSubmission.files` → `IrbSubmissionFile` (cascade delete)
- `IrbSubmission.responses` → `IrbSubmissionResponse` (cascade delete)
- `IrbSubmission.reviews` → `IrbReview` (cascade delete)
- `IrbSubmission.decision` → `IrbDecision` (uselist=False)
- `IrbSubmission.history` → `IrbSubmissionHistory` (cascade delete)
- `IrbQuestion.conditions` → `IrbQuestionCondition` (cascade delete)

**Step 2: Update models __init__.py**

Add to `backend/app/models/__init__.py`:
```python
from app.models.irb import (
    IrbBoard,
    IrbBoardMember,
    IrbSubmission,
    IrbSubmissionFile,
    IrbQuestionSection,
    IrbQuestion,
    IrbQuestionCondition,
    IrbSubmissionResponse,
    IrbReview,
    IrbDecision,
    IrbSubmissionHistory,
    IrbAiConfig,
)
```

And add all names to `__all__`.

**Step 3: Verify models import cleanly**

Run: `cd backend && python -c "from app.models.irb import IrbBoard, IrbSubmission; print('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add backend/app/models/irb.py backend/app/models/__init__.py
git commit -m "feat(irb): add SQLAlchemy models for all IRB entities"
```

---

## Phase 2: Backend Schemas

### Task 2.1: Create IRB Pydantic schemas

**Files:**
- Create: `backend/app/schemas/irb.py`
- Modify: `backend/app/schemas/__init__.py`

**Step 1: Write the schemas file**

Create `backend/app/schemas/irb.py` with these schema groups. Use `Literal` for enums, `ConfigDict(from_attributes=True)` for response models, `Field()` for validation.

**Literal types:**
```python
BoardType = Literal["irb", "research_council"]
BoardMemberRole = Literal["coordinator", "main_reviewer", "associate_reviewer", "statistician"]
SubmissionType = Literal["standard", "exempt"]
SubmissionStatus = Literal["draft", "submitted", "in_triage", "assigned_to_main", "under_review", "decision_made", "accepted", "revision_requested", "declined"]
RevisionType = Literal["minor", "major"]
QuestionType = Literal["text", "textarea", "select", "radio", "checkbox", "date", "number", "file_upload"]
SubmissionTypeFilter = Literal["standard", "exempt", "both"]
ConditionOperator = Literal["equals", "not_equals", "contains", "is_empty", "is_not_empty"]
Recommendation = Literal["accept", "minor_revise", "major_revise", "decline"]
Decision = Literal["accept", "minor_revise", "major_revise", "decline"]
FileType = Literal["protocol", "consent_form", "supporting_doc"]
AiProvider = Literal["anthropic", "openai", "custom"]
```

**Schema groups (Base/Create/Update/Response pattern for each):**

1. **Board schemas:** `IrbBoardCreate`, `IrbBoardUpdate`, `IrbBoardResponse`, `IrbBoardDetail` (with members count)
2. **Board member schemas:** `IrbBoardMemberCreate`, `IrbBoardMemberResponse` (with user name/email)
3. **Question section schemas:** `IrbQuestionSectionCreate`, `IrbQuestionSectionUpdate`, `IrbQuestionSectionResponse`
4. **Question schemas:** `IrbQuestionCreate` (with optional conditions list), `IrbQuestionUpdate`, `IrbQuestionResponse` (with conditions)
5. **Question condition schemas:** `IrbQuestionConditionCreate`, `IrbQuestionConditionResponse`
6. **Submission schemas:** `IrbSubmissionCreate`, `IrbSubmissionUpdate`, `IrbSubmissionResponse`, `IrbSubmissionDetail` (with responses, files, reviews, decision, history)
7. **Submission file schemas:** `IrbSubmissionFileResponse`
8. **Submission response schemas:** `IrbSubmissionResponseCreate`, `IrbSubmissionResponseUpdate`, `IrbSubmissionResponseResponse`
9. **Review schemas:** `IrbReviewCreate`, `IrbReviewResponse`
10. **Decision schemas:** `IrbDecisionCreate`, `IrbDecisionResponse`
11. **History schemas:** `IrbSubmissionHistoryResponse`
12. **AI config schemas:** `IrbAiConfigCreate`, `IrbAiConfigUpdate`, `IrbAiConfigResponse` (mask api_key in response)
13. **Triage/assignment action schemas:** `IrbTriageAction`, `IrbAssignMainReviewer`, `IrbAssignReviewers`
14. **Dashboard schema:** `IrbDashboardResponse`

**Step 2: Update schemas __init__.py**

Add IRB schema imports and `__all__` entries to `backend/app/schemas/__init__.py`.

**Step 3: Verify schemas import cleanly**

Run: `cd backend && python -c "from app.schemas.irb import IrbBoardCreate, IrbSubmissionResponse; print('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add backend/app/schemas/irb.py backend/app/schemas/__init__.py
git commit -m "feat(irb): add Pydantic schemas for all IRB entities"
```

---

## Phase 3: Backend Services

### Task 3.1: Create IRB board service

**Files:**
- Create: `backend/app/services/irb_board_service.py`

**Step 1: Write the service**

`IrbBoardService` handles:
- `create_board(data, enterprise_id)` — enforce one enterprise IRB per enterprise, one research council per institution
- `update_board(board_id, data)`
- `get_board(board_id)` with members eager-loaded
- `list_boards(enterprise_id, institution_id=None)`
- `add_member(board_id, user_id, role)`
- `remove_member(board_id, user_id)`
- `get_members(board_id)`

Validation: board_type must be `irb` or `research_council`. If `research_council`, `institution_id` is required. If `irb`, `institution_id` must be null.

**Step 2: Verify import**

Run: `cd backend && python -c "from app.services.irb_board_service import IrbBoardService; print('OK')"`

**Step 3: Commit**

```bash
git add backend/app/services/irb_board_service.py
git commit -m "feat(irb): add board management service"
```

---

### Task 3.2: Create IRB question service

**Files:**
- Create: `backend/app/services/irb_question_service.py`

**Step 1: Write the service**

`IrbQuestionService` handles:
- `create_section(board_id, data, enterprise_id)`
- `update_section(section_id, data)`
- `list_sections(board_id)`
- `create_question(board_id, data, enterprise_id)` — includes creating conditions
- `update_question(question_id, data)` — includes updating conditions
- `delete_question(question_id)` — soft delete (set `is_active=False`)
- `list_questions(board_id, section_id=None, submission_type=None)` — filter by section and/or submission type, include conditions

**Step 2: Verify import**

Run: `cd backend && python -c "from app.services.irb_question_service import IrbQuestionService; print('OK')"`

**Step 3: Commit**

```bash
git add backend/app/services/irb_question_service.py
git commit -m "feat(irb): add question management service"
```

---

### Task 3.3: Create IRB submission service

**Files:**
- Create: `backend/app/services/irb_submission_service.py`

**Step 1: Write the service**

`IrbSubmissionService` handles:
- `create_submission(data, user, enterprise_id)` — creates draft
- `update_submission(submission_id, data)` — update draft fields
- `get_submission(submission_id)` — eager load responses, files, reviews, decision, history
- `submit(submission_id, user)` — change status `draft → submitted`, set `submitted_at`, record history
- `save_responses(submission_id, responses: list)` — upsert answers
- `upload_file(submission_id, file_name, file_url, file_type, enterprise_id)`
- `triage(submission_id, action, note, user)` — coordinator accepts (→ `in_triage`) or returns to submitter
- `assign_main_reviewer(submission_id, reviewer_id, user)` — set `main_reviewer_id`, status → `assigned_to_main`
- `assign_reviewers(submission_id, reviewer_ids, user)` — create `IrbReview` records, status → `under_review`
- `submit_review(submission_id, review_data, user)` — reviewer fills recommendation + comments
- `issue_decision(submission_id, decision_data, user)` — create `IrbDecision`, status → `decision_made` then → `accepted`/`revision_requested`/`declined`
- `escalate(submission_id, target_board_id, user)` — create new submission on target board with `escalated_from_id`
- `resubmit(submission_id, user)` — create new version (same project, incremented version)
- `get_dashboard(user, enterprise_id)` — returns my submissions, my pending reviews, board queue (if board member)

Each status change creates an `IrbSubmissionHistory` record.

**Step 2: Verify import**

Run: `cd backend && python -c "from app.services.irb_submission_service import IrbSubmissionService; print('OK')"`

**Step 3: Commit**

```bash
git add backend/app/services/irb_submission_service.py
git commit -m "feat(irb): add submission workflow service"
```

---

### Task 3.4: Create IRB AI service

**Files:**
- Create: `backend/app/services/irb_ai_service.py`

**Step 1: Write the service**

`IrbAiService` with pluggable LLM provider pattern:

```python
from abc import ABC, abstractmethod

class LlmProvider(ABC):
    @abstractmethod
    async def complete(self, system_prompt: str, user_prompt: str, max_tokens: int) -> str: ...

class AnthropicProvider(LlmProvider):
    # Uses httpx to call Anthropic Messages API
    ...

class OpenAIProvider(LlmProvider):
    # Uses httpx to call OpenAI Chat Completions API
    ...

class CustomProvider(LlmProvider):
    # Generic HTTP POST to custom_endpoint
    ...
```

`IrbAiService` methods:
- `get_provider(enterprise_id)` — load `IrbAiConfig`, instantiate correct provider
- `summarize_protocol(submission_id, enterprise_id)` — parse PDF/DOCX, send to LLM, store `ai_summary`
- `prefill_questions(submission_id, enterprise_id)` — send protocol text + questions, parse JSON response, create `IrbSubmissionResponse` records with `ai_prefilled=True`
- `_parse_file(file_url)` — download and extract text from PDF (PyPDF2) or DOCX (python-docx)

AI config CRUD:
- `get_config(enterprise_id)`
- `save_config(enterprise_id, data)` — encrypt API key before storing
- `test_connection(enterprise_id)` — send a minimal prompt to verify credentials

**Step 2: Verify import**

Run: `cd backend && python -c "from app.services.irb_ai_service import IrbAiService; print('OK')"`

**Step 3: Commit**

```bash
git add backend/app/services/irb_ai_service.py
git commit -m "feat(irb): add AI service with pluggable LLM providers"
```

---

### Task 3.5: Update services __init__.py

**Files:**
- Modify: `backend/app/services/__init__.py`

**Step 1: Add IRB service exports**

```python
from app.services.irb_board_service import IrbBoardService
from app.services.irb_question_service import IrbQuestionService
from app.services.irb_submission_service import IrbSubmissionService
from app.services.irb_ai_service import IrbAiService
```

Add to `__all__`.

**Step 2: Commit**

```bash
git add backend/app/services/__init__.py
git commit -m "feat(irb): export IRB services from services package"
```

---

## Phase 4: API Routes

### Task 4.1: Create IRB board routes

**Files:**
- Create: `backend/app/api/routes/irb_boards.py`

**Step 1: Write the routes**

Router with prefix will be `/api/irb/boards`. Endpoints:

```python
router = APIRouter()

@router.get("", response_model=List[IrbBoardResponse])
def list_boards(...)  # List boards for enterprise. Filter by institution_id optional.

@router.post("", response_model=IrbBoardResponse)
def create_board(...)  # Requires superuser or institution admin. Plan gate: team+.

@router.put("/{board_id}", response_model=IrbBoardResponse)
def update_board(...)

@router.get("/{board_id}/members", response_model=List[IrbBoardMemberResponse])
def list_members(...)

@router.post("/{board_id}/members", response_model=IrbBoardMemberResponse)
def add_member(...)

@router.delete("/{board_id}/members/{user_id}")
def remove_member(...)
```

Dependencies: `get_current_user`, `get_tenant_db`, `get_current_enterprise_id`, `require_plan("team")`.

**Step 2: Commit**

```bash
git add backend/app/api/routes/irb_boards.py
git commit -m "feat(irb): add board management API routes"
```

---

### Task 4.2: Create IRB question routes

**Files:**
- Create: `backend/app/api/routes/irb_questions.py`

**Step 1: Write the routes**

Endpoints under `/api/irb`:

```python
router = APIRouter()

# Sections
@router.get("/boards/{board_id}/sections", response_model=List[IrbQuestionSectionResponse])
@router.post("/boards/{board_id}/sections", response_model=IrbQuestionSectionResponse)
@router.put("/sections/{section_id}", response_model=IrbQuestionSectionResponse)

# Questions
@router.get("/boards/{board_id}/questions", response_model=List[IrbQuestionResponse])
@router.post("/boards/{board_id}/questions", response_model=IrbQuestionResponse)
@router.put("/questions/{question_id}", response_model=IrbQuestionResponse)
@router.delete("/questions/{question_id}")
```

**Step 2: Commit**

```bash
git add backend/app/api/routes/irb_questions.py
git commit -m "feat(irb): add question management API routes"
```

---

### Task 4.3: Create IRB submission routes

**Files:**
- Create: `backend/app/api/routes/irb_submissions.py`

**Step 1: Write the routes**

Endpoints under `/api/irb/submissions`:

```python
router = APIRouter()

@router.post("", response_model=IrbSubmissionResponse)
def create_submission(...)

@router.get("/{submission_id}", response_model=IrbSubmissionDetail)
def get_submission(...)

@router.put("/{submission_id}", response_model=IrbSubmissionResponse)
def update_submission(...)

@router.post("/{submission_id}/submit")
def submit_submission(...)

@router.post("/{submission_id}/files", response_model=IrbSubmissionFileResponse)
def upload_file(...)

@router.post("/{submission_id}/responses")
def save_responses(...)

# AI endpoints (plan gated to institution)
@router.get("/{submission_id}/ai-summary")
def generate_ai_summary(...)  # require_plan("institution")

@router.post("/{submission_id}/ai-prefill")
def ai_prefill_questions(...)  # require_plan("institution")

# Workflow endpoints
@router.post("/{submission_id}/triage")
def triage(...)

@router.post("/{submission_id}/assign-main")
def assign_main_reviewer(...)

@router.post("/{submission_id}/assign-reviewers")
def assign_reviewers(...)

@router.get("/{submission_id}/reviews", response_model=List[IrbReviewResponse])
def list_reviews(...)

@router.post("/{submission_id}/reviews", response_model=IrbReviewResponse)
def submit_review(...)

@router.post("/{submission_id}/decision", response_model=IrbDecisionResponse)
def issue_decision(...)

@router.post("/{submission_id}/escalate", response_model=IrbSubmissionResponse)
def escalate(...)
```

**Step 2: Commit**

```bash
git add backend/app/api/routes/irb_submissions.py
git commit -m "feat(irb): add submission and workflow API routes"
```

---

### Task 4.4: Create IRB dashboard and AI config routes

**Files:**
- Create: `backend/app/api/routes/irb_dashboard.py`

**Step 1: Write the routes**

```python
router = APIRouter()

@router.get("/dashboard", response_model=IrbDashboardResponse)
def get_dashboard(...)

# AI config (admin only, institution plan)
@router.get("/ai-config", response_model=IrbAiConfigResponse)
def get_ai_config(...)

@router.post("/ai-config", response_model=IrbAiConfigResponse)
def save_ai_config(...)

@router.post("/ai-config/test")
def test_ai_connection(...)
```

**Step 2: Commit**

```bash
git add backend/app/api/routes/irb_dashboard.py
git commit -m "feat(irb): add dashboard and AI config routes"
```

---

### Task 4.5: Register IRB routes in main app

**Files:**
- Modify: `backend/app/api/routes/__init__.py`
- Modify: `backend/app/main.py`

**Step 1: Export IRB routers from routes/__init__.py**

Add:
```python
from app.api.routes.irb_boards import router as irb_boards_router
from app.api.routes.irb_questions import router as irb_questions_router
from app.api.routes.irb_submissions import router as irb_submissions_router
from app.api.routes.irb_dashboard import router as irb_dashboard_router
```

**Step 2: Register in main.py**

Add after invite codes router:
```python
# IRB routes
app.include_router(irb_boards_router, prefix="/api/irb/boards", tags=["IRB Boards"])
app.include_router(irb_questions_router, prefix="/api/irb", tags=["IRB Questions"])
app.include_router(irb_submissions_router, prefix="/api/irb/submissions", tags=["IRB Submissions"])
app.include_router(irb_dashboard_router, prefix="/api/irb", tags=["IRB Dashboard"])
```

**Step 3: Verify server starts**

Run: `cd backend && python -c "from app.main import app; print(len(app.routes), 'routes')"`

**Step 4: Commit**

```bash
git add backend/app/api/routes/__init__.py backend/app/main.py
git commit -m "feat(irb): register all IRB routers in FastAPI app"
```

---

## Phase 5: Frontend Types & API

### Task 5.1: Create IRB TypeScript types

**Files:**
- Create: `frontend/src/types/irb.ts`
- Modify: `frontend/src/types/index.ts`

**Step 1: Write types**

Define all IRB interfaces matching backend response schemas:
- `IrbBoard`, `IrbBoardDetail`
- `IrbBoardMember`
- `IrbQuestionSection`
- `IrbQuestion`, `IrbQuestionCondition`
- `IrbSubmission`, `IrbSubmissionDetail`
- `IrbSubmissionFile`
- `IrbSubmissionResponse`
- `IrbReview`
- `IrbDecision`
- `IrbSubmissionHistory`
- `IrbAiConfig`
- `IrbDashboard`
- Type unions: `BoardType`, `BoardMemberRole`, `SubmissionType`, `SubmissionStatus`, `QuestionType`, `ConditionOperator`, `Recommendation`, `Decision`, `FileType`, `AiProvider`

**Step 2: Export from types/index.ts**

Add `export * from './irb';`

**Step 3: Commit**

```bash
git add frontend/src/types/irb.ts frontend/src/types/index.ts
git commit -m "feat(irb): add TypeScript types for IRB module"
```

---

### Task 5.2: Create IRB API client functions

**Files:**
- Create: `frontend/src/api/irb.ts`
- Modify: `frontend/src/services/api.ts`

**Step 1: Write API functions**

Organized by domain:

```typescript
// Board management
export const getIrbBoards = (params?) => client.get('/irb/boards', { params });
export const createIrbBoard = (data) => client.post('/irb/boards', data);
export const updateIrbBoard = (id, data) => client.put(`/irb/boards/${id}`, data);
export const getIrbBoardMembers = (boardId) => client.get(`/irb/boards/${boardId}/members`);
export const addIrbBoardMember = (boardId, data) => client.post(`/irb/boards/${boardId}/members`, data);
export const removeIrbBoardMember = (boardId, userId) => client.delete(`/irb/boards/${boardId}/members/${userId}`);

// Sections & Questions
export const getIrbSections = (boardId) => client.get(`/irb/boards/${boardId}/sections`);
export const createIrbSection = (boardId, data) => client.post(`/irb/boards/${boardId}/sections`, data);
export const updateIrbSection = (sectionId, data) => client.put(`/irb/sections/${sectionId}`, data);
export const getIrbQuestions = (boardId, params?) => client.get(`/irb/boards/${boardId}/questions`, { params });
export const createIrbQuestion = (boardId, data) => client.post(`/irb/boards/${boardId}/questions`, data);
export const updateIrbQuestion = (questionId, data) => client.put(`/irb/questions/${questionId}`, data);
export const deleteIrbQuestion = (questionId) => client.delete(`/irb/questions/${questionId}`);

// Submissions
export const createIrbSubmission = (data) => client.post('/irb/submissions', data);
export const getIrbSubmission = (id) => client.get(`/irb/submissions/${id}`);
export const updateIrbSubmission = (id, data) => client.put(`/irb/submissions/${id}`, data);
export const submitIrbSubmission = (id) => client.post(`/irb/submissions/${id}/submit`);
export const uploadIrbFile = (id, formData) => client.post(`/irb/submissions/${id}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const saveIrbResponses = (id, responses) => client.post(`/irb/submissions/${id}/responses`, responses);

// AI
export const generateAiSummary = (id) => client.get(`/irb/submissions/${id}/ai-summary`);
export const aiPrefillQuestions = (id) => client.post(`/irb/submissions/${id}/ai-prefill`);

// Workflow
export const triageIrbSubmission = (id, data) => client.post(`/irb/submissions/${id}/triage`, data);
export const assignMainReviewer = (id, data) => client.post(`/irb/submissions/${id}/assign-main`, data);
export const assignReviewers = (id, data) => client.post(`/irb/submissions/${id}/assign-reviewers`, data);
export const getIrbReviews = (id) => client.get(`/irb/submissions/${id}/reviews`);
export const submitIrbReview = (id, data) => client.post(`/irb/submissions/${id}/reviews`, data);
export const issueIrbDecision = (id, data) => client.post(`/irb/submissions/${id}/decision`, data);
export const escalateIrbSubmission = (id, data) => client.post(`/irb/submissions/${id}/escalate`, data);

// Dashboard
export const getIrbDashboard = () => client.get('/irb/dashboard');

// AI Config
export const getIrbAiConfig = () => client.get('/irb/ai-config');
export const saveIrbAiConfig = (data) => client.post('/irb/ai-config', data);
export const testIrbAiConnection = () => client.post('/irb/ai-config/test');
```

**Step 2: Add exports to services/api.ts**

Add IRB section at the bottom of `services/api.ts` re-exporting from `../api/irb`.

**Step 3: Commit**

```bash
git add frontend/src/api/irb.ts frontend/src/services/api.ts
git commit -m "feat(irb): add frontend API client functions"
```

---

## Phase 6: Frontend Pages

### Task 6.1: Create IRB Dashboard page

**Files:**
- Create: `frontend/src/pages/irb/IrbDashboard.tsx`

Role-aware dashboard showing:
- **My Submissions** section (cards with status badges)
- **My Pending Reviews** section (if user is a reviewer on any board)
- **Board Queue** section (if user is coordinator/main_reviewer — submissions awaiting action)
- Links to create new submission, view submission details

**Commit:**
```bash
git add frontend/src/pages/irb/IrbDashboard.tsx
git commit -m "feat(irb): add IRB dashboard page"
```

---

### Task 6.2: Create IRB Submissions List page

**Files:**
- Create: `frontend/src/pages/irb/IrbSubmissions.tsx`

Table/card list of user's submissions with:
- Project name, board name, submission type, status badge, version, dates
- Filter by status
- Link to create new submission
- Link to submission detail

**Commit:**
```bash
git add frontend/src/pages/irb/IrbSubmissions.tsx
git commit -m "feat(irb): add submissions list page"
```

---

### Task 6.3: Create Submission Wizard (multi-step form)

**Files:**
- Create: `frontend/src/pages/irb/IrbSubmissionWizard.tsx`
- Create: `frontend/src/components/irb/ConditionalQuestionRenderer.tsx`

Multi-step wizard:
1. **Select Board** — dropdown of available boards
2. **Select Project** — dropdown of user's projects
3. **Choose Type** — standard or exempt radio
4. **Upload Protocol** — file upload for PDF/DOCX
5. **AI Summary** — (Institution plan only) generate summary, review/edit, approve
6. **Fill Questions** — render questions for selected board + type, with conditional logic. (Institution plan) AI pre-fill button.
7. **Review & Submit** — summary of all answers, confirm and submit

`ConditionalQuestionRenderer` evaluates `IrbQuestionCondition` rules against current answers to show/hide questions dynamically.

**Commit:**
```bash
git add frontend/src/pages/irb/IrbSubmissionWizard.tsx frontend/src/components/irb/ConditionalQuestionRenderer.tsx
git commit -m "feat(irb): add submission wizard with conditional question renderer"
```

---

### Task 6.4: Create Submission Detail page

**Files:**
- Create: `frontend/src/pages/irb/IrbSubmissionDetail.tsx`
- Create: `frontend/src/components/irb/SubmissionTimeline.tsx`

Shows:
- Status timeline (visual progression through workflow stages)
- Protocol file link + AI summary (if generated)
- Responses (question/answer pairs)
- Files list
- Reviews (visible to board members and submitter after decision)
- Decision letter (after decision)
- Resubmit button (if revision requested)
- Escalate button (if board member on research council)

**Commit:**
```bash
git add frontend/src/pages/irb/IrbSubmissionDetail.tsx frontend/src/components/irb/SubmissionTimeline.tsx
git commit -m "feat(irb): add submission detail page with timeline"
```

---

### Task 6.5: Create Review Queue and Review Form pages

**Files:**
- Create: `frontend/src/pages/irb/IrbReviewQueue.tsx`
- Create: `frontend/src/pages/irb/IrbReviewForm.tsx`

**Review Queue:** List of submissions assigned to current user for review, filtered by status.

**Review Form:** For assigned reviewers — shows submission summary, protocol, responses. Form for recommendation (select), comments (textarea), feedback to submitter (textarea). Submit button.

**Commit:**
```bash
git add frontend/src/pages/irb/IrbReviewQueue.tsx frontend/src/pages/irb/IrbReviewForm.tsx
git commit -m "feat(irb): add review queue and review form pages"
```

---

### Task 6.6: Create Decision Panel page

**Files:**
- Create: `frontend/src/pages/irb/IrbDecisionPanel.tsx`

For main reviewer only. Shows:
- All independent reviews (recommendation, comments)
- Submission summary
- Decision form: decision (select), rationale (textarea), decision letter (textarea), conditions (optional textarea)
- Submit decision button

**Commit:**
```bash
git add frontend/src/pages/irb/IrbDecisionPanel.tsx
git commit -m "feat(irb): add main reviewer decision panel"
```

---

### Task 6.7: Create Board Detail page

**Files:**
- Create: `frontend/src/pages/irb/IrbBoardDetail.tsx`

Shows:
- Board info (name, type, description)
- Members list with roles
- Submission queue (for board coordinators)
- Stats (total submissions, pending, decided)

**Commit:**
```bash
git add frontend/src/pages/irb/IrbBoardDetail.tsx
git commit -m "feat(irb): add board detail page"
```

---

## Phase 7: Frontend Integration

### Task 7.1: Add IRB routes to App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

Add protected routes:
```tsx
<Route path="/irb" element={<ProtectedRoute><Layout><IrbDashboard /></Layout></ProtectedRoute>} />
<Route path="/irb/submissions" element={<ProtectedRoute><Layout><IrbSubmissions /></Layout></ProtectedRoute>} />
<Route path="/irb/submissions/new" element={<ProtectedRoute><Layout><IrbSubmissionWizard /></Layout></ProtectedRoute>} />
<Route path="/irb/submissions/:id" element={<ProtectedRoute><Layout><IrbSubmissionDetail /></Layout></ProtectedRoute>} />
<Route path="/irb/reviews" element={<ProtectedRoute><Layout><IrbReviewQueue /></Layout></ProtectedRoute>} />
<Route path="/irb/reviews/:submissionId" element={<ProtectedRoute><Layout><IrbReviewForm /></Layout></ProtectedRoute>} />
<Route path="/irb/boards/:id" element={<ProtectedRoute><Layout><IrbBoardDetail /></Layout></ProtectedRoute>} />
<Route path="/irb/boards/:id/decide/:submissionId" element={<ProtectedRoute><Layout><IrbDecisionPanel /></Layout></ProtectedRoute>} />
```

**Commit:**
```bash
git add frontend/src/App.tsx
git commit -m "feat(irb): add IRB routes to frontend router"
```

---

### Task 7.2: Add IRB to sidebar navigation

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx`

Add IRB section (with Shield icon from lucide-react) after existing nav items:
- **IRB** heading
  - Dashboard → `/irb`
  - My Submissions → `/irb/submissions`
  - Review Queue → `/irb/reviews` (only visible if user is a board member)
  - Boards → `/irb/boards` (list, only visible to admins)

Wrap with `PlanGate` check for `team` plan minimum.

**Commit:**
```bash
git add frontend/src/components/layout/Sidebar.tsx
git commit -m "feat(irb): add IRB section to sidebar navigation"
```

---

### Task 7.3: Add IRB admin tabs

**Files:**
- Modify: `frontend/src/pages/admin/AdminLayout.tsx`
- Create: `frontend/src/pages/admin/IrbAdminBoards.tsx`
- Create: `frontend/src/pages/admin/IrbAdminQuestions.tsx`
- Create: `frontend/src/pages/admin/IrbAdminAiSettings.tsx`

Add to `adminTabs` array:
```typescript
{ to: '/admin/irb-boards', label: 'IRB Boards', requiredPlan: 'team' },
{ to: '/admin/irb-questions', label: 'IRB Questions', requiredPlan: 'team' },
{ to: '/admin/irb-ai', label: 'IRB AI Settings', requiredPlan: 'institution' },
```

**IrbAdminBoards:** CRUD for boards with member management.
**IrbAdminQuestions:** Select board → manage sections → manage questions with conditions.
**IrbAdminAiSettings:** Configure LLM provider, API key, model, test connection button.

**Commit:**
```bash
git add frontend/src/pages/admin/AdminLayout.tsx frontend/src/pages/admin/IrbAdmin*.tsx
git commit -m "feat(irb): add IRB admin tabs for boards, questions, and AI settings"
```

---

## Phase 8: Backend Dependencies & Final Wiring

### Task 8.1: Add Python dependencies

**Files:**
- Modify: `backend/requirements.txt`

Add:
```
PyPDF2>=3.0.0
python-docx>=1.0.0
httpx>=0.27.0
cryptography>=42.0.0
```

Run: `cd backend && pip install -r requirements.txt`

**Commit:**
```bash
git add backend/requirements.txt
git commit -m "feat(irb): add PyPDF2, python-docx, httpx, cryptography dependencies"
```

---

### Task 8.2: End-to-end smoke test

**Steps:**
1. Start backend: `cd backend && alembic upgrade head && uvicorn app.main:app --reload`
2. Verify `/docs` shows all IRB endpoints
3. Start frontend: `cd frontend && npm run dev`
4. Verify `/irb` dashboard loads
5. Verify admin IRB tabs appear
6. Create a board via API
7. Create a question via API
8. Create a submission draft via API

**Commit (if any fixes needed):**
```bash
git add -A
git commit -m "fix(irb): smoke test fixes"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1.1–1.2 | Database migration + SQLAlchemy models |
| 2 | 2.1 | Pydantic schemas |
| 3 | 3.1–3.5 | Backend services (board, question, submission, AI) |
| 4 | 4.1–4.5 | API routes + registration |
| 5 | 5.1–5.2 | Frontend types + API client |
| 6 | 6.1–6.7 | Frontend pages (dashboard, wizard, detail, review, decision, board) |
| 7 | 7.1–7.3 | Frontend integration (routes, sidebar, admin tabs) |
| 8 | 8.1–8.2 | Dependencies + smoke test |

Total: ~25 tasks, ~25 commits.
