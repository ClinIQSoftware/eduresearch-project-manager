"""Initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    authprovider_enum = sa.Enum('local', 'google', 'microsoft', name='authprovider')
    projectclassification_enum = sa.Enum('education', 'research', 'quality_improvement', 'administrative', name='projectclassification')
    projectstatus_enum = sa.Enum('preparation', 'recruitment', 'analysis', 'writing', name='projectstatus')
    memberrole_enum = sa.Enum('lead', 'participant', name='memberrole')
    requeststatus_enum = sa.Enum('pending', 'approved', 'rejected', name='requeststatus')
    taskstatus_enum = sa.Enum('todo', 'in_progress', 'completed', name='taskstatus')
    taskpriority_enum = sa.Enum('low', 'medium', 'high', name='taskpriority')

    # Create organizations table
    op.create_table(
        'organizations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.String(1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organizations_id'), 'organizations', ['id'], unique=False)

    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('department', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('bio', sa.String(2000), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('is_superuser', sa.Boolean(), nullable=True, default=False),
        sa.Column('auth_provider', authprovider_enum, nullable=True, default='local'),
        sa.Column('oauth_id', sa.String(255), nullable=True),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Create organization_admins junction table
    op.create_table(
        'organization_admins',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('user_id', 'organization_id')
    )

    # Create projects table
    op.create_table(
        'projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.String(2000), nullable=True),
        sa.Column('color', sa.String(7), nullable=True, default='#3B82F6'),
        sa.Column('classification', projectclassification_enum, nullable=True, default='research'),
        sa.Column('status', projectstatus_enum, nullable=True, default='preparation'),
        sa.Column('open_to_participants', sa.Boolean(), nullable=True, default=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('last_status_change', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('lead_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['lead_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_projects_id'), 'projects', ['id'], unique=False)

    # Create project_members table
    op.create_table(
        'project_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', memberrole_enum, nullable=True, default='participant'),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_members_id'), 'project_members', ['id'], unique=False)

    # Create join_requests table
    op.create_table(
        'join_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('message', sa.String(1000), nullable=True),
        sa.Column('status', requeststatus_enum, nullable=True, default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_join_requests_id'), 'join_requests', ['id'], unique=False)

    # Create project_files table
    op.create_table(
        'project_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('uploaded_by_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('content_type', sa.String(100), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_files_id'), 'project_files', ['id'], unique=False)

    # Create email_settings table
    op.create_table(
        'email_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('smtp_host', sa.String(255), nullable=True, default='smtp.gmail.com'),
        sa.Column('smtp_port', sa.Integer(), nullable=True, default=587),
        sa.Column('smtp_user', sa.String(255), nullable=True),
        sa.Column('smtp_password', sa.String(255), nullable=True),
        sa.Column('from_email', sa.String(255), nullable=True),
        sa.Column('from_name', sa.String(255), nullable=True, default='EduResearch Project Manager'),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id')
    )
    op.create_index(op.f('ix_email_settings_id'), 'email_settings', ['id'], unique=False)

    # Create tasks table
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.String(2000), nullable=True),
        sa.Column('status', taskstatus_enum, nullable=True, default='todo'),
        sa.Column('priority', taskpriority_enum, nullable=True, default='medium'),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tasks_id'), 'tasks', ['id'], unique=False)

    # Create time_entries table
    op.create_table(
        'time_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=True),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration', sa.Float(), nullable=True),
        sa.Column('notes', sa.String(1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_time_entries_id'), 'time_entries', ['id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_time_entries_id'), table_name='time_entries')
    op.drop_table('time_entries')

    op.drop_index(op.f('ix_tasks_id'), table_name='tasks')
    op.drop_table('tasks')

    op.drop_index(op.f('ix_email_settings_id'), table_name='email_settings')
    op.drop_table('email_settings')

    op.drop_index(op.f('ix_project_files_id'), table_name='project_files')
    op.drop_table('project_files')

    op.drop_index(op.f('ix_join_requests_id'), table_name='join_requests')
    op.drop_table('join_requests')

    op.drop_index(op.f('ix_project_members_id'), table_name='project_members')
    op.drop_table('project_members')

    op.drop_index(op.f('ix_projects_id'), table_name='projects')
    op.drop_table('projects')

    op.drop_table('organization_admins')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')

    op.drop_index(op.f('ix_organizations_id'), table_name='organizations')
    op.drop_table('organizations')

    # Drop enum types
    sa.Enum(name='taskpriority').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='taskstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='requeststatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='memberrole').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='projectstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='projectclassification').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='authprovider').drop(op.get_bind(), checkfirst=True)
