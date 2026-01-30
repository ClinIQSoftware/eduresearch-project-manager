"""Tighten RLS policy: remove enterprise_id IS NULL loophole.

The previous policy allowed rows with enterprise_id IS NULL to be visible
in ALL tenant-scoped queries. This leaked unassigned users (those who
registered but haven't completed onboarding) into every enterprise's
admin panel.

New policy:
- Unscoped sessions (setting NULL/empty): see all rows (needed for auth)
- Scoped sessions (setting has UUID): see ONLY matching enterprise_id rows

Revision ID: 026
Revises: 025
Create Date: 2026-01-29
"""

from typing import Sequence, Union
from alembic import op

revision: str = "026"
down_revision: Union[str, None] = "025"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tighten users RLS: when enterprise context is set, only show matching rows
    op.execute("DROP POLICY IF EXISTS tenant_isolation_users ON users")
    op.execute("""
        CREATE POLICY tenant_isolation_users ON users
        USING (
            current_setting('app.current_enterprise_id', true) IS NULL
            OR current_setting('app.current_enterprise_id', true) = ''
            OR enterprise_id = NULLIF(current_setting('app.current_enterprise_id', true), '')::uuid
        )
    """)


def downgrade() -> None:
    # Restore previous policy that included enterprise_id IS NULL
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
