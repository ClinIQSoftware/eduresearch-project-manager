"""IRB (Institutional Review Board) models for EduResearch Project Manager."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


# ---------------------------------------------------------------------------
# 1. IrbBoard
# ---------------------------------------------------------------------------

class IrbBoard(Base):
    """Represents an IRB board within an enterprise."""

    __tablename__ = "irb_boards"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    institution_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    board_type: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )

    # Relationships
    members: Mapped[List["IrbBoardMember"]] = relationship(
        "IrbBoardMember", back_populates="board", cascade="all, delete-orphan"
    )
    submissions: Mapped[List["IrbSubmission"]] = relationship(
        "IrbSubmission", back_populates="board", cascade="all, delete-orphan"
    )
    sections: Mapped[List["IrbQuestionSection"]] = relationship(
        "IrbQuestionSection", back_populates="board", cascade="all, delete-orphan"
    )
    questions: Mapped[List["IrbQuestion"]] = relationship(
        "IrbQuestion", back_populates="board", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# 2. IrbBoardMember
# ---------------------------------------------------------------------------

class IrbBoardMember(Base):
    """Represents a member of an IRB board."""

    __tablename__ = "irb_board_members"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    board_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("irb_boards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    assigned_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )

    # Relationships
    board: Mapped["IrbBoard"] = relationship(
        "IrbBoard", back_populates="members"
    )
    user: Mapped["User"] = relationship("User")


# ---------------------------------------------------------------------------
# 3. IrbSubmission
# ---------------------------------------------------------------------------

class IrbSubmission(Base):
    """Represents an IRB submission for a project."""

    __tablename__ = "irb_submissions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    board_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("irb_boards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    submitted_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    submission_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    revision_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    protocol_file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_summary_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    escalated_from_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("irb_submissions.id", ondelete="SET NULL"),
        nullable=True,
    )
    version: Mapped[int] = mapped_column(Integer, default=1)
    main_reviewer_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )

    # Relationships
    board: Mapped["IrbBoard"] = relationship(
        "IrbBoard", back_populates="submissions"
    )
    project: Mapped["Project"] = relationship("Project")
    submitted_by: Mapped["User"] = relationship(
        "User", foreign_keys=[submitted_by_id]
    )
    main_reviewer: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[main_reviewer_id]
    )
    files: Mapped[List["IrbSubmissionFile"]] = relationship(
        "IrbSubmissionFile", back_populates="submission", cascade="all, delete-orphan"
    )
    responses: Mapped[List["IrbSubmissionResponse"]] = relationship(
        "IrbSubmissionResponse", back_populates="submission", cascade="all, delete-orphan"
    )
    reviews: Mapped[List["IrbReview"]] = relationship(
        "IrbReview", back_populates="submission", cascade="all, delete-orphan"
    )
    decision: Mapped[Optional["IrbDecision"]] = relationship(
        "IrbDecision", back_populates="submission", uselist=False,
        cascade="all, delete-orphan"
    )
    history: Mapped[List["IrbSubmissionHistory"]] = relationship(
        "IrbSubmissionHistory", back_populates="submission", cascade="all, delete-orphan"
    )
    escalated_from: Mapped[Optional["IrbSubmission"]] = relationship(
        "IrbSubmission", remote_side=[id]
    )


# ---------------------------------------------------------------------------
# 4. IrbSubmissionFile
# ---------------------------------------------------------------------------

class IrbSubmissionFile(Base):
    """Represents a file attached to an IRB submission."""

    __tablename__ = "irb_submission_files"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("irb_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )

    # Relationships
    submission: Mapped["IrbSubmission"] = relationship(
        "IrbSubmission", back_populates="files"
    )


# ---------------------------------------------------------------------------
# 5. IrbQuestionSection
# ---------------------------------------------------------------------------

class IrbQuestionSection(Base):
    """Represents a section grouping IRB questions."""

    __tablename__ = "irb_question_sections"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    board_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("irb_boards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relationships
    board: Mapped["IrbBoard"] = relationship(
        "IrbBoard", back_populates="sections"
    )
    questions: Mapped[List["IrbQuestion"]] = relationship(
        "IrbQuestion", back_populates="section", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# 6. IrbQuestion
# ---------------------------------------------------------------------------

class IrbQuestion(Base):
    """Represents a question on an IRB form."""

    __tablename__ = "irb_questions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    board_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("irb_boards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section_id: Mapped[int] = mapped_column(
        ForeignKey("irb_question_sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    text: Mapped[str] = mapped_column(String(1000), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    question_type: Mapped[str] = mapped_column(String(50), nullable=False)
    options: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    submission_type: Mapped[str] = mapped_column(String(50), default="both")
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )

    # Relationships
    board: Mapped["IrbBoard"] = relationship(
        "IrbBoard", back_populates="questions"
    )
    section: Mapped["IrbQuestionSection"] = relationship(
        "IrbQuestionSection", back_populates="questions"
    )
    conditions: Mapped[List["IrbQuestionCondition"]] = relationship(
        "IrbQuestionCondition",
        back_populates="question",
        foreign_keys="[IrbQuestionCondition.question_id]",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# 7. IrbQuestionCondition
# ---------------------------------------------------------------------------

class IrbQuestionCondition(Base):
    """Represents a conditional display rule for an IRB question."""

    __tablename__ = "irb_question_conditions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("irb_questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    depends_on_question_id: Mapped[int] = mapped_column(
        ForeignKey("irb_questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    operator: Mapped[str] = mapped_column(String(20), nullable=False)
    value: Mapped[str] = mapped_column(String(500), nullable=False)

    # Relationships
    question: Mapped["IrbQuestion"] = relationship(
        "IrbQuestion",
        back_populates="conditions",
        foreign_keys=[question_id],
    )
    depends_on: Mapped["IrbQuestion"] = relationship(
        "IrbQuestion",
        foreign_keys=[depends_on_question_id],
    )


# ---------------------------------------------------------------------------
# 8. IrbSubmissionResponse
# ---------------------------------------------------------------------------

class IrbSubmissionResponse(Base):
    """Represents an answer to an IRB question within a submission."""

    __tablename__ = "irb_submission_responses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("irb_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("irb_questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_prefilled: Mapped[bool] = mapped_column(Boolean, default=False)
    user_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    submission: Mapped["IrbSubmission"] = relationship(
        "IrbSubmission", back_populates="responses"
    )
    question: Mapped["IrbQuestion"] = relationship("IrbQuestion")


# ---------------------------------------------------------------------------
# 9. IrbReview
# ---------------------------------------------------------------------------

class IrbReview(Base):
    """Represents a review of an IRB submission by a board member."""

    __tablename__ = "irb_reviews"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("irb_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reviewer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    recommendation: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    feedback_to_submitter: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )

    # Relationships
    submission: Mapped["IrbSubmission"] = relationship(
        "IrbSubmission", back_populates="reviews"
    )
    reviewer: Mapped["User"] = relationship("User")


# ---------------------------------------------------------------------------
# 10. IrbDecision
# ---------------------------------------------------------------------------

class IrbDecision(Base):
    """Represents the final decision on an IRB submission."""

    __tablename__ = "irb_decisions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("irb_submissions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    decided_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    decision: Mapped[str] = mapped_column(String(50), nullable=False)
    rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    letter: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decided_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )

    # Relationships
    submission: Mapped["IrbSubmission"] = relationship(
        "IrbSubmission", back_populates="decision"
    )
    decided_by: Mapped["User"] = relationship("User")


# ---------------------------------------------------------------------------
# 11. IrbSubmissionHistory
# ---------------------------------------------------------------------------

class IrbSubmissionHistory(Base):
    """Represents a status change in the submission workflow."""

    __tablename__ = "irb_submission_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("irb_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_status: Mapped[str] = mapped_column(String(30), nullable=False)
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now()
    )

    # Relationships
    submission: Mapped["IrbSubmission"] = relationship(
        "IrbSubmission", back_populates="history"
    )
    changed_by: Mapped["User"] = relationship("User")


# ---------------------------------------------------------------------------
# 12. IrbAiConfig
# ---------------------------------------------------------------------------

class IrbAiConfig(Base):
    """Represents AI configuration for an enterprise's IRB module."""

    __tablename__ = "irb_ai_configs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    enterprise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    api_key_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    custom_endpoint: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    max_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        default=func.now(), server_default=func.now(), onupdate=func.now()
    )
