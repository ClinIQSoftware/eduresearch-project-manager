"""Add irb_role to users, question_context to irb_questions, and irb_review_responses table.

Supports the IRB module restructure into three user tiers:
- Regular users (irb_role IS NULL): submit and track submissions
- IRB members (irb_role = 'member'): review assigned submissions
- IRB administrators (irb_role = 'admin'): manage boards, members, assignments

Also adds question_context to irb_questions so the same question system
can serve both submission questions ('submission') and review questions ('review').

Revision ID: 030
Revises: 029
Create Date: 2026-01-31
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "030"
down_revision: Union[str, None] = "029"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add irb_role column to users
    op.add_column("users", sa.Column("irb_role", sa.String(20), nullable=True))

    # 2. Add question_context column to irb_questions
    op.add_column(
        "irb_questions",
        sa.Column(
            "question_context",
            sa.String(20),
            nullable=False,
            server_default="submission",
        ),
    )

    # 3. Create irb_review_responses table
    op.create_table(
        "irb_review_responses",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "review_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("irb_reviews.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "question_id",
            sa.Integer(),
            sa.ForeignKey("irb_questions.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "enterprise_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("enterprises.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # 4. Enable RLS on irb_review_responses
    op.execute("ALTER TABLE irb_review_responses ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_irb_review_responses ON irb_review_responses
        USING (
            current_setting('app.current_enterprise_id', true) IS NULL
            OR current_setting('app.current_enterprise_id', true) = ''
            OR enterprise_id = NULLIF(current_setting('app.current_enterprise_id', true), '')::uuid
        )
    """)


def downgrade() -> None:
    # Drop RLS policy and table
    op.execute("DROP POLICY IF EXISTS tenant_isolation_irb_review_responses ON irb_review_responses")
    op.drop_table("irb_review_responses")

    # Remove question_context column
    op.drop_column("irb_questions", "question_context")

    # Remove irb_role column
    op.drop_column("users", "irb_role")
