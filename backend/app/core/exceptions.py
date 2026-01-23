"""
Custom exception classes for the EduResearch Project Manager.

These exceptions provide a consistent error handling interface across the application.
Each exception maps to a specific HTTP status code and includes a detail message.
"""

from fastapi import HTTPException, status


class AppException(HTTPException):
    """Base exception class for application-specific errors."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    detail: str = "An unexpected error occurred"

    def __init__(self, detail: str = None):
        super().__init__(
            status_code=self.status_code,
            detail=detail or self.detail
        )


class NotFoundException(AppException):
    """
    Exception for resource not found errors (404).

    Use when a requested resource does not exist in the database.

    Example:
        raise NotFoundException("Project not found")
        raise NotFoundException(f"User with id {user_id} not found")
    """

    status_code = status.HTTP_404_NOT_FOUND
    detail = "Resource not found"


class BadRequestException(AppException):
    """
    Exception for invalid request errors (400).

    Use when the client sends malformed data or invalid parameters.

    Example:
        raise BadRequestException("Invalid email format")
        raise BadRequestException("Start date must be before end date")
    """

    status_code = status.HTTP_400_BAD_REQUEST
    detail = "Bad request"


class UnauthorizedException(AppException):
    """
    Exception for authentication errors (401).

    Use when the user is not authenticated or credentials are invalid.

    Example:
        raise UnauthorizedException("Invalid or expired token")
        raise UnauthorizedException("Invalid credentials")
    """

    status_code = status.HTTP_401_UNAUTHORIZED
    detail = "Not authenticated"

    def __init__(self, detail: str = None):
        super().__init__(detail=detail)
        self.headers = {"WWW-Authenticate": "Bearer"}


class ForbiddenException(AppException):
    """
    Exception for authorization errors (403).

    Use when the user is authenticated but lacks permission for the action.

    Example:
        raise ForbiddenException("Superuser access required")
        raise ForbiddenException("You are not a member of this project")
    """

    status_code = status.HTTP_403_FORBIDDEN
    detail = "Access forbidden"


class ConflictException(AppException):
    """
    Exception for conflict errors (409).

    Use when an action conflicts with the current state of a resource.

    Example:
        raise ConflictException("Email already registered")
        raise ConflictException("User is already a member of this project")
    """

    status_code = status.HTTP_409_CONFLICT
    detail = "Resource conflict"
