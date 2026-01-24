"""Add platform_admins table for cross-tenant administration.

Revision ID: 017
Revises: 016
Create Date: 2026-01-24
"""

import uuid
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from passlib.context import CryptContext

from app.config import settings

revision: str = "017"
down_revision: Union[str, None] = "016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def upgrade() -> None:
    # Create platform_admins table
    op.create_table(
        "platform_admins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # Seed default platform admin
    platform_admins = sa.table(
        "platform_admins",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("email", sa.String),
        sa.column("password_hash", sa.String),
        sa.column("name", sa.String),
        sa.column("is_active", sa.Boolean),
    )

    password_hash = pwd_context.hash(settings.platform_admin_password)

    op.bulk_insert(
        platform_admins,
        [
            {
                "id": uuid.uuid4(),
                "email": settings.platform_admin_email,
                "password_hash": password_hash,
                "name": settings.platform_admin_name,
                "is_active": True,
            }
        ],
    )


def downgrade() -> None:
    op.drop_table("platform_admins")
