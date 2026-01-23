"""Project repository for project-specific database operations."""

from datetime import date, timedelta
from typing import List, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.project import Project
from app.models.project_member import ProjectMember
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    """Repository for Project model with additional project-specific queries."""

    def __init__(self, db: Session) -> None:
        """Initialize the ProjectRepository.

        Args:
            db: SQLAlchemy database session.
        """
        super().__init__(db, Project)

    def get_with_details(self, id: int) -> Optional[Project]:
        """Get a project with all related data eagerly loaded.

        Loads: lead, institution, department, and members (with their users).

        Args:
            id: The project ID.

        Returns:
            The project with relationships loaded, or None if not found.
        """
        return (
            self.db.query(Project)
            .options(
                joinedload(Project.lead),
                joinedload(Project.institution),
                joinedload(Project.department),
                joinedload(Project.members).joinedload(ProjectMember.user),
            )
            .filter(Project.id == id)
            .first()
        )

    def get_by_user(self, user_id: int) -> List[Project]:
        """Get all projects where the user is a member or lead.

        Args:
            user_id: The user ID to filter by.

        Returns:
            List of projects where the user is involved.
        """
        # Get project IDs where user is a member
        member_project_ids = (
            self.db.query(ProjectMember.project_id)
            .filter(ProjectMember.user_id == user_id)
            .subquery()
        )

        return (
            self.db.query(Project)
            .filter(
                or_(
                    Project.lead_id == user_id,
                    Project.id.in_(member_project_ids),
                )
            )
            .distinct()
            .all()
        )

    def get_by_institution(self, institution_id: int) -> List[Project]:
        """Get all projects belonging to an institution.

        Args:
            institution_id: The institution ID to filter by.

        Returns:
            List of projects in the specified institution.
        """
        return (
            self.db.query(Project)
            .filter(Project.institution_id == institution_id)
            .all()
        )

    def get_by_department(self, department_id: int) -> List[Project]:
        """Get all projects belonging to a department.

        Args:
            department_id: The department ID to filter by.

        Returns:
            List of projects in the specified department.
        """
        return (
            self.db.query(Project).filter(Project.department_id == department_id).all()
        )

    def get_upcoming_deadlines(self, days: int = 7) -> List[Project]:
        """Get projects with end dates within the specified number of days.

        Args:
            days: Number of days to look ahead (default: 7).

        Returns:
            List of projects with upcoming end dates.
        """
        today = date.today()
        end_date_limit = today + timedelta(days=days)

        return (
            self.db.query(Project)
            .filter(
                Project.end_date.isnot(None),
                Project.end_date >= today,
                Project.end_date <= end_date_limit,
            )
            .order_by(Project.end_date)
            .all()
        )

    def get_upcoming_meetings(self, days: int = 7) -> List[Project]:
        """Get projects with next meeting dates within the specified number of days.

        Args:
            days: Number of days to look ahead (default: 7).

        Returns:
            List of projects with upcoming meetings.
        """
        today = date.today()
        meeting_date_limit = today + timedelta(days=days)

        return (
            self.db.query(Project)
            .filter(
                Project.next_meeting_date.isnot(None),
                Project.next_meeting_date >= today,
                Project.next_meeting_date <= meeting_date_limit,
            )
            .order_by(Project.next_meeting_date)
            .all()
        )

    def search(self, query: str) -> List[Project]:
        """Search projects by title or description.

        Args:
            query: The search query string.

        Returns:
            List of projects matching the search criteria.
        """
        search_pattern = f"%{query}%"
        return (
            self.db.query(Project)
            .filter(
                or_(
                    Project.title.ilike(search_pattern),
                    Project.description.ilike(search_pattern),
                )
            )
            .all()
        )
