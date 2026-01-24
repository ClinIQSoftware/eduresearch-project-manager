from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional
import os
import warnings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/eduresearch"

    # JWT
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Google OAuth
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None

    # Microsoft OAuth
    microsoft_client_id: Optional[str] = None
    microsoft_client_secret: Optional[str] = None
    microsoft_tenant_id: Optional[str] = "common"

    # Email (Gmail SMTP)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: str = "EduResearch Project Manager"

    # File Upload
    upload_dir: str = "./uploads"
    max_file_size: int = 10485760  # 10MB

    # App URLs
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"

    # Environment
    environment: str = "development"

    # Cron job authentication for scheduled tasks
    cron_secret: Optional[str] = None

    # Multi-tenancy
    base_domain: str = "localhost:3000"  # e.g., "eduresearch.app" for production

    # Default Platform Admin (seeded on first run)
    platform_admin_email: str = "platform-admin@eduresearch.app"
    platform_admin_password: str = "PlatformAdmin123!"
    platform_admin_name: str = "Platform Administrator"

    class Config:
        env_file = ".env"
        extra = "ignore"

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if v == "your-secret-key-change-in-production":
            env = os.getenv("ENVIRONMENT", "development")
            if env not in ("development", "test"):
                warnings.warn(
                    "WARNING: Using default secret key in production is insecure! "
                    "Set SECRET_KEY environment variable.",
                    UserWarning,
                )
        return v

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_origins(self) -> list[str]:
        """Get CORS origins based on environment."""
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
        if self.frontend_url and self.frontend_url not in origins:
            origins.append(self.frontend_url)
        return origins


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.upload_dir, exist_ok=True)
