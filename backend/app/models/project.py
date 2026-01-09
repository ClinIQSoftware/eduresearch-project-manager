from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ProjectClassification(str, enum.Enum):
    EDUCATION = "education"
    RESEARCH = "research"
    QUALITY_IMPROVEMENT = "quality_improvement"
    ADMINISTRATIVE = "administrative"


class ProjectStatus(str, enum.Enum):
    PREPARATION = "preparation"
    RECRUITMENT = "recruitment"
    ANALYSIS = "analysis"
    WRITING = "writing"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(2000), nullable=True)
    color = Column(String(7), default="#3B82F6")

    # New classification and status fields
    classification = Column(Enum(ProjectClassification), default=ProjectClassification.RESEARCH)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.PREPARATION)
    open_to_participants = Column(Boolean, default=True)

    # Dates
    start_date = Column(Date, nullable=True)
    last_status_change = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Foreign keys
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    lead_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="projects")
    lead = relationship("User", back_populates="led_projects", foreign_keys=[lead_id])
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    join_requests = relationship("JoinRequest", back_populates="project", cascade="all, delete-orphan")
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
