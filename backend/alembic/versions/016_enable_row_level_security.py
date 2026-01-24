"""Enable Row-Level Security on tenant tables.

Revision ID: 016
Revises: 015
Create Date: 2026-01-23
"""

from typing import Sequence, Union
from alembic import op

revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

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


def upgrade() -> None:
    # Enable RLS and create policies for each table
    for table in TENANT_TABLES:
        # Enable RLS
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")

        # Create policy for tenant isolation
        op.execute(f"""
            CREATE POLICY tenant_isolation_{table} ON {table}
            USING (enterprise_id = current_setting('app.current_enterprise_id', true)::uuid)
        """)

        # Allow the policy to apply to the table owner as well
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")


def downgrade() -> None:
    for table in TENANT_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
