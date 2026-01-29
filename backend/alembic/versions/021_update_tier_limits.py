"""Update tier limits for 4-tier pricing structure.

Revision ID: 021
Revises: 020
Create Date: 2026-01-27
"""

from alembic import op
import sqlalchemy as sa

revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update free enterprises: 5 -> 3 limits
    op.execute("""
        UPDATE enterprises
        SET max_users = 3, max_projects = 3
        WHERE plan_type = 'free'
          AND max_users = 5
          AND max_projects = 5
    """)

    # Rename existing "pro" plans to "starter" and set starter limits
    op.execute("""
        UPDATE enterprises
        SET plan_type = 'starter',
            max_users = 10,
            max_projects = 15
        WHERE plan_type = 'pro'
    """)


def downgrade() -> None:
    # Revert starter back to pro
    op.execute("""
        UPDATE enterprises
        SET plan_type = 'pro',
            max_users = 10,
            max_projects = NULL
        WHERE plan_type = 'starter'
    """)

    # Revert free limits back to 5
    op.execute("""
        UPDATE enterprises
        SET max_users = 5, max_projects = 5
        WHERE plan_type = 'free'
          AND max_users = 3
          AND max_projects = 3
    """)
