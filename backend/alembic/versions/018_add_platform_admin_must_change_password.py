"""Add must_change_password to platform_admins.

Revision ID: 018
Revises: 017
Create Date: 2026-01-25
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "018"
down_revision: Union[str, None] = "017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "platform_admins",
        sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )


def downgrade() -> None:
    op.drop_column("platform_admins", "must_change_password")
