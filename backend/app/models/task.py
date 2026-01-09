from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(2000), nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.TODO)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM)
    due_date = Column(DateTime(timezone=True), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    project = relationship("Project", back_populates="tasks")
    time_entries = relationship("TimeEntry", back_populates="task", cascade="all, delete-orphan")
