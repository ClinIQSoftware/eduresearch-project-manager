"""Add email reminder settings to projects

Revision ID: 012
Revises: 011
Create Date: 2026-01-15

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add reminder settings columns to projects table
    op.add_column('projects', sa.Column('meeting_reminder_enabled', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('projects', sa.Column('meeting_reminder_days', sa.Integer(), nullable=True, server_default='1'))
    op.add_column('projects', sa.Column('deadline_reminder_enabled', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('projects', sa.Column('deadline_reminder_days', sa.Integer(), nullable=True, server_default='7'))
    op.add_column('projects', sa.Column('meeting_reminder_sent_date', sa.Date(), nullable=True))
    op.add_column('projects', sa.Column('deadline_reminder_sent_date', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('projects', 'deadline_reminder_sent_date')
    op.drop_column('projects', 'meeting_reminder_sent_date')
    op.drop_column('projects', 'deadline_reminder_days')
    op.drop_column('projects', 'deadline_reminder_enabled')
    op.drop_column('projects', 'meeting_reminder_days')
    op.drop_column('projects', 'meeting_reminder_enabled')
