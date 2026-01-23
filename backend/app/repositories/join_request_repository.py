"""Join request repository for join request database operations."""
from typing import List

from sqlalchemy.orm import Session

from app.models.join_request import JoinRequest
from app.repositories.base import BaseRepository


class JoinRequestRepository(BaseRepository[JoinRequest]):
    """Repository for JoinRequest model with join request-specific queries."""

    def __init__(self, db: Session) -> None:
        """Initialize the JoinRequestRepository.

        Args:
            db: SQLAlchemy database session.
        """
        super().__init__(db, JoinRequest)

    def get_by_project(self, project_id: int) -> List[JoinRequest]:
        """Get all join requests for a project.

        Args:
            project_id: The project ID.

        Returns:
            List of all join requests for the project.
        """
        return (
            self.db.query(JoinRequest)
            .filter(JoinRequest.project_id == project_id)
            .all()
        )

    def get_pending_for_project(self, project_id: int) -> List[JoinRequest]:
        """Get all pending join requests for a project.

        Args:
            project_id: The project ID.

        Returns:
            List of pending join requests for the project.
        """
        return (
            self.db.query(JoinRequest)
            .filter(
                JoinRequest.project_id == project_id,
                JoinRequest.status == "pending",
            )
            .all()
        )

    def get_by_user(self, user_id: int) -> List[JoinRequest]:
        """Get all join requests made by a user.

        Args:
            user_id: The user ID.

        Returns:
            List of join requests by the user.
        """
        return (
            self.db.query(JoinRequest)
            .filter(JoinRequest.user_id == user_id)
            .all()
        )

    def has_pending_request(self, project_id: int, user_id: int) -> bool:
        """Check if a user has a pending join request for a project.

        Args:
            project_id: The project ID.
            user_id: The user ID.

        Returns:
            True if there is a pending request, False otherwise.
        """
        request = (
            self.db.query(JoinRequest)
            .filter(
                JoinRequest.project_id == project_id,
                JoinRequest.user_id == user_id,
                JoinRequest.status == "pending",
            )
            .first()
        )
        return request is not None
