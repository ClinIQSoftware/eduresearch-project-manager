"""IRB Question management service for EduResearch Project Manager.

Handles question section and question CRUD operations, including
conditional display rules for IRB form questions.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.irb import IrbBoard, IrbQuestion, IrbQuestionCondition, IrbQuestionSection
from app.schemas.irb import (
    IrbQuestionCreate,
    IrbQuestionSectionCreate,
    IrbQuestionSectionUpdate,
    IrbQuestionUpdate,
)


class IrbQuestionService:
    """Service for IRB question and section management operations."""

    def __init__(self, db: Session) -> None:
        """Initialize the IrbQuestionService.

        Args:
            db: SQLAlchemy database session.
        """
        self.db = db

    # ------------------------------------------------------------------
    # Section operations
    # ------------------------------------------------------------------

    def create_section(
        self, board_id: UUID, data: IrbQuestionSectionCreate, enterprise_id: UUID
    ) -> IrbQuestionSection:
        """Create a new question section for a board.

        Args:
            board_id: The board this section belongs to.
            data: Section creation data.
            enterprise_id: The enterprise/tenant ID.

        Returns:
            The newly created IrbQuestionSection.

        Raises:
            NotFoundException: If the board does not exist.
        """
        board = self.db.query(IrbBoard).filter(IrbBoard.id == board_id).first()
        if not board:
            raise NotFoundException(f"IRB board with id {board_id} not found")

        section = IrbQuestionSection(
            board_id=board_id,
            enterprise_id=enterprise_id,
            **data.model_dump(),
        )
        self.db.add(section)
        self.db.commit()
        self.db.refresh(section)
        return section

    def update_section(
        self, section_id: int, data: IrbQuestionSectionUpdate
    ) -> IrbQuestionSection:
        """Update an existing question section.

        Args:
            section_id: The ID of the section to update.
            data: The update data.

        Returns:
            The updated IrbQuestionSection.

        Raises:
            NotFoundException: If section not found.
        """
        section = (
            self.db.query(IrbQuestionSection)
            .filter(IrbQuestionSection.id == section_id)
            .first()
        )
        if not section:
            raise NotFoundException(f"Question section with id {section_id} not found")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(section, field, value)

        self.db.commit()
        self.db.refresh(section)
        return section

    def list_sections(self, board_id: UUID) -> list[IrbQuestionSection]:
        """List all question sections for a board, ordered by display order.

        Args:
            board_id: The board ID.

        Returns:
            List of IrbQuestionSections ordered by ``order`` ascending.
        """
        return (
            self.db.query(IrbQuestionSection)
            .filter(IrbQuestionSection.board_id == board_id)
            .order_by(IrbQuestionSection.order.asc())
            .all()
        )

    # ------------------------------------------------------------------
    # Question operations
    # ------------------------------------------------------------------

    def create_question(
        self, board_id: UUID, data: IrbQuestionCreate, enterprise_id: UUID
    ) -> IrbQuestion:
        """Create a new question for a board.

        Args:
            board_id: The board this question belongs to.
            data: Question creation data, optionally including conditions.
            enterprise_id: The enterprise/tenant ID.

        Returns:
            The newly created IrbQuestion with conditions eager-loaded.

        Raises:
            NotFoundException: If the board does not exist.
            BadRequestException: If the section does not belong to this board.
        """
        # Verify board exists
        board = self.db.query(IrbBoard).filter(IrbBoard.id == board_id).first()
        if not board:
            raise NotFoundException(f"IRB board with id {board_id} not found")

        # Verify section belongs to this board
        section = (
            self.db.query(IrbQuestionSection)
            .filter(
                IrbQuestionSection.id == data.section_id,
                IrbQuestionSection.board_id == board_id,
            )
            .first()
        )
        if not section:
            raise BadRequestException(
                f"Section {data.section_id} does not belong to board {board_id}"
            )

        # Create the question (exclude conditions from model_dump)
        question_data = data.model_dump(exclude={"conditions"})
        question = IrbQuestion(
            board_id=board_id,
            enterprise_id=enterprise_id,
            **question_data,
        )
        self.db.add(question)
        self.db.flush()  # Populate question.id for condition FK

        # Create condition records if provided
        if data.conditions:
            for cond in data.conditions:
                condition = IrbQuestionCondition(
                    question_id=question.id,
                    depends_on_question_id=cond.depends_on_question_id,
                    operator=cond.operator,
                    value=cond.value,
                    enterprise_id=enterprise_id,
                )
                self.db.add(condition)

        self.db.commit()
        self.db.refresh(question)

        # Eager-load conditions before returning
        return (
            self.db.query(IrbQuestion)
            .options(joinedload(IrbQuestion.conditions))
            .filter(IrbQuestion.id == question.id)
            .first()
        )

    def update_question(self, question_id: int, data: IrbQuestionUpdate) -> IrbQuestion:
        """Update an existing question.

        Args:
            question_id: The ID of the question to update.
            data: The update data. If ``conditions`` is explicitly provided
                  (even as an empty list), existing conditions are replaced.

        Returns:
            The updated IrbQuestion with conditions eager-loaded.

        Raises:
            NotFoundException: If question not found.
        """
        question = (
            self.db.query(IrbQuestion)
            .filter(IrbQuestion.id == question_id)
            .first()
        )
        if not question:
            raise NotFoundException(f"Question with id {question_id} not found")

        update_data = data.model_dump(exclude_unset=True, exclude={"conditions"})
        for field, value in update_data.items():
            setattr(question, field, value)

        # Replace conditions if explicitly provided (even if empty list)
        if "conditions" in data.model_fields_set:
            # Delete existing conditions
            self.db.query(IrbQuestionCondition).filter(
                IrbQuestionCondition.question_id == question_id
            ).delete()

            # Create new conditions
            if data.conditions:
                for cond in data.conditions:
                    condition = IrbQuestionCondition(
                        question_id=question_id,
                        depends_on_question_id=cond.depends_on_question_id,
                        operator=cond.operator,
                        value=cond.value,
                        enterprise_id=question.enterprise_id,
                    )
                    self.db.add(condition)

        self.db.commit()
        self.db.refresh(question)

        # Eager-load conditions before returning
        return (
            self.db.query(IrbQuestion)
            .options(joinedload(IrbQuestion.conditions))
            .filter(IrbQuestion.id == question_id)
            .first()
        )

    def delete_question(self, question_id: int) -> bool:
        """Soft-delete a question by setting is_active to False.

        Args:
            question_id: The ID of the question to delete.

        Returns:
            True if the question was found and deactivated.

        Raises:
            NotFoundException: If question not found.
        """
        question = (
            self.db.query(IrbQuestion)
            .filter(IrbQuestion.id == question_id)
            .first()
        )
        if not question:
            raise NotFoundException(f"Question with id {question_id} not found")

        question.is_active = False
        self.db.commit()
        return True

    def list_questions(
        self,
        board_id: UUID,
        section_id: Optional[int] = None,
        submission_type: Optional[str] = None,
    ) -> list[IrbQuestion]:
        """List active questions for a board with optional filters.

        Args:
            board_id: The board ID.
            section_id: Optional section ID to filter by.
            submission_type: Optional submission type filter. If ``"standard"``,
                includes questions with submission_type in (``"standard"``,
                ``"both"``). If ``"exempt"``, includes (``"exempt"``, ``"both"``).
                If ``"both"`` or ``None``, no filter is applied.

        Returns:
            List of active IrbQuestions with conditions eager-loaded,
            ordered by section order then question order.
        """
        query = (
            self.db.query(IrbQuestion)
            .join(IrbQuestionSection, IrbQuestion.section_id == IrbQuestionSection.id)
            .options(joinedload(IrbQuestion.conditions))
            .filter(
                IrbQuestion.board_id == board_id,
                IrbQuestion.is_active.is_(True),
            )
        )

        if section_id is not None:
            query = query.filter(IrbQuestion.section_id == section_id)

        if submission_type and submission_type != "both":
            query = query.filter(
                IrbQuestion.submission_type.in_([submission_type, "both"])
            )

        return (
            query.order_by(
                IrbQuestionSection.order.asc(),
                IrbQuestion.order.asc(),
            )
            .all()
        )
