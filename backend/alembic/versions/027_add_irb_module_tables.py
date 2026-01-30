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
        sa.Column("board_type", sa.String(20), nullable=False),
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
        sa.Column("role", sa.String(30), nullable=False),
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
        sa.Column("submission_type", sa.String(20), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("revision_type", sa.String(20), nullable=True),
        sa.Column("protocol_file_url", sa.String(500), nullable=True),
        sa.Column("ai_summary", sa.Text, nullable=True),
        sa.Column("ai_summary_approved", sa.Boolean, server_default=sa.text("false"), nullable=False),
        sa.Column("escalated_from_id", UUID(as_uuid=True), sa.ForeignKey("irb_submissions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("version", sa.Integer, server_default=sa.text("1"), nullable=False),
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
        sa.Column("file_type", sa.String(30), nullable=False),
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
        sa.Column("order", sa.Integer, nullable=False, server_default=sa.text("0")),
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
        sa.Column("question_type", sa.String(20), nullable=False),
        sa.Column("options", JSONB, nullable=True),
        sa.Column("required", sa.Boolean, server_default=sa.text("false"), nullable=False),
        sa.Column("order", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true"), nullable=False),
        sa.Column("submission_type", sa.String(20), nullable=False, server_default="both"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )

    # --- irb_question_conditions ---
    op.create_table(
        "irb_question_conditions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("question_id", sa.Integer, sa.ForeignKey("irb_questions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("depends_on_question_id", sa.Integer, sa.ForeignKey("irb_questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("enterprise_id", UUID(as_uuid=True), sa.ForeignKey("enterprises.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("operator", sa.String(20), nullable=False),
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
        sa.Column("ai_prefilled", sa.Boolean, server_default=sa.text("false"), nullable=False),
        sa.Column("user_confirmed", sa.Boolean, server_default=sa.text("false"), nullable=False),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
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
        sa.Column("recommendation", sa.String(20), nullable=True),
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
        sa.Column("decision", sa.String(20), nullable=False),
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
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("api_key_encrypted", sa.Text, nullable=False),
        sa.Column("model_name", sa.String(100), nullable=False),
        sa.Column("custom_endpoint", sa.String(500), nullable=True),
        sa.Column("max_tokens", sa.Integer, server_default=sa.text("4096"), nullable=False),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true"), nullable=False),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
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
