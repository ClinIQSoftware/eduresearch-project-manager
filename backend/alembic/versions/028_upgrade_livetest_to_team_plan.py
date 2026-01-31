"""Upgrade LiveTest enterprise to team plan.

Revision ID: 028
Revises: 027
Create Date: 2026-01-31
"""

from typing import Sequence, Union
from alembic import op

revision: str = "028"
down_revision: Union[str, None] = "027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "UPDATE enterprises SET plan_type = 'team', max_users = 50, max_projects = NULL "
        "WHERE slug = 'livetest'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE enterprises SET plan_type = 'free', max_users = 3, max_projects = 3 "
        "WHERE slug = 'livetest'"
    )
