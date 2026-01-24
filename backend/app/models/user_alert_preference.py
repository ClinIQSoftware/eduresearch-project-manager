import json
import uuid

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class UserAlertPreference(Base):
    """Stores user preferences for keyword-based project alerts."""

    __tablename__ = "user_alert_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )

    # Multi-tenancy
    enterprise_id = Column(
        UUID(as_uuid=True),
        ForeignKey("enterprises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    alert_frequency = Column(String(20), default="weekly")
    dashboard_new_weeks = Column(
        Integer, default=2
    )  # Show new matches from last X weeks on dashboard
    last_alert_sent_at = Column(DateTime(timezone=True), nullable=True)
    _last_alert_project_ids = Column(
        "last_alert_project_ids", Text, nullable=True
    )  # JSON-encoded list of IDs
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="alert_preference")

    @property
    def last_alert_project_ids(self):
        """Get the list of project IDs from JSON."""
        if self._last_alert_project_ids:
            return json.loads(self._last_alert_project_ids)
        return None

    @last_alert_project_ids.setter
    def last_alert_project_ids(self, value):
        """Store the list of project IDs as JSON."""
        if value is not None:
            self._last_alert_project_ids = json.dumps(value)
        else:
            self._last_alert_project_ids = None
