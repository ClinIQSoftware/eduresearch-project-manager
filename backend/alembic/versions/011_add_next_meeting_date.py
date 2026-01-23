"""Add next_meeting_date field to projects

Revision ID: 011
Revises: 010_add_end_date
Create Date: 2026-01-12

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "011"
down_revision = "010_add_end_date"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add next_meeting_date column to projects table
    op.add_column("projects", sa.Column("next_meeting_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "next_meeting_date")
