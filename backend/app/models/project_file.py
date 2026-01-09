from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ProjectFile(Base):
    __tablename__ = "project_files"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    content_type = Column(String(100), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="files")
    uploaded_by = relationship("User", back_populates="uploaded_files")
