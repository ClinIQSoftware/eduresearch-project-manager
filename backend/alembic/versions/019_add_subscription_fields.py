"""Add subscription fields to enterprises.

Revision ID: 019
Revises: 018
Create Date: 2026-01-25
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "019"
down_revision: Union[str, None] = "018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("enterprises", sa.Column("plan_type", sa.String(20), nullable=False, server_default="free"))
    op.add_column("enterprises", sa.Column("max_users", sa.Integer(), nullable=False, server_default="5"))
    op.add_column("enterprises", sa.Column("max_projects", sa.Integer(), nullable=True, server_default="5"))
    op.add_column("enterprises", sa.Column("stripe_customer_id", sa.String(255), nullable=True))
    op.add_column("enterprises", sa.Column("stripe_subscription_id", sa.String(255), nullable=True))
    op.add_column("enterprises", sa.Column("subscription_status", sa.String(50), nullable=True))
    op.add_column("enterprises", sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("enterprises", "current_period_end")
    op.drop_column("enterprises", "subscription_status")
    op.drop_column("enterprises", "stripe_subscription_id")
    op.drop_column("enterprises", "stripe_customer_id")
    op.drop_column("enterprises", "max_projects")
    op.drop_column("enterprises", "max_users")
    op.drop_column("enterprises", "plan_type")
