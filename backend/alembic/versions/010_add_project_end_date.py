"""Add end_date field to projects

Revision ID: 010_add_end_date
Revises: 009_add_keyword_tracking
Create Date: 2026-01-12

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '010_add_end_date'
down_revision = '009_add_keyword_tracking'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add end_date column to projects table
    op.add_column('projects', sa.Column('end_date', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('projects', 'end_date')
