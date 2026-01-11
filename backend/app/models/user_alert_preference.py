from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class AlertFrequency(str, enum.Enum):
    disabled = "disabled"
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


class UserAlertPreference(Base):
    """Stores user preferences for keyword-based project alerts."""
    __tablename__ = "user_alert_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    alert_frequency = Column(String(20), default="weekly")
    dashboard_new_weeks = Column(Integer, default=2)  # Show new matches from last X weeks on dashboard
    last_alert_sent_at = Column(DateTime(timezone=True), nullable=True)
    last_alert_project_ids = Column(ARRAY(Integer), nullable=True)  # Track which projects were included in last alert
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="alert_preference")
