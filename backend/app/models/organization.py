from sqlalchemy import Column, Integer, String, DateTime, Table, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


# Association table for organization admins
organization_admins = Table(
    'organization_admins',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('organization_id', Integer, ForeignKey('organizations.id'), primary_key=True)
)


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    users = relationship("User", back_populates="organization")
    projects = relationship("Project", back_populates="organization", cascade="all, delete-orphan")
    admins = relationship("User", secondary=organization_admins, back_populates="admin_of_organizations")
