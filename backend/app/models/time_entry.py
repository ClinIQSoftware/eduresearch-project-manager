from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration = Column(Float, nullable=True)  # Duration in minutes
    notes = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    task = relationship("Task", back_populates="time_entries")
