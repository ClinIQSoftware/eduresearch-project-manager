"""Join request service for EduResearch Project Manager.

Handles project join request operations including creation,
approval, rejection, and status queries.
"""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)
from app.models.join_request import JoinRequest
from app.models.user import User
from app.repositories import (
    JoinRequestRepository,
    ProjectMemberRepository,
    ProjectRepository,
)


class JoinRequestService:
    """Service for join request operations."""

    def __init__(self, db: Session) -> None:
        """Initialize the JoinRequestService.

        Args:
            db: SQLAlchemy database session.
        """
        self.db = db
        self.join_request_repo = JoinRequestRepository(db)
        self.project_repo = ProjectRepository(db)
        self.member_repo = ProjectMemberRepository(db)

    def create_request(
        self, project_id: int, user: User, message: Optional[str] = None
    ) -> JoinRequest:
        """Create a new join request for a project.

        Args:
            project_id: The ID of the project to join.
            user: The user requesting to join.
            message: Optional message to include with the request.

        Returns:
            The created JoinRequest.

        Raises:
            NotFoundException: If project not found.
            BadRequestException: If project is not open to participants.
            ConflictException: If user already has a pending request or is already a member.
        """
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project with id {project_id} not found")

        if not project.open_to_participants:
            raise BadRequestException("This project is not open to new participants")

        # Check if user is already a member
        if self.member_repo.is_member(project_id, user.id):
            raise ConflictException("You are already a member of this project")

        # Check for existing pending request
        if self.join_request_repo.has_pending_request(project_id, user.id):
            raise ConflictException(
                "You already have a pending join request for this project"
            )

        request_data = {
            "project_id": project_id,
            "user_id": user.id,
            "message": message,
            "status": "pending",
        }

        join_request = self.join_request_repo.create(request_data)
        return join_request

    def approve_request(self, request_id: int) -> JoinRequest:
        """Approve a join request and add user as project member.

        Args:
            request_id: The ID of the join request to approve.

        Returns:
            The updated JoinRequest.

        Raises:
            NotFoundException: If request not found.
            BadRequestException: If request is not pending.
        """
        join_request = self.join_request_repo.get_by_id(request_id)
        if not join_request:
            raise NotFoundException(f"Join request with id {request_id} not found")

        if join_request.status != "pending":
            raise BadRequestException(
                f"Cannot approve request with status '{join_request.status}'"
            )

        # Update request status
        updated_request = self.join_request_repo.update(
            request_id,
            {
                "status": "approved",
                "responded_at": datetime.now(timezone.utc),
            },
        )

        # Add user as project member
        self.member_repo.add_member(
            project_id=join_request.project_id,
            user_id=join_request.user_id,
            role="participant",
        )

        return updated_request

    def reject_request(self, request_id: int) -> JoinRequest:
        """Reject a join request.

        Args:
            request_id: The ID of the join request to reject.

        Returns:
            The updated JoinRequest.

        Raises:
            NotFoundException: If request not found.
            BadRequestException: If request is not pending.
        """
        join_request = self.join_request_repo.get_by_id(request_id)
        if not join_request:
            raise NotFoundException(f"Join request with id {request_id} not found")

        if join_request.status != "pending":
            raise BadRequestException(
                f"Cannot reject request with status '{join_request.status}'"
            )

        updated_request = self.join_request_repo.update(
            request_id,
            {
                "status": "rejected",
                "responded_at": datetime.now(timezone.utc),
            },
        )

        return updated_request

    def get_pending_for_project(self, project_id: int) -> List[JoinRequest]:
        """Get all pending join requests for a project.

        Args:
            project_id: The project ID.

        Returns:
            List of pending JoinRequests for the project.
        """
        return self.join_request_repo.get_pending_for_project(project_id)

    def get_user_requests(self, user_id: int) -> List[JoinRequest]:
        """Get all join requests made by a user.

        Args:
            user_id: The user ID.

        Returns:
            List of JoinRequests by the user.
        """
        return self.join_request_repo.get_by_user(user_id)
