from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.database import Base


class EmailSettings(Base):
    __tablename__ = "email_settings"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True, unique=True)
    smtp_host = Column(String(255), default="smtp.gmail.com")
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(String(255), nullable=True)
    smtp_password = Column(String(255), nullable=True)  # Should be encrypted in production
    from_email = Column(String(255), nullable=True)
    from_name = Column(String(255), default="EduResearch Project Manager")
    is_active = Column(Boolean, default=True)
