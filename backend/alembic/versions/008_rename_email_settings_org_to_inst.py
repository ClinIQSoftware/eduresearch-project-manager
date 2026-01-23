"""Rename email_settings organization_id to institution_id

Revision ID: 008
Revises: 007
Create Date: 2026-01-10

"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade():
    # Rename column organization_id to institution_id
    op.alter_column(
        "email_settings", "organization_id", new_column_name="institution_id"
    )

    # Note: The foreign key constraint may need to be recreated
    # if it was pointing to a non-existent 'organizations' table.
    # Since the column is nullable and we're just renaming, this should work.


def downgrade():
    op.alter_column(
        "email_settings", "institution_id", new_column_name="organization_id"
    )
