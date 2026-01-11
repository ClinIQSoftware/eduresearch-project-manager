"""Add keyword tracking tables for user interest tracking and alerts

Revision ID: 009
Revises: 008
Create Date: 2026-01-11

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade():
    # Create user_keywords table
    op.create_table(
        'user_keywords',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('keyword', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_user_keywords_user_id', 'user_keywords', ['user_id'])
    op.create_index('idx_user_keywords_keyword', 'user_keywords', ['keyword'])
    op.create_unique_constraint('uq_user_keyword', 'user_keywords', ['user_id', 'keyword'])

    # Create user_alert_preferences table
    op.create_table(
        'user_alert_preferences',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('alert_frequency', sa.String(20), nullable=False, server_default='weekly'),
        sa.Column('dashboard_new_weeks', sa.Integer(), nullable=False, server_default='2'),
        sa.Column('last_alert_sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_alert_project_ids', ARRAY(sa.Integer()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_user_alert_preferences_user_id', 'user_alert_preferences', ['user_id'])
    op.create_index('idx_user_alert_preferences_frequency', 'user_alert_preferences', ['alert_frequency'])


def downgrade():
    op.drop_table('user_alert_preferences')
    op.drop_table('user_keywords')
