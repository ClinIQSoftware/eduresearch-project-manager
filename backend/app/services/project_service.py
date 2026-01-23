"""Project service for EduResearch Project Manager.

Handles project management operations including CRUD,
membership management, and search functionality.
"""
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.repositories import ProjectMemberRepository, ProjectRepository
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    """Service for project management operations."""

    def __init__(self, db: Session) -> None:
        """Initialize the ProjectService.

        Args:
            db: SQLAlchemy database session.
        """
        self.db = db
        self.project_repo = ProjectRepository(db)
        self.member_repo = ProjectMemberRepository(db)

    def create_project(self, data: ProjectCreate, creator: User) -> Project:
        """Create a new project and add the creator as lead.

        Args:
            data: Project creation data.
            creator: The user creating the project.

        Returns:
            The newly created Project.
        """
        project_data = data.model_dump()
        project_data["lead_id"] = creator.id

        project = self.project_repo.create(project_data)

        # Add creator as lead member
        self.member_repo.add_member(
            project_id=project.id, user_id=creator.id, role="lead"
        )

        return project

    def update_project(self, project_id: int, data: ProjectUpdate) -> Project:
        """Update an existing project.

        Args:
            project_id: The ID of the project to update.
            data: The update data.

        Returns:
            The updated Project.

        Raises:
            NotFoundException: If project not found.
        """
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project with id {project_id} not found")

        update_data = data.model_dump(exclude_unset=True)
        updated_project = self.project_repo.update(project_id, update_data)

        return updated_project

    def delete_project(self, project_id: int) -> bool:
        """Delete a project.

        Args:
            project_id: The ID of the project to delete.

        Returns:
            True if project was deleted.

        Raises:
            NotFoundException: If project not found.
        """
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project with id {project_id} not found")

        return self.project_repo.delete(project_id)

    def get_project(self, project_id: int) -> Optional[Project]:
        """Get a project by ID.

        Args:
            project_id: The project ID.

        Returns:
            The Project if found, None otherwise.
        """
        return self.project_repo.get_by_id(project_id)

    def get_project_detail(self, project_id: int) -> Optional[Project]:
        """Get a project by ID with all related data loaded.

        Loads lead, institution, department, and members with their users.

        Args:
            project_id: The project ID.

        Returns:
            The Project with relationships loaded if found, None otherwise.
        """
        return self.project_repo.get_with_details(project_id)

    def get_user_projects(self, user_id: int) -> List[Project]:
        """Get all projects where a user is a member or lead.

        Args:
            user_id: The user ID.

        Returns:
            List of Projects the user is involved in.
        """
        return self.project_repo.get_by_user(user_id)

    def get_projects_by_institution(self, institution_id: int) -> List[Project]:
        """Get all projects belonging to an institution.

        Args:
            institution_id: The institution ID.

        Returns:
            List of Projects in the institution.
        """
        return self.project_repo.get_by_institution(institution_id)

    def search_projects(self, query: str) -> List[Project]:
        """Search projects by title or description.

        Args:
            query: The search query string.

        Returns:
            List of Projects matching the search.
        """
        return self.project_repo.search(query)

    def get_upcoming_deadlines(self, days: int = 7) -> List[Project]:
        """Get projects with end dates within the specified number of days.

        Args:
            days: Number of days to look ahead (default: 7).

        Returns:
            List of Projects with upcoming end dates.
        """
        return self.project_repo.get_upcoming_deadlines(days)

    def get_upcoming_meetings(self, days: int = 7) -> List[Project]:
        """Get projects with meeting dates within the specified number of days.

        Args:
            days: Number of days to look ahead (default: 7).

        Returns:
            List of Projects with upcoming meetings.
        """
        return self.project_repo.get_upcoming_meetings(days)

    def add_member(
        self, project_id: int, user_id: int, role: str = "participant"
    ) -> ProjectMember:
        """Add a user as a member of a project.

        Args:
            project_id: The project ID.
            user_id: The user ID to add.
            role: The role for the member (default: 'participant').

        Returns:
            The created ProjectMember.

        Raises:
            NotFoundException: If project not found.
            ConflictException: If user is already a member.
        """
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project with id {project_id} not found")

        if self.member_repo.is_member(project_id, user_id):
            raise ConflictException("User is already a member of this project")

        return self.member_repo.add_member(project_id, user_id, role)

    def remove_member(self, project_id: int, user_id: int) -> bool:
        """Remove a user from a project.

        Args:
            project_id: The project ID.
            user_id: The user ID to remove.

        Returns:
            True if member was removed.

        Raises:
            NotFoundException: If project not found or user is not a member.
            BadRequestException: If trying to remove the project lead.
        """
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project with id {project_id} not found")

        if project.lead_id == user_id:
            raise BadRequestException(
                "Cannot remove the project lead. Transfer leadership first."
            )

        if not self.member_repo.is_member(project_id, user_id):
            raise NotFoundException("User is not a member of this project")

        return self.member_repo.remove_member(project_id, user_id)

    def get_members(self, project_id: int) -> List[ProjectMember]:
        """Get all members of a project.

        Args:
            project_id: The project ID.

        Returns:
            List of ProjectMembers.

        Raises:
            NotFoundException: If project not found.
        """
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project with id {project_id} not found")

        return self.member_repo.get_by_project(project_id)
