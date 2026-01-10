"""Add task assignment fields

Revision ID: 005
Revises: 004
Create Date: 2025-01-09

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    # Add assigned_to_id and created_by_id to tasks table
    op.add_column('tasks', sa.Column('assigned_to_id', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('created_by_id', sa.Integer(), nullable=True))

    # Add foreign key constraints
    op.create_foreign_key(
        'fk_tasks_assigned_to_id_users',
        'tasks', 'users',
        ['assigned_to_id'], ['id']
    )
    op.create_foreign_key(
        'fk_tasks_created_by_id_users',
        'tasks', 'users',
        ['created_by_id'], ['id']
    )


def downgrade():
    # Remove foreign key constraints
    op.drop_constraint('fk_tasks_assigned_to_id_users', 'tasks', type_='foreignkey')
    op.drop_constraint('fk_tasks_created_by_id_users', 'tasks', type_='foreignkey')

    # Remove columns
    op.drop_column('tasks', 'assigned_to_id')
    op.drop_column('tasks', 'created_by_id')
