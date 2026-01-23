"""Organization module - legacy compatibility.

The Institution class has been moved to institution.py.
This module only contains the organization_admins association table
for backward compatibility with existing authorization code.
"""

from sqlalchemy import Column, Integer, Table, ForeignKey
from app.database import Base


# Association table for institution admins (keeping table name for migration compatibility)
organization_admins = Table(
    "organization_admins",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("organization_id", Integer, ForeignKey("institutions.id"), primary_key=True),
)
