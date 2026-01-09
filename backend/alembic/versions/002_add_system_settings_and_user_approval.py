"""Add system settings and user approval fields

Revision ID: 002
Revises: 001
Create Date: 2024-01-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create system_settings table
    op.create_table(
        'system_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('require_registration_approval', sa.Boolean(), nullable=True, default=False),
        sa.Column('registration_approval_mode', sa.String(50), nullable=True, default='block'),
        sa.Column('min_password_length', sa.Integer(), nullable=True, default=8),
        sa.Column('require_uppercase', sa.Boolean(), nullable=True, default=True),
        sa.Column('require_lowercase', sa.Boolean(), nullable=True, default=True),
        sa.Column('require_numbers', sa.Boolean(), nullable=True, default=True),
        sa.Column('require_special_chars', sa.Boolean(), nullable=True, default=False),
        sa.Column('session_timeout_minutes', sa.Integer(), nullable=True, default=30),
        sa.Column('google_oauth_enabled', sa.Boolean(), nullable=True, default=True),
        sa.Column('microsoft_oauth_enabled', sa.Boolean(), nullable=True, default=True),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id')
    )
    op.create_index(op.f('ix_system_settings_id'), 'system_settings', ['id'], unique=False)

    # Add user approval fields to users table
    op.add_column('users', sa.Column('is_approved', sa.Boolean(), nullable=True, default=True))
    op.add_column('users', sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('approved_by_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_users_approved_by', 'users', 'users', ['approved_by_id'], ['id'])

    # Set all existing users as approved
    op.execute("UPDATE users SET is_approved = true WHERE is_approved IS NULL")

    # Insert default global system settings
    op.execute("""
        INSERT INTO system_settings (
            require_registration_approval, registration_approval_mode,
            min_password_length, require_uppercase, require_lowercase,
            require_numbers, require_special_chars, session_timeout_minutes,
            google_oauth_enabled, microsoft_oauth_enabled, organization_id
        ) VALUES (
            false, 'block', 8, true, true, true, false, 30, true, true, NULL
        )
    """)


def downgrade() -> None:
    # Remove foreign key and columns from users
    op.drop_constraint('fk_users_approved_by', 'users', type_='foreignkey')
    op.drop_column('users', 'approved_by_id')
    op.drop_column('users', 'approved_at')
    op.drop_column('users', 'is_approved')

    # Drop system_settings table
    op.drop_index(op.f('ix_system_settings_id'), table_name='system_settings')
    op.drop_table('system_settings')
