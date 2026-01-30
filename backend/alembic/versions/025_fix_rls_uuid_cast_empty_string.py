"""Fix RLS policy UUID cast on empty string.

PostgreSQL does not short-circuit OR clauses, so
  enterprise_id = current_setting(...)::uuid
crashes with InvalidTextRepresentation when the setting is '' (empty string).
Use NULLIF to convert '' to NULL before casting, which avoids the error.

Revision ID: 025
Revises: 024
Create Date: 2026-01-30
"""

from typing import Sequence, Union
from alembic import op

revision: str = "025"
down_revision: Union[str, None] = "024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_users ON users")
    op.execute("""
        CREATE POLICY tenant_isolation_users ON users
        USING (
            current_setting('app.current_enterprise_id', true) IS NULL
            OR current_setting('app.current_enterprise_id', true) = ''
            OR enterprise_id IS NULL
            OR enterprise_id = NULLIF(current_setting('app.current_enterprise_id', true), '')::uuid
        )
    """)


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_users ON users")
    op.execute("""
        CREATE POLICY tenant_isolation_users ON users
        USING (
            current_setting('app.current_enterprise_id', true) IS NULL
            OR current_setting('app.current_enterprise_id', true) = ''
            OR enterprise_id IS NULL
            OR enterprise_id = current_setting('app.current_enterprise_id', true)::uuid
        )
    """)
