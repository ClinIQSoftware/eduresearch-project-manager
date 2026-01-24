"""Add enterprise_id to all tenant tables.

Revision ID: 015
Revises: 014
Create Date: 2026-01-23
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Default enterprise UUID for backfill
DEFAULT_ENTERPRISE_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

# Tables that need enterprise_id
TENANT_TABLES = [
    "users",
    "institutions",
    "departments",
    "projects",
    "tasks",
    "project_members",
    "project_files",
    "join_requests",
    "user_keywords",
    "user_alert_preferences",
]

# Tables with optional enterprise_id (already have institution_id)
OPTIONAL_TABLES = [
    "email_settings",
    "email_templates",
    "system_settings",
]


def upgrade() -> None:
    # Create default enterprise for existing data
    op.execute(
        f"""
        INSERT INTO enterprises (id, slug, name, is_active)
        VALUES ('{DEFAULT_ENTERPRISE_ID}', 'default', 'Default Enterprise', true)
        ON CONFLICT (id) DO NOTHING
        """
    )

    # Add enterprise_id to tenant tables (nullable first)
    for table in TENANT_TABLES:
        op.add_column(
            table,
            sa.Column("enterprise_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
        # Backfill existing data
        op.execute(f"UPDATE {table} SET enterprise_id = '{DEFAULT_ENTERPRISE_ID}'")
        # Make NOT NULL
        op.alter_column(table, "enterprise_id", nullable=False)
        # Add index
        op.create_index(f"ix_{table}_enterprise_id", table, ["enterprise_id"])
        # Add foreign key
        op.create_foreign_key(
            f"fk_{table}_enterprise_id",
            table,
            "enterprises",
            ["enterprise_id"],
            ["id"],
            ondelete="CASCADE",
        )

    # Add optional enterprise_id to settings tables
    for table in OPTIONAL_TABLES:
        op.add_column(
            table,
            sa.Column("enterprise_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
        op.create_index(f"ix_{table}_enterprise_id", table, ["enterprise_id"])


def downgrade() -> None:
    # Remove from optional tables
    for table in OPTIONAL_TABLES:
        op.drop_index(f"ix_{table}_enterprise_id", table_name=table)
        op.drop_column(table, "enterprise_id")

    # Remove from tenant tables
    for table in TENANT_TABLES:
        op.drop_constraint(f"fk_{table}_enterprise_id", table, type_="foreignkey")
        op.drop_index(f"ix_{table}_enterprise_id", table_name=table)
        op.drop_column(table, "enterprise_id")

    # Remove default enterprise
    op.execute(f"DELETE FROM enterprises WHERE id = '{DEFAULT_ENTERPRISE_ID}'")
