# IRB Module Design

## Overview

An Institutional Review Board (IRB) module for EduResearch Project Manager. Allows research projects to be submitted for ethical review through a structured workflow with configurable questions, AI-assisted summarization, and multi-tier board hierarchy.

## Key Decisions

- **ML provider**: Pluggable/configurable (Anthropic, OpenAI, or custom endpoint)
- **Protocol input**: File upload (PDF/DOCX) parsed and summarized by LLM
- **Review model**: Independent reviewer votes, main reviewer issues final decision
- **Question system**: Enhanced with conditional logic (show/hide based on prior answers)
- **Board hierarchy**: Research councils are autonomous, can escalate to enterprise IRB at their discretion; direct submission to enterprise IRB is also possible
- **Plan gating**: Tiered (Team = 1 board, no AI; Institution = unlimited boards + AI features)

## Data Model

### Core Entities

**`irb_board`** — Enterprise IRB or institution-level Research Council.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| enterprise_id | UUID FK | RLS tenant isolation |
| institution_id | int FK, nullable | NULL = enterprise-level IRB |
| name | str | |
| description | text, nullable | |
| board_type | enum | `irb` or `research_council` |
| is_active | bool | |
| created_at | datetime | |

One enterprise-level IRB per enterprise. One research council per institution.

**`irb_board_member`** — Assigned roles on a board.

| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| board_id | UUID FK | |
| user_id | int FK | |
| role | enum | `coordinator`, `main_reviewer`, `associate_reviewer`, `statistician` |
| is_active | bool | |
| assigned_at | datetime | |

A user can hold different roles on different boards.

**`irb_submission`** — A project submitted for review.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| enterprise_id | UUID FK | RLS |
| board_id | UUID FK | |
| project_id | int FK | |
| submitted_by_id | int FK | |
| submission_type | enum | `standard` or `exempt` |
| status | enum | See workflow below |
| revision_type | enum, nullable | `minor` or `major` |
| protocol_file_url | str | |
| ai_summary | text, nullable | LLM-generated summary |
| ai_summary_approved | bool | Submitter confirmed the summary |
| escalated_from_id | UUID FK self, nullable | Tracks escalation origin |
| version | int | Increments on resubmission |
| main_reviewer_id | int FK, nullable | Assigned main reviewer |
| submitted_at | datetime, nullable | |
| decided_at | datetime, nullable | |
| created_at | datetime | |

**`irb_submission_file`** — Supporting documents.

| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| submission_id | UUID FK | |
| file_name | str | |
| file_url | str | |
| file_type | enum | `protocol`, `consent_form`, `supporting_doc` |
| uploaded_at | datetime | |

### Question System

**`irb_question_section`** — Named groupings for organizing questions.

| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| board_id | UUID FK | |
| name | str | e.g. "Study Design", "Human Subjects" |
| slug | str | |
| description | text, nullable | |
| order | int | |

**`irb_question`** — Configurable questions per board.

| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| board_id | UUID FK | |
| enterprise_id | UUID FK | RLS |
| section_id | int FK | |
| text | str (max 1000) | |
| description | text, nullable | Helper text |
| question_type | enum | `text`, `textarea`, `select`, `radio`, `checkbox`, `date`, `number`, `file_upload` |
| options | JSONB, nullable | For select/radio/checkbox |
| required | bool | |
| order | int | Within section |
| is_active | bool | Soft delete |
| submission_type | enum | `standard`, `exempt`, or `both` |
| created_at | datetime | |

**`irb_question_condition`** — Conditional display logic.

| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| question_id | int FK | The question to show/hide |
| depends_on_question_id | int FK | The trigger question |
| operator | enum | `equals`, `not_equals`, `contains`, `is_empty`, `is_not_empty` |
| value | str | Expected answer value |

When a question has conditions, it is only displayed if ALL conditions are met (AND logic). Questions with no conditions are always shown.

**`irb_submission_response`** — Answers to questions.

| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| submission_id | UUID FK | |
| question_id | int FK | |
| answer | text | |
| ai_prefilled | bool | Was this pre-filled by LLM |
| user_confirmed | bool | Did submitter confirm/edit |
| updated_at | datetime | |

Unique constraint on `(submission_id, question_id)`.

### Review & Decision

**`irb_review`** — Independent reviewer assessments.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| submission_id | UUID FK | |
| reviewer_id | int FK (User) | |
| role | enum | Reviewer's board role at time of review |
| recommendation | enum | `accept`, `minor_revise`, `major_revise`, `decline` |
| comments | text | Private, visible to board only |
| feedback_to_submitter | text | Shared with researcher |
| completed_at | datetime, nullable | |
| created_at | datetime | |

