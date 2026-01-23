"""Add departments table and update users

Revision ID: 004
Revises: 003
Create Date: 2025-01-09 00:00:00.000000

This migration:
1. Creates 'departments' table
2. Adds 'department_id' foreign key to users
3. Drops 'institution' text column from users (replaced by institution_id FK)
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Create departments table
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(1000), nullable=True),
        sa.Column(
            "institution_id",
            sa.Integer(),
            sa.ForeignKey("institutions.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    # Step 2: Add department_id column to users
    op.add_column("users", sa.Column("department_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "users_department_id_fkey", "users", "departments", ["department_id"], ["id"]
    )

    # Step 3: Drop the institution text column from users
    # This column was added in migration 003 but is no longer needed
    # since we use institution_id foreign key instead
    op.drop_column("users", "institution")


def downgrade() -> None:
    # Step 1: Add back the institution text column
    op.add_column("users", sa.Column("institution", sa.String(255), nullable=True))

    # Step 2: Drop department_id from users
    op.drop_constraint("users_department_id_fkey", "users", type_="foreignkey")
    op.drop_column("users", "department_id")

    # Step 3: Drop departments table
    op.drop_table("departments")
