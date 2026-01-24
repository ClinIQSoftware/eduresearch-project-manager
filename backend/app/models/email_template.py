import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)

    # Multi-tenancy
    enterprise_id = Column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    template_type = Column(
        String(50), nullable=False
    )  # user_approval_request, join_request, task_assignment
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)  # HTML with {{variable}} placeholders
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
