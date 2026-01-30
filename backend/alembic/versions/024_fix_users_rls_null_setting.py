"""Fix users RLS policy for NULL current_setting.

When get_unscoped_db() is used (auth endpoints), the app.current_enterprise_id
setting is never set, so current_setting() returns NULL (not empty string).
The previous policy only checked for '' but not NULL, causing UPDATE
operations in unscoped sessions to fail with InsufficientPrivilege.

Revision ID: 024
Revises: 023
Create Date: 2026-01-30
"""

from typing import Sequence, Union
from alembic import op

revision: str = "024"
down_revision: Union[str, None] = "023"
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
            OR enterprise_id = current_setting('app.current_enterprise_id', true)::uuid
        )
    """)


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_users ON users")
    op.execute("""
        CREATE POLICY tenant_isolation_users ON users
        USING (
            enterprise_id IS NULL
            OR enterprise_id = current_setting('app.current_enterprise_id', true)::uuid
            OR current_setting('app.current_enterprise_id', true) = ''
        )
    """)
