"""Update users RLS policy to allow NULL enterprise_id.

The two-step registration flow creates users with enterprise_id=NULL.
The existing RLS policy blocks inserts/reads for NULL enterprise_id rows
because NULL != anything in SQL. This migration updates the policy to:
1. Allow rows where enterprise_id matches the current tenant context
2. Allow rows where enterprise_id IS NULL (users in onboarding)
3. Allow access when no tenant context is set (auth/unscoped endpoints)

Revision ID: 023
Revises: 022
Create Date: 2026-01-29
"""

from typing import Sequence, Union
from alembic import op

revision: str = "023"
down_revision: Union[str, None] = "022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old restrictive policy on users
    op.execute("DROP POLICY IF EXISTS tenant_isolation_users ON users")

    # Create a new policy that allows:
    # 1. Rows matching the current tenant context
    # 2. Rows with NULL enterprise_id (users who haven't completed onboarding)
    # 3. All rows when no tenant context is set (unscoped/auth endpoints)
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
    # Restore original strict policy
    op.execute("DROP POLICY IF EXISTS tenant_isolation_users ON users")
    op.execute("""
        CREATE POLICY tenant_isolation_users ON users
        USING (enterprise_id = current_setting('app.current_enterprise_id', true)::uuid)
    """)
