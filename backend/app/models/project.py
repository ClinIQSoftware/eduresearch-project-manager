from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ProjectClassification(str, enum.Enum):
    education = "education"
    research = "research"
    quality_improvement = "quality_improvement"
    administrative = "administrative"


class ProjectStatus(str, enum.Enum):
    preparation = "preparation"
    recruitment = "recruitment"
    analysis = "analysis"
    writing = "writing"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(2000), nullable=True)
    color = Column(String(7), default="#3B82F6")

    # New classification and status fields
    classification = Column(Enum(ProjectClassification), default=ProjectClassification.research)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.preparation)
    open_to_participants = Column(Boolean, default=True)

    # Dates
    start_date = Column(Date, nullable=True)
    last_status_change = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Foreign keys
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    lead_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    institution_entity = relationship("Institution", back_populates="projects")
    department = relationship("Department", backref="projects")
    lead = relationship("User", back_populates="led_projects", foreign_keys=[lead_id])
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    join_requests = relationship("JoinRequest", back_populates="project", cascade="all, delete-orphan")
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