**`irb_decision`** — Main reviewer's final decision.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| submission_id | UUID FK (unique) | One active decision per submission |
| decided_by_id | int FK | The main reviewer |
| decision | enum | `accept`, `minor_revise`, `major_revise`, `decline` |
| rationale | text | Internal justification |
| letter | text | Formal decision letter sent to submitter |
| conditions | text, nullable | Conditions for acceptance |
| decided_at | datetime | |

**`irb_submission_history`** — Audit trail.

| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| submission_id | UUID FK | |
| from_status | str | |
| to_status | str | |
| changed_by_id | int FK | |
| note | text, nullable | |
| created_at | datetime | |

### AI Configuration

**`irb_ai_config`** — Enterprise-level LLM provider settings.

| Column | Type | Notes |
|--------|------|-------|
| id | int PK | |
| enterprise_id | UUID FK (unique) | One config per enterprise |
| provider | enum | `anthropic`, `openai`, `custom` |
| api_key_encrypted | text | Encrypted at rest |
| model_name | str | e.g. "claude-sonnet-4-20250514", "gpt-4o" |
| custom_endpoint | str, nullable | For self-hosted providers |
| max_tokens | int | Default 4096 |
| is_active | bool | |
| updated_at | datetime | |

## Review Workflow

### Status Flow

```
draft -> submitted -> in_triage -> assigned_to_main -> under_review -> decision_made
                                                                         |
                                                          +--------------+--------------+
                                                          |              |              |
                                                       accepted   revision_requested  declined
                                                                        |
                                                                   (resubmit)
                                                                        |
                                                                   submitted (new version)
```

### 4-Stage Process

**Stage 1 - Triage (Coordinator):** Submission arrives. Coordinator checks completeness (form filled, protocol uploaded, correct submission type). Returns to submitter if incomplete, or assigns a main reviewer.

**Stage 2 - Assignment (Main Reviewer):** Main reviewer receives submission, reviews it, assigns associate reviewers and/or statistician from board members.

**Stage 3 - Independent Review:** All assigned reviewers complete reviews independently. Each submits a recommendation (accept/minor_revise/major_revise/decline) plus comments and feedback to submitter.

**Stage 4 - Decision (Main Reviewer):** Main reviewer sees all independent reviews, then issues the final decision with a formal decision letter.

### Escalation

Research councils can escalate submissions to the enterprise IRB at their discretion. This creates a new submission linked via `escalated_from_id`. Direct submission to the enterprise IRB is independently possible.

### Resubmission

On revision decisions (minor or major), the submitter creates a new version (same project, incremented version number). The new submission goes through the full workflow again.

## AI/ML Module

### Architecture

`IrbAiService` in `backend/app/services/irb_ai_service.py` — pluggable provider pattern.

### Two Operations

**1. Protocol Summarization:**
- Parse uploaded PDF (`PyPDF2`) or DOCX (`python-docx`) to extract text
- Send to configured LLM with system prompt for 1-2 page summary covering: study objectives, design, population, procedures, risks, benefits, data management
- Store result in `irb_submission.ai_summary`
- Submitter reviews, edits, and approves before submission

**2. Question Pre-filling:**
- Send extracted protocol text + board's active questions for the submission type
- LLM returns JSON with `{question_id: answer}` pairs
- Creates `irb_submission_response` records with `ai_prefilled=true, user_confirmed=false`
- Submitter sees pre-filled answers highlighted, edits as needed, confirms each

### Provider Interface

```python
class LlmProvider(ABC):
    @abstractmethod
    async def complete(self, system_prompt: str, user_prompt: str, max_tokens: int) -> str: ...

class AnthropicProvider(LlmProvider): ...
class OpenAIProvider(LlmProvider): ...
class CustomProvider(LlmProvider): ...  # Generic HTTP endpoint
```

Provider resolved from `irb_ai_config` at request time.

### Plan Gating

AI features require Institution plan. Team plan users fill questions manually.

## API Endpoints

All under `/api/irb/`, using `get_tenant_db` and plan gating.

### Board Management (superuser or institution admin)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/boards` | List boards |
| POST | `/boards` | Create board |
| PUT | `/boards/{id}` | Update board |
| GET | `/boards/{id}/members` | List members with roles |
| POST | `/boards/{id}/members` | Assign user to board |
| DELETE | `/boards/{id}/members/{user_id}` | Remove member |

