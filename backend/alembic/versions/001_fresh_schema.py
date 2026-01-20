"""Fresh schema for EduResearch Project Manager

Revision ID: 001_fresh_schema
Revises:
Create Date: 2025-01-15 00:00:00.000000

This is the initial migration that creates all tables for the clean schema.
It replaces all previous migrations with a consolidated, fresh start.

Tables created:
1. institutions
2. departments
3. users
4. institution_admins
5. projects
6. project_members
7. tasks
8. join_requests
9. project_files
10. email_settings
11. system_settings
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_fresh_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ==========================================================================
    # 1. INSTITUTIONS TABLE
    # ==========================================================================
    op.create_table(
        'institutions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.String(1000), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_institutions_id'), 'institutions', ['id'], unique=False)

    # ==========================================================================
    # 2. DEPARTMENTS TABLE
    # ==========================================================================
    op.create_table(
        'departments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('institution_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.String(1000), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['institution_id'], ['institutions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_departments_id'), 'departments', ['id'], unique=False)
    op.create_index(op.f('ix_departments_institution_id'), 'departments', ['institution_id'], unique=False)

    # ==========================================================================
    # 3. USERS TABLE
    # ==========================================================================
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=True),  # Nullable for OAuth users
        sa.Column('first_name', sa.String(255), nullable=False),
        sa.Column('last_name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('bio', sa.String(2000), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('is_superuser', sa.Boolean(), nullable=False, server_default='0'),
        # Approval fields
        sa.Column('is_approved', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('approved_by_id', sa.Integer(), nullable=True),
        # Authentication provider
        sa.Column('auth_provider', sa.String(20), nullable=False, server_default='local'),  # 'local', 'google', 'microsoft'
        sa.Column('oauth_id', sa.String(255), nullable=True),
        # Institution and Department
        sa.Column('institution_id', sa.Integer(), nullable=True),
        sa.Column('department_id', sa.Integer(), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        # Constraints
        sa.ForeignKeyConstraint(['approved_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['institution_id'], ['institutions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_approved_by_id'), 'users', ['approved_by_id'], unique=False)
    op.create_index(op.f('ix_users_institution_id'), 'users', ['institution_id'], unique=False)
    op.create_index(op.f('ix_users_department_id'), 'users', ['department_id'], unique=False)

    # ==========================================================================
    # 4. INSTITUTION_ADMINS TABLE (association table)
    # ==========================================================================
    op.create_table(
        'institution_admins',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('institution_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['institution_id'], ['institutions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'institution_id')
    )

    # ==========================================================================
    # 5. PROJECTS TABLE
    # ==========================================================================
    op.create_table(
        'projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.String(2000), nullable=True),
        sa.Column('color', sa.String(7), nullable=False, server_default='#3B82F6'),
        # Classification and status
        sa.Column('classification', sa.String(30), nullable=False, server_default='research'),  # 'research', 'education', 'quality_improvement', 'administrative'
        sa.Column('status', sa.String(20), nullable=False, server_default='preparation'),  # 'preparation', 'recruitment', 'analysis', 'writing'
        sa.Column('open_to_participants', sa.Boolean(), nullable=False, server_default='1'),
        # Dates
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('next_meeting_date', sa.Date(), nullable=True),
        sa.Column('last_status_change', sa.DateTime(), nullable=True),
        # Foreign keys
        sa.Column('institution_id', sa.Integer(), nullable=True),
        sa.Column('department_id', sa.Integer(), nullable=True),
        sa.Column('lead_id', sa.Integer(), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        # Constraints
        sa.ForeignKeyConstraint(['institution_id'], ['institutions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['lead_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_projects_id'), 'projects', ['id'], unique=False)
    op.create_index(op.f('ix_projects_institution_id'), 'projects', ['institution_id'], unique=False)
    op.create_index(op.f('ix_projects_department_id'), 'projects', ['department_id'], unique=False)
    op.create_index(op.f('ix_projects_lead_id'), 'projects', ['lead_id'], unique=False)

    # ==========================================================================
    # 6. PROJECT_MEMBERS TABLE
    # ==========================================================================
    op.create_table(
        'project_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(20), nullable=False, server_default='participant'),  # 'lead' or 'participant'
        sa.Column('joined_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        # Constraints
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', 'user_id', name='uq_project_member')
    )
    op.create_index(op.f('ix_project_members_id'), 'project_members', ['id'], unique=False)
    op.create_index(op.f('ix_project_members_project_id'), 'project_members', ['project_id'], unique=False)
    op.create_index(op.f('ix_project_members_user_id'), 'project_members', ['user_id'], unique=False)

    # ==========================================================================
    # 7. TASKS TABLE
    # ==========================================================================
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.String(2000), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='todo'),  # 'todo', 'in_progress', 'completed'
        sa.Column('priority', sa.String(10), nullable=False, server_default='medium'),  # 'low', 'medium', 'high'
        sa.Column('due_date', sa.Date(), nullable=True),
        # Foreign keys
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        # Constraints
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tasks_id'), 'tasks', ['id'], unique=False)
    op.create_index(op.f('ix_tasks_project_id'), 'tasks', ['project_id'], unique=False)
    op.create_index(op.f('ix_tasks_assigned_to_id'), 'tasks', ['assigned_to_id'], unique=False)
    op.create_index(op.f('ix_tasks_created_by_id'), 'tasks', ['created_by_id'], unique=False)

    # ==========================================================================
    # 8. JOIN_REQUESTS TABLE
    # ==========================================================================
    op.create_table(
        'join_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('message', sa.String(1000), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),  # 'pending', 'approved', 'rejected'
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('responded_at', sa.DateTime(), nullable=True),
        # Constraints
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', 'user_id', name='uq_join_request')
    )
    op.create_index(op.f('ix_join_requests_id'), 'join_requests', ['id'], unique=False)
    op.create_index(op.f('ix_join_requests_project_id'), 'join_requests', ['project_id'], unique=False)
    op.create_index(op.f('ix_join_requests_user_id'), 'join_requests', ['user_id'], unique=False)

    # ==========================================================================
    # 9. PROJECT_FILES TABLE
    # ==========================================================================
    op.create_table(
        'project_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('uploaded_by_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),  # Stored filename (UUID)
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('content_type', sa.String(100), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        # Constraints
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_files_id'), 'project_files', ['id'], unique=False)
    op.create_index(op.f('ix_project_files_project_id'), 'project_files', ['project_id'], unique=False)
    op.create_index(op.f('ix_project_files_uploaded_by_id'), 'project_files', ['uploaded_by_id'], unique=False)

    # ==========================================================================
    # 10. EMAIL_SETTINGS TABLE
    # ==========================================================================
    op.create_table(
        'email_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('institution_id', sa.Integer(), nullable=True),  # NULL for global settings
        sa.Column('smtp_host', sa.String(255), nullable=False, server_default='smtp.gmail.com'),
        sa.Column('smtp_port', sa.Integer(), nullable=False, server_default='587'),
        sa.Column('smtp_user', sa.String(255), nullable=True),
        sa.Column('smtp_password', sa.String(255), nullable=True),  # Should be encrypted in production
        sa.Column('from_email', sa.String(255), nullable=True),
        sa.Column('from_name', sa.String(255), nullable=False, server_default='EduResearch Project Manager'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        # Constraints
        sa.ForeignKeyConstraint(['institution_id'], ['institutions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('institution_id', name='uq_email_settings_institution')
    )
    op.create_index(op.f('ix_email_settings_id'), 'email_settings', ['id'], unique=False)
    op.create_index(op.f('ix_email_settings_institution_id'), 'email_settings', ['institution_id'], unique=False)

    # ==========================================================================
    # 11. SYSTEM_SETTINGS TABLE
    # ==========================================================================
    op.create_table(
        'system_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('institution_id', sa.Integer(), nullable=True),  # NULL for global settings
        # Registration Settings
        sa.Column('require_registration_approval', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('registration_approval_mode', sa.String(20), nullable=False, server_default='block'),  # 'block' or 'limited'
        # Password Policy
        sa.Column('min_password_length', sa.Integer(), nullable=False, server_default='8'),
        sa.Column('require_uppercase', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('require_lowercase', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('require_numbers', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('require_special_chars', sa.Boolean(), nullable=False, server_default='0'),
        # Session Settings
        sa.Column('session_timeout_minutes', sa.Integer(), nullable=False, server_default='30'),
        # OAuth Settings
        sa.Column('google_oauth_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('microsoft_oauth_enabled', sa.Boolean(), nullable=False, server_default='1'),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        # Constraints
        sa.ForeignKeyConstraint(['institution_id'], ['institutions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('institution_id', name='uq_system_settings_institution')
    )
    op.create_index(op.f('ix_system_settings_id'), 'system_settings', ['id'], unique=False)
    op.create_index(op.f('ix_system_settings_institution_id'), 'system_settings', ['institution_id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order of creation (respecting foreign key dependencies)

    # 11. system_settings
    op.drop_index(op.f('ix_system_settings_institution_id'), table_name='system_settings')
    op.drop_index(op.f('ix_system_settings_id'), table_name='system_settings')
    op.drop_table('system_settings')

    # 10. email_settings
    op.drop_index(op.f('ix_email_settings_institution_id'), table_name='email_settings')
    op.drop_index(op.f('ix_email_settings_id'), table_name='email_settings')
    op.drop_table('email_settings')

    # 9. project_files
    op.drop_index(op.f('ix_project_files_uploaded_by_id'), table_name='project_files')
    op.drop_index(op.f('ix_project_files_project_id'), table_name='project_files')
    op.drop_index(op.f('ix_project_files_id'), table_name='project_files')
    op.drop_table('project_files')

    # 8. join_requests
    op.drop_index(op.f('ix_join_requests_user_id'), table_name='join_requests')
    op.drop_index(op.f('ix_join_requests_project_id'), table_name='join_requests')
    op.drop_index(op.f('ix_join_requests_id'), table_name='join_requests')
    op.drop_table('join_requests')

    # 7. tasks
    op.drop_index(op.f('ix_tasks_created_by_id'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_assigned_to_id'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_project_id'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_id'), table_name='tasks')
    op.drop_table('tasks')

    # 6. project_members
    op.drop_index(op.f('ix_project_members_user_id'), table_name='project_members')
    op.drop_index(op.f('ix_project_members_project_id'), table_name='project_members')
    op.drop_index(op.f('ix_project_members_id'), table_name='project_members')
    op.drop_table('project_members')

    # 5. projects
    op.drop_index(op.f('ix_projects_lead_id'), table_name='projects')
    op.drop_index(op.f('ix_projects_department_id'), table_name='projects')
    op.drop_index(op.f('ix_projects_institution_id'), table_name='projects')
    op.drop_index(op.f('ix_projects_id'), table_name='projects')
    op.drop_table('projects')

    # 4. institution_admins
    op.drop_table('institution_admins')

    # 3. users
    op.drop_index(op.f('ix_users_department_id'), table_name='users')
    op.drop_index(op.f('ix_users_institution_id'), table_name='users')
    op.drop_index(op.f('ix_users_approved_by_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')

    # 2. departments
    op.drop_index(op.f('ix_departments_institution_id'), table_name='departments')
    op.drop_index(op.f('ix_departments_id'), table_name='departments')
    op.drop_table('departments')

    # 1. institutions
    op.drop_index(op.f('ix_institutions_id'), table_name='institutions')
    op.drop_table('institutions')
