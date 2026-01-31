"""Add file metadata columns to irb_submission_files.

Adds original_filename, file_size, and content_type columns to support
actual file uploads via the S3/local storage system.

Revision ID: 031
Revises: 030
Create Date: 2026-01-31
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "031"
down_revision: Union[str, None] = "030"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "irb_submission_files",
        sa.Column("original_filename", sa.String(255), nullable=True),
    )
    op.add_column(
        "irb_submission_files",
        sa.Column("file_size", sa.Integer(), nullable=True),
    )
    op.add_column(
        "irb_submission_files",
        sa.Column("content_type", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("irb_submission_files", "content_type")
    op.drop_column("irb_submission_files", "file_size")
    op.drop_column("irb_submission_files", "original_filename")
