"""Rename organization to institution and split user name

Revision ID: 003
Revises: 002
Create Date: 2025-01-09 00:00:00.000000

This migration:
1. Renames 'organizations' table to 'institutions'
2. Splits user 'name' column into 'first_name' and 'last_name'
3. Adds 'institution' text field to users for affiliation
4. Renames 'organization_id' to 'institution_id' in users, projects, system_settings
5. Updates the organization_admins table foreign key
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Rename organizations table to institutions
    op.rename_table('organizations', 'institutions')

    # Step 2: Add first_name and last_name columns to users
    op.add_column('users', sa.Column('first_name', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('institution', sa.String(255), nullable=True))

    # Step 3: Migrate data from name to first_name and last_name
    # Split name by first space - first part is first_name, rest is last_name
    op.execute("""
        UPDATE users
        SET first_name = SPLIT_PART(name, ' ', 1),
            last_name = CASE
                WHEN POSITION(' ' IN name) > 0
                THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
                ELSE ''
            END
    """)

    # Step 4: Make first_name and last_name non-nullable now that data is migrated
    op.alter_column('users', 'first_name', nullable=False)
    op.alter_column('users', 'last_name', nullable=False)

    # Step 5: Drop the old name column
    op.drop_column('users', 'name')

    # Step 6: Rename organization_id columns to institution_id
    # First, drop foreign keys
    op.drop_constraint('users_organization_id_fkey', 'users', type_='foreignkey')
    op.drop_constraint('projects_organization_id_fkey', 'projects', type_='foreignkey')
    op.drop_constraint('system_settings_organization_id_fkey', 'system_settings', type_='foreignkey')

    # Rename the columns
    op.alter_column('users', 'organization_id', new_column_name='institution_id')
    op.alter_column('projects', 'organization_id', new_column_name='institution_id')
    op.alter_column('system_settings', 'organization_id', new_column_name='institution_id')

    # Recreate foreign keys pointing to institutions table
    op.create_foreign_key('users_institution_id_fkey', 'users', 'institutions', ['institution_id'], ['id'])
    op.create_foreign_key('projects_institution_id_fkey', 'projects', 'institutions', ['institution_id'], ['id'])
    op.create_foreign_key('system_settings_institution_id_fkey', 'system_settings', 'institutions', ['institution_id'], ['id'])

    # Step 7: Update organization_admins table foreign key
    # The table keeps its name for compatibility, but points to institutions
    op.drop_constraint('organization_admins_organization_id_fkey', 'organization_admins', type_='foreignkey')
    op.create_foreign_key('organization_admins_organization_id_fkey', 'organization_admins', 'institutions', ['organization_id'], ['id'])


def downgrade() -> None:
    # Reverse all changes

    # Step 1: Update organization_admins table foreign key back
    op.drop_constraint('organization_admins_organization_id_fkey', 'organization_admins', type_='foreignkey')

    # Step 2: Rename institution_id back to organization_id
    op.drop_constraint('users_institution_id_fkey', 'users', type_='foreignkey')
    op.drop_constraint('projects_institution_id_fkey', 'projects', type_='foreignkey')
    op.drop_constraint('system_settings_institution_id_fkey', 'system_settings', type_='foreignkey')

    op.alter_column('users', 'institution_id', new_column_name='organization_id')
    op.alter_column('projects', 'institution_id', new_column_name='organization_id')
    op.alter_column('system_settings', 'institution_id', new_column_name='organization_id')

    # Step 3: Rename institutions table back to organizations
    op.rename_table('institutions', 'organizations')

    # Step 4: Recreate foreign keys
    op.create_foreign_key('users_organization_id_fkey', 'users', 'organizations', ['organization_id'], ['id'])
    op.create_foreign_key('projects_organization_id_fkey', 'projects', 'organizations', ['organization_id'], ['id'])
    op.create_foreign_key('system_settings_organization_id_fkey', 'system_settings', 'organizations', ['organization_id'], ['id'])
    op.create_foreign_key('organization_admins_organization_id_fkey', 'organization_admins', 'organizations', ['organization_id'], ['id'])

    # Step 5: Add back name column
    op.add_column('users', sa.Column('name', sa.String(255), nullable=True))

    # Step 6: Migrate first_name + last_name back to name
    op.execute("""
        UPDATE users
        SET name = TRIM(CONCAT(first_name, ' ', last_name))
    """)

    op.alter_column('users', 'name', nullable=False)

    # Step 7: Drop new columns
    op.drop_column('users', 'institution')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
