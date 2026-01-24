"""Add enterprise tables for multi-tenancy.

Revision ID: 014
Revises: 013
Create Date: 2026-01-23
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enterprises table
    op.create_table(
        "enterprises",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(63), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Create enterprise_configs table
    op.create_table(
        "enterprise_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "enterprise_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("enterprises.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
        # OAuth
        sa.Column("google_oauth_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("google_client_id", sa.String(255), nullable=True),
        sa.Column("google_client_secret_encrypted", sa.LargeBinary(), nullable=True),
        sa.Column("microsoft_oauth_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("microsoft_client_id", sa.String(255), nullable=True),
        sa.Column("microsoft_client_secret_encrypted", sa.LargeBinary(), nullable=True),
        sa.Column("saml_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("saml_metadata_url", sa.String(500), nullable=True),
        # SMTP
        sa.Column("smtp_host", sa.String(255), nullable=True),
        sa.Column("smtp_port", sa.Integer(), server_default=sa.text("587")),
        sa.Column("smtp_user", sa.String(255), nullable=True),
        sa.Column("smtp_password_encrypted", sa.LargeBinary(), nullable=True),
        sa.Column("smtp_from_email", sa.String(255), nullable=True),
        sa.Column("smtp_from_name", sa.String(255), nullable=True),
        # Branding
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("primary_color", sa.String(7), server_default=sa.text("'#3B82F6'")),
        sa.Column("favicon_url", sa.String(500), nullable=True),
        sa.Column("custom_css", sa.Text(), nullable=True),
        # Features
        sa.Column("features", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("enterprise_configs")
    op.drop_table("enterprises")
