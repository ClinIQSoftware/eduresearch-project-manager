"""IRB Board management service for EduResearch Project Manager.

Handles board CRUD operations and board membership management.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.irb import IrbBoard, IrbBoardMember
from app.schemas.irb import IrbBoardCreate, IrbBoardMemberCreate, IrbBoardUpdate


class IrbBoardService:
    """Service for IRB board management operations."""

    def __init__(self, db: Session) -> None:
        """Initialize the IrbBoardService.

        Args:
            db: SQLAlchemy database session.
        """
        self.db = db

    def create_board(self, data: IrbBoardCreate, enterprise_id: UUID) -> IrbBoard:
        """Create a new IRB board.

        Args:
            data: Board creation data.
            enterprise_id: The enterprise/tenant ID this board belongs to.

        Returns:
            The newly created IrbBoard.

        Raises:
            BadRequestException: If validation rules are violated.
            ConflictException: If a duplicate board already exists.
        """
        # Validate board_type constraints
        if data.board_type == "irb" and data.institution_id is not None:
            raise BadRequestException(
                "Enterprise-level IRB board must not have an institution_id"
            )
        if data.board_type == "research_council" and data.institution_id is None:
            raise BadRequestException(
                "Research council board requires an institution_id"
            )

        # Enforce uniqueness: only one enterprise-level IRB per enterprise
        if data.board_type == "irb":
            existing = (
                self.db.query(IrbBoard)
                .filter(
                    IrbBoard.enterprise_id == enterprise_id,
                    IrbBoard.board_type == "irb",
                    IrbBoard.institution_id.is_(None),
                )
                .first()
            )
            if existing:
                raise ConflictException(
                    "An enterprise-level IRB board already exists for this enterprise"
                )

        # Enforce uniqueness: only one research council per institution
        if data.board_type == "research_council":
            existing = (
                self.db.query(IrbBoard)
                .filter(
                    IrbBoard.enterprise_id == enterprise_id,
                    IrbBoard.board_type == "research_council",
                    IrbBoard.institution_id == data.institution_id,
                )
                .first()
            )
            if existing:
                raise ConflictException(
                    "A research council board already exists for this institution"
                )

        board = IrbBoard(
            enterprise_id=enterprise_id,
            **data.model_dump(),
        )
        self.db.add(board)
        self.db.commit()
        return board

    def update_board(self, board_id: UUID, data: IrbBoardUpdate) -> IrbBoard:
        """Update an existing IRB board.

        Args:
            board_id: The ID of the board to update.
            data: The update data.

        Returns:
            The updated IrbBoard.

        Raises:
            NotFoundException: If board not found.
        """
        board = self.db.query(IrbBoard).filter(IrbBoard.id == board_id).first()
        if not board:
            raise NotFoundException(f"IRB board with id {board_id} not found")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(board, field, value)

        self.db.commit()
        return board

    def get_board(self, board_id: UUID) -> IrbBoard:
        """Get a board by ID with members eagerly loaded.

        Args:
            board_id: The board ID.

        Returns:
            The IrbBoard with members loaded.

        Raises:
            NotFoundException: If board not found.
        """
        board = (
            self.db.query(IrbBoard)
            .options(joinedload(IrbBoard.members))
            .filter(IrbBoard.id == board_id)
            .first()
        )
        if not board:
            raise NotFoundException(f"IRB board with id {board_id} not found")
        return board

    def list_boards(
        self, enterprise_id: UUID, institution_id: Optional[int] = None
    ) -> List[IrbBoard]:
        """List boards for an enterprise, optionally filtered by institution.

        Args:
            enterprise_id: The enterprise/tenant ID.
            institution_id: Optional institution ID to filter by.

        Returns:
            List of IrbBoards ordered by created_at descending.
        """
        query = self.db.query(IrbBoard).filter(
            IrbBoard.enterprise_id == enterprise_id
        )
        if institution_id is not None:
            query = query.filter(IrbBoard.institution_id == institution_id)
        return query.order_by(IrbBoard.created_at.desc()).all()

    def add_member(
        self, board_id: UUID, data: IrbBoardMemberCreate, enterprise_id: UUID
    ) -> IrbBoardMember:
        """Add a member to an IRB board.

        Args:
            board_id: The board ID.
            data: Member creation data (user_id, role).
            enterprise_id: The enterprise/tenant ID.

        Returns:
            The created IrbBoardMember.

        Raises:
            NotFoundException: If board not found.
            ConflictException: If the user already holds this role on the board.
        """
        board = self.db.query(IrbBoard).filter(IrbBoard.id == board_id).first()
        if not board:
            raise NotFoundException(f"IRB board with id {board_id} not found")

        existing = (
            self.db.query(IrbBoardMember)
            .filter(
                IrbBoardMember.board_id == board_id,
                IrbBoardMember.user_id == data.user_id,
                IrbBoardMember.role == data.role,
            )
            .first()
        )
        if existing:
            raise ConflictException(
                "User already has this role on the board"
            )

        member = IrbBoardMember(
            board_id=board_id,
            user_id=data.user_id,
            role=data.role,
            enterprise_id=enterprise_id,
        )
        self.db.add(member)
        self.db.commit()
        return member

    def remove_member(self, board_id: UUID, user_id: int) -> bool:
        """Remove a user from an IRB board (all roles).

        Args:
            board_id: The board ID.
            user_id: The user ID to remove.

        Returns:
            True if any membership records were deleted.
        """
        deleted = (
            self.db.query(IrbBoardMember)
            .filter(
                IrbBoardMember.board_id == board_id,
                IrbBoardMember.user_id == user_id,
            )
            .delete()
        )
        self.db.commit()
        return deleted > 0

    def get_members(self, board_id: UUID) -> List[IrbBoardMember]:
        """Get active members of a board with user details eagerly loaded.

        Args:
            board_id: The board ID.

        Returns:
            List of active IrbBoardMembers with user relationship loaded.
        """
        return (
            self.db.query(IrbBoardMember)
            .options(joinedload(IrbBoardMember.user))
            .filter(
                IrbBoardMember.board_id == board_id,
                IrbBoardMember.is_active.is_(True),
            )
            .all()
        )
