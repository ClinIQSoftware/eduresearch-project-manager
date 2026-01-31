"""Fix RLS policies that crash when app.current_enterprise_id is unset.

Several tables still use the old-style RLS policy that casts
current_setting('app.current_enterprise_id')::uuid directly, which
crashes with InvalidTextRepresentation when the setting is '' (empty
string). This breaks the platform admin dashboard's cross-tenant
count queries.

Update all affected tables to use the same pattern as the users table:
- Allow access when setting is NULL or empty (platform admin / unscoped)
- Scope to matching enterprise_id when setting has a UUID value

Affected tables: departments, institutions, join_requests,
project_files, project_members, projects, tasks,
user_alert_preferences, user_keywords.

Revision ID: 029
Revises: 028
Create Date: 2026-01-31
"""

from typing import Sequence, Union
from alembic import op

revision: str = "029"
down_revision: Union[str, None] = "028"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tables with the broken RLS policy pattern
TABLES = [
    "departments",
    "institutions",
    "join_requests",
    "project_files",
    "project_members",
    "projects",
    "tasks",
    "user_alert_preferences",
    "user_keywords",
]

SAFE_POLICY = """
    CREATE POLICY tenant_isolation_{table} ON {table}
    USING (
        current_setting('app.current_enterprise_id', true) IS NULL
        OR current_setting('app.current_enterprise_id', true) = ''
        OR enterprise_id = NULLIF(current_setting('app.current_enterprise_id', true), '')::uuid
    )
"""

OLD_POLICY = """
    CREATE POLICY tenant_isolation_{table} ON {table}
    USING (
        enterprise_id = current_setting('app.current_enterprise_id', true)::uuid
    )
"""


def upgrade() -> None:
    for table in TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")
        op.execute(SAFE_POLICY.format(table=table))


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")
        op.execute(OLD_POLICY.format(table=table))
