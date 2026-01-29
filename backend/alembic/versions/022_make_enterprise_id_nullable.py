"""Make users.enterprise_id nullable for two-step registration.

Users can now register without an enterprise and complete onboarding
(create or join a team) after account creation.

Revision ID: 022
Revises: 021
Create Date: 2026-01-29
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "users",
        "enterprise_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )


def downgrade() -> None:
    # Delete any users without enterprise_id before making it non-nullable
    op.execute("DELETE FROM users WHERE enterprise_id IS NULL")
    op.alter_column(
        "users",
        "enterprise_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
