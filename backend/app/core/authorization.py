"""
Centralized authorization service for the EduResearch Project Manager.

Provides consistent authorization checks across the application.
All methods allow superusers to bypass permission checks.
"""

from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember, MemberRole
from app.models.institution import Institution
from app.models.organization import organization_admins


class AuthorizationService:
    """
    Centralized authorization service for permission checks.

    All methods raise ForbiddenException if the user lacks the required permission.
    Superusers automatically pass all authorization checks.

    Example usage:
        auth_service = AuthorizationService()
        auth_service.require_superuser(current_user)
        auth_service.require_project_lead(current_user, project_id, db)
    """

    def require_superuser(self, user: User) -> None:
        """
        Require that the user is a superuser.

        Args:
            user: The user to check.

        Raises:
            ForbiddenException: If the user is not a superuser.

        Example:
            auth_service.require_superuser(current_user)
        """
        if not user.is_superuser:
            raise ForbiddenException("Superuser access required")

    def require_project_lead(self, user: User, project_id: int, db: Session) -> None:
        """
        Require that the user is a lead of the specified project.

        Superusers bypass this check. Also verifies the project exists.

        Args:
            user: The user to check.
            project_id: The ID of the project.
            db: The database session.

        Raises:
            NotFoundException: If the project does not exist.
            ForbiddenException: If the user is not a project lead.

        Example:
            auth_service.require_project_lead(current_user, project_id, db)
        """
        # Superusers bypass all checks
        if user.is_superuser:
            return

        # Verify project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise NotFoundException(f"Project with id {project_id} not found")

        # Check if user is a lead of this project
        membership = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user.id,
                ProjectMember.role == MemberRole.lead,
            )
            .first()
        )

        if not membership:
            raise ForbiddenException("Project lead access required")

    def require_project_member(self, user: User, project_id: int, db: Session) -> None:
        """
        Require that the user is a member of the specified project.

        This includes both leads and regular participants.
        Superusers bypass this check. Also verifies the project exists.

        Args:
            user: The user to check.
            project_id: The ID of the project.
            db: The database session.

        Raises:
            NotFoundException: If the project does not exist.
            ForbiddenException: If the user is not a project member.

        Example:
            auth_service.require_project_member(current_user, project_id, db)
        """
        # Superusers bypass all checks
        if user.is_superuser:
            return

        # Verify project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise NotFoundException(f"Project with id {project_id} not found")

        # Check if user is any type of member of this project
        membership = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id, ProjectMember.user_id == user.id
            )
            .first()
        )

        if not membership:
            raise ForbiddenException("Project member access required")

    def require_institution_admin(
        self, user: User, institution_id: int, db: Session
    ) -> None:
        """
        Require that the user is an admin of the specified institution.

        Superusers bypass this check. Also verifies the institution exists.

        Args:
            user: The user to check.
            institution_id: The ID of the institution.
            db: The database session.

        Raises:
            NotFoundException: If the institution does not exist.
            ForbiddenException: If the user is not an institution admin.

        Example:
            auth_service.require_institution_admin(current_user, institution_id, db)
        """
        # Superusers bypass all checks
        if user.is_superuser:
            return

        # Verify institution exists
        institution = (
            db.query(Institution).filter(Institution.id == institution_id).first()
        )
        if not institution:
            raise NotFoundException(f"Institution with id {institution_id} not found")

        # Check if user is an admin of this institution
        result = db.execute(
            organization_admins.select().where(
                organization_admins.c.user_id == user.id,
                organization_admins.c.organization_id == institution_id,
            )
        ).first()

        if not result:
            raise ForbiddenException("Institution admin access required")

    def is_project_lead(self, user: User, project_id: int, db: Session) -> bool:
        """
        Check if user is a lead of the specified project (without raising).

        Args:
            user: The user to check.
            project_id: The ID of the project.
            db: The database session.

        Returns:
            True if the user is a project lead or superuser, False otherwise.

        Example:
            if auth_service.is_project_lead(current_user, project_id, db):
                # User can manage the project
        """
        if user.is_superuser:
            return True

        membership = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user.id,
                ProjectMember.role == MemberRole.lead,
            )
            .first()
        )

        return membership is not None

    def is_project_member(self, user: User, project_id: int, db: Session) -> bool:
        """
        Check if user is a member of the specified project (without raising).

        Args:
            user: The user to check.
            project_id: The ID of the project.
            db: The database session.

        Returns:
            True if the user is a project member or superuser, False otherwise.

        Example:
            if auth_service.is_project_member(current_user, project_id, db):
                # User can view project details
        """
        if user.is_superuser:
            return True

        membership = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id, ProjectMember.user_id == user.id
            )
            .first()
        )

        return membership is not None

    def is_institution_admin(
        self, user: User, institution_id: int, db: Session
    ) -> bool:
        """
        Check if user is an admin of the specified institution (without raising).

        Args:
            user: The user to check.
            institution_id: The ID of the institution.
            db: The database session.

        Returns:
            True if the user is an institution admin or superuser, False otherwise.

        Example:
            if auth_service.is_institution_admin(current_user, institution_id, db):
                # User can manage institution settings
        """
        if user.is_superuser:
            return True

        result = db.execute(
            organization_admins.select().where(
                organization_admins.c.user_id == user.id,
                organization_admins.c.organization_id == institution_id,
            )
        ).first()

        return result is not None


# Singleton instance for convenience
authorization_service = AuthorizationService()