### Question Management (coordinator or board admin)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/boards/{id}/sections` | List sections |
| POST | `/boards/{id}/sections` | Create section |
| PUT | `/sections/{id}` | Update section |
| GET | `/boards/{id}/questions` | List questions (filter by section, submission_type) |
| POST | `/boards/{id}/questions` | Create question with optional conditions |
| PUT | `/questions/{id}` | Update question |
| DELETE | `/questions/{id}` | Soft-delete |

### Submission (any project member)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/submissions` | Create draft |
| GET | `/submissions/{id}` | Get submission with responses |
| PUT | `/submissions/{id}` | Update draft |
| POST | `/submissions/{id}/submit` | Finalize and submit |
| POST | `/submissions/{id}/files` | Upload documents |
| GET | `/submissions/{id}/ai-summary` | Trigger AI summarization (Institution) |
| POST | `/submissions/{id}/ai-prefill` | Trigger AI pre-fill (Institution) |
| POST | `/submissions/{id}/escalate` | Escalate to enterprise IRB |

### Review Workflow (board members)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/submissions/{id}/triage` | Coordinator accepts/returns |
| POST | `/submissions/{id}/assign-main` | Coordinator assigns main reviewer |
| POST | `/submissions/{id}/assign-reviewers` | Main reviewer assigns reviewers |
| GET | `/submissions/{id}/reviews` | Main reviewer sees all reviews |
| POST | `/submissions/{id}/reviews` | Reviewer submits review |
| POST | `/submissions/{id}/decision` | Main reviewer issues decision |

### Dashboard

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/dashboard` | Role-aware: my submissions, my reviews, board queue |

## Frontend Pages

### Sidebar Navigation (Team+ plan)

- **IRB** (Shield icon)
  - My Submissions
  - Review Queue (visible to board members only)
  - Boards

### Routes

| Route | Purpose |
|-------|---------|
| `/irb` | IRB dashboard (role-aware) |
| `/irb/submissions` | User's submissions list |
| `/irb/submissions/new` | Submission wizard |
| `/irb/submissions/:id` | Submission detail (timeline, responses, files, summary, decisions) |
| `/irb/reviews` | Review queue for board members |
| `/irb/reviews/:submissionId` | Review form |
| `/irb/boards/:id` | Board detail (members, queue, stats) |
| `/irb/boards/:id/decide/:submissionId` | Main reviewer decision page |

### Admin Tab

Added to existing `/admin` layout after "Invite Codes":
- **IRB** tab with sub-tabs: Boards, Questions, AI Settings
- Boards and Questions gated to Team plan
- AI Settings gated to Institution plan

### Key Components

- `SubmissionWizard` — multi-step: select board, select project, choose type, upload protocol, AI summary, fill questions, review & submit
- `SubmissionTimeline` — visual status progression
- `ReviewForm` — reviewer assessment form
- `DecisionPanel` — main reviewer sees all reviews, issues decision
- `ConditionalQuestionRenderer` — evaluates conditions to show/hide questions dynamically

## Email Notifications

New template types (using existing EmailService):

| Template | Trigger |
|----------|---------|
| `irb_submission_received` | Submission confirmed |
| `irb_triage_returned` | Coordinator returns for fixes |
| `irb_review_assigned` | Reviewer assigned to submission |
| `irb_review_reminder` | Review overdue |
| `irb_decision_issued` | Decision sent to submitter |
| `irb_revision_submitted` | Revised submission arrives |
| `irb_escalated` | Research council escalates |

New template variables: `{{board_name}}`, `{{submission_type}}`, `{{decision}}`, `{{reviewer_name}}`, `{{deadline_date}}`, `{{escalation_source}}`.

## Plan Gating

| Feature | Free | Starter | Team | Institution |
|---------|------|---------|------|-------------|
| IRB module access | - | - | 1 board (enterprise IRB only) | Unlimited boards |
| Research councils | - | - | - | 1 per institution |
| Question conditionals | - | - | Yes | Yes |
| AI summarization | - | - | - | Yes |
| AI question pre-fill | - | - | - | Yes |
| AI config (provider) | - | - | - | Yes |

## RLS & Security

All `irb_*` tables include `enterprise_id` and receive RLS policies in the migration:

```sql
CREATE POLICY tenant_isolation_{table} ON {table}
USING (enterprise_id = NULLIF(current_setting('app.current_enterprise_id', true), '')::uuid)
```

Board membership checked at the application layer for role-based access within a tenant.
