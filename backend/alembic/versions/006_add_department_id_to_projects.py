"""Add department_id to projects

Revision ID: 006
Revises: 005
Create Date: 2025-01-10

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    # Add department_id to projects table
    op.add_column('projects', sa.Column('department_id', sa.Integer(), nullable=True))

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_projects_department_id_departments',
        'projects', 'departments',
        ['department_id'], ['id']
    )


def downgrade():
    # Remove foreign key constraint
    op.drop_constraint('fk_projects_department_id_departments', 'projects', type_='foreignkey')

    # Remove column
    op.drop_column('projects', 'department_id')
