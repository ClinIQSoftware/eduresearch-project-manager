"""Institution Admin association model for EduResearch Project Manager."""

from sqlalchemy import Column, ForeignKey, Integer, Table

from app.database import Base

# Association table for institution admins
# This creates a many-to-many relationship between users and institutions
institution_admins = Table(
    "institution_admins",
    Base.metadata,
    Column(
        "user_id",
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "institution_id",
        Integer,
        ForeignKey("institutions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)
