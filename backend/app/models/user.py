from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.models.organization import organization_admins
import enum


class AuthProvider(str, enum.Enum):
    local = "local"
    google = "google"
    microsoft = "microsoft"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # Nullable for OAuth users
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    bio = Column(String(2000), nullable=True)

    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # Approval fields for registration approval workflow
    is_approved = Column(Boolean, default=True)  # False for pending users when approval required
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    auth_provider = Column(Enum(AuthProvider), default=AuthProvider.local)
    oauth_id = Column(String(255), nullable=True)  # OAuth provider user ID

    # Institution and Department relationships
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    @property
    def name(self):
        """Computed property for full name (backwards compatibility)."""
        return f"{self.first_name} {self.last_name}".strip()

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    institution_entity = relationship("Institution", back_populates="users")
    department_entity = relationship("Department", back_populates="users")
    admin_of_institutions = relationship("Institution", secondary=organization_admins, back_populates="admins")
    led_projects = relationship("Project", back_populates="lead", foreign_keys="Project.lead_id")
    project_memberships = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan")
    join_requests = relationship("JoinRequest", back_populates="user", cascade="all, delete-orphan")
    uploaded_files = relationship("ProjectFile", back_populates="uploaded_by", cascade="all, delete-orphan")
    approved_by = relationship("User", remote_side=[id], foreign_keys=[approved_by_id])

    # Keyword tracking relationships
    keywords = relationship("UserKeyword", back_populates="user", cascade="all, delete-orphan")
    alert_preference = relationship("UserAlertPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")

    # Notification relationships
    notifications = relationship("Notification", back_populates="user", foreign_keys="Notification.user_id", cascade="all, delete-orphan")
    notification_preferences = relationship("NotificationPreference", back_populates="user", cascade="all, delete-orphan")
