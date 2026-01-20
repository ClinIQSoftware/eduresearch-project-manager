"""
Core modules for the EduResearch Project Manager.

This package provides foundational utilities used across the application:
- exceptions: Custom HTTP exception classes
- security: Password hashing and JWT token operations
- authorization: Centralized permission checking
"""

from app.core.exceptions import (
    AppException,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
    ForbiddenException,
    ConflictException,
)

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
)

from app.core.authorization import (
    AuthorizationService,
    authorization_service,
)


__all__ = [
    # Exceptions
    "AppException",
    "NotFoundException",
    "BadRequestException",
    "UnauthorizedException",
    "ForbiddenException",
    "ConflictException",
    # Security
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_token",
    # Authorization
    "AuthorizationService",
    "authorization_service",
]
