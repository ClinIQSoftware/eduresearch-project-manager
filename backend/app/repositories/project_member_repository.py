"""Project member repository for project membership database operations."""

from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from app.models.project_member import ProjectMember
from app.models.user import User
from app.repositories.base import BaseRepository


class ProjectMemberRepository(BaseRepository[ProjectMember]):
    """Repository for ProjectMember model with membership-specific queries."""

    def __init__(self, db: Session) -> None:
        """Initialize the ProjectMemberRepository.

        Args:
            db: SQLAlchemy database session.
        """
        super().__init__(db, ProjectMember)

    def get_by_project(self, project_id: int) -> List[ProjectMember]:
        """Get all members of a project.

        Args:
            project_id: The project ID.

        Returns:
            List of project members.
        """
        return (
            self.db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id)
            .all()
        )

    def get_by_user(self, user_id: int) -> List[ProjectMember]:
        """Get all project memberships for a user.

        Args:
            user_id: The user ID.

        Returns:
            List of project memberships.
        """
        return (
            self.db.query(ProjectMember).filter(ProjectMember.user_id == user_id).all()
        )

    def get_membership(self, project_id: int, user_id: int) -> Optional[ProjectMember]:
        """Get a specific membership record.

        Args:
            project_id: The project ID.
            user_id: The user ID.

        Returns:
            The membership record if found, None otherwise.
        """
        return (
            self.db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user_id,
            )
            .first()
        )

    def is_member(self, project_id: int, user_id: int) -> bool:
        """Check if a user is a member of a project.

        Args:
            project_id: The project ID.
            user_id: The user ID.

        Returns:
            True if the user is a member, False otherwise.
        """
        membership = self.get_membership(project_id, user_id)
        return membership is not None

    def is_lead(self, project_id: int, user_id: int) -> bool:
        """Check if a user is a lead of a project.

        Args:
            project_id: The project ID.
            user_id: The user ID.

        Returns:
            True if the user is a lead (role='lead'), False otherwise.
        """
        membership = self.get_membership(project_id, user_id)
        return membership is not None and membership.role == "lead"

    def add_member(
        self, project_id: int, user_id: int, role: str = "participant"
    ) -> ProjectMember:
        """Add a user as a member of a project.

        Args:
            project_id: The project ID.
            user_id: The user ID to add.
            role: The role for the member (default: 'participant').

        Returns:
            The created membership record.

        Note:
            This will raise an IntegrityError if the user is already a member
            due to the unique constraint on (project_id, user_id).
        """
        membership = ProjectMember(
            project_id=project_id,
            user_id=user_id,
            role=role,
        )
        self.db.add(membership)
        self.db.commit()
        self.db.refresh(membership)
        return membership

    def remove_member(self, project_id: int, user_id: int) -> bool:
        """Remove a user from a project.

        Args:
            project_id: The project ID.
            user_id: The user ID to remove.

        Returns:
            True if the member was removed, False if not a member.
        """
        membership = self.get_membership(project_id, user_id)
        if membership is None:
            return False

        self.db.delete(membership)
        self.db.commit()
        return True

    def get_leads(self, project_id: int) -> List[User]:
        """Get all lead users for a project.

        Args:
            project_id: The project ID.

        Returns:
            List of users who are leads of the project.
        """
        memberships = (
            self.db.query(ProjectMember)
            .options(joinedload(ProjectMember.user))
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.role == "lead",
            )
            .all()
        )
        return [m.user for m in memberships if m.user is not None]
