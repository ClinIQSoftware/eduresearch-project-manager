"""IRB Submission workflow service for EduResearch Project Manager.

Handles the full lifecycle of IRB submissions: creation, triage, review
assignment, review collection, decision issuance, escalation, and resubmission.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.irb import (
    IrbBoard,
    IrbBoardMember,
    IrbDecision,
    IrbReview,
    IrbSubmission,
    IrbSubmissionFile,
    IrbSubmissionHistory,
    IrbSubmissionResponse,
)
from app.schemas.irb import (
    IrbDecisionCreate,
    IrbReviewCreate,
    IrbSubmissionCreate,
    IrbSubmissionResponseCreate,
    IrbSubmissionUpdate,
)


class IrbSubmissionService:
    """Service for IRB submission workflow operations."""

    def __init__(self, db: Session) -> None:
        """Initialize the IrbSubmissionService.

        Args:
            db: SQLAlchemy database session.
        """
        self.db = db

    # ------------------------------------------------------------------
    # Helper
    # ------------------------------------------------------------------

    def _record_history(
        self,
        submission_id: UUID,
        from_status: str,
        to_status: str,
        changed_by_id: int,
        enterprise_id: UUID,
        note: str | None = None,
    ) -> None:
        """Record a status transition in the submission history.

        Args:
            submission_id: The submission that changed status.
            from_status: Previous status value.
            to_status: New status value.
            changed_by_id: The user who triggered the change.
            enterprise_id: The enterprise/tenant ID.
            note: Optional note explaining the transition.
        """
        history = IrbSubmissionHistory(
            submission_id=submission_id,
            enterprise_id=enterprise_id,
            from_status=from_status,
            to_status=to_status,
            changed_by_id=changed_by_id,
            note=note,
        )
        self.db.add(history)

    # ------------------------------------------------------------------
    # 1. Create submission
    # ------------------------------------------------------------------

    def create_submission(
        self, data: IrbSubmissionCreate, user_id: int, enterprise_id: UUID
    ) -> IrbSubmission:
        """Create a new draft IRB submission.

        Args:
            data: Submission creation data (board_id, project_id, submission_type).
            user_id: The ID of the user creating the submission.
            enterprise_id: The enterprise/tenant ID.

        Returns:
            The newly created IrbSubmission in draft status.
        """
        submission = IrbSubmission(
            enterprise_id=enterprise_id,
            submitted_by_id=user_id,
            status="draft",
            version=1,
            **data.model_dump(),
        )
        self.db.add(submission)
        self.db.commit()
        self.db.refresh(submission)
        return submission

    # ------------------------------------------------------------------
    # 2. Update submission
    # ------------------------------------------------------------------

    def update_submission(
        self, submission_id: UUID, data: IrbSubmissionUpdate
    ) -> IrbSubmission:
        """Update a draft submission's editable fields.

        Args:
            submission_id: The submission to update.
            data: Fields to update.

        Returns:
            The updated IrbSubmission.

        Raises:
            NotFoundException: If submission not found.
            BadRequestException: If submission is not in draft status.
        """
        submission = (
            self.db.query(IrbSubmission)
            .filter(IrbSubmission.id == submission_id)
            .first()
        )
        if not submission:
            raise NotFoundException(f"IRB submission with id {submission_id} not found")
        if submission.status != "draft":
            raise BadRequestException(
                "Only draft submissions can be updated"
            )

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(submission, field, value)

        self.db.commit()
        self.db.refresh(submission)
        return submission

    # ------------------------------------------------------------------
    # 3. Get submission (eager load)
    # ------------------------------------------------------------------

    def get_submission(self, submission_id: UUID) -> IrbSubmission:
        """Get a submission by ID with all related entities eagerly loaded.

        Args:
            submission_id: The submission ID.

        Returns:
            The IrbSubmission with files, responses, reviews, decision, and
            history loaded.

        Raises:
            NotFoundException: If submission not found.
        """
        submission = (
            self.db.query(IrbSubmission)
            .options(
                joinedload(IrbSubmission.files),
                joinedload(IrbSubmission.responses),
                joinedload(IrbSubmission.reviews),
                joinedload(IrbSubmission.decision),
                joinedload(IrbSubmission.history),
            )
            .filter(IrbSubmission.id == submission_id)
            .first()
        )
        if not submission:
            raise NotFoundException(f"IRB submission with id {submission_id} not found")
        return submission

    # ------------------------------------------------------------------
    # 4. List submissions
    # ------------------------------------------------------------------

    def list_submissions(
        self,
        enterprise_id: UUID,
        user_id: Optional[int] = None,
        board_id: Optional[UUID] = None,
        status: Optional[str] = None,
    ) -> list[IrbSubmission]:
        """List submissions for an enterprise with optional filters.

        Args:
            enterprise_id: The enterprise/tenant ID.
            user_id: Optional filter by submitter.
            board_id: Optional filter by board.
            status: Optional filter by status.

        Returns:
            List of IrbSubmissions ordered by created_at descending.
        """
        query = self.db.query(IrbSubmission).filter(
            IrbSubmission.enterprise_id == enterprise_id
        )
        if user_id is not None:
            query = query.filter(IrbSubmission.submitted_by_id == user_id)
        if board_id is not None:
            query = query.filter(IrbSubmission.board_id == board_id)
        if status is not None:
            query = query.filter(IrbSubmission.status == status)
        return query.order_by(IrbSubmission.created_at.desc()).all()

    # ------------------------------------------------------------------
    # 5. Submit (draft -> submitted)
    # ------------------------------------------------------------------

    def submit(self, submission_id: UUID, user_id: int) -> IrbSubmission:
        """Submit a draft submission for review.

        Args:
            submission_id: The submission to submit.
            user_id: The user performing the action.

        Returns:
            The updated IrbSubmission with status 'submitted'.

        Raises:
            NotFoundException: If submission not found.
            BadRequestException: If submission is not in draft status.
        """
        submission = (
            self.db.query(IrbSubmission)
            .filter(IrbSubmission.id == submission_id)
            .first()
        )
        if not submission:
            raise NotFoundException(f"IRB submission with id {submission_id} not found")
        if submission.status != "draft":
            raise BadRequestException(
                "Only draft submissions can be submitted"
            )

        submission.status = "submitted"
        submission.submitted_at = datetime.utcnow()
        self._record_history(
            submission_id=submission.id,
            from_status="draft",
            to_status="submitted",
            changed_by_id=user_id,
            enterprise_id=submission.enterprise_id,
        )
        self.db.commit()
        self.db.refresh(submission)
        return submission

    # ------------------------------------------------------------------
    # 6. Save responses (upsert)
    # ------------------------------------------------------------------

    def save_responses(
        self,
        submission_id: UUID,
        responses: list[IrbSubmissionResponseCreate],
        enterprise_id: UUID,
    ) -> list[IrbSubmissionResponse]:
        """Save (upsert) responses for a submission.

        For each response in the list, if a record already exists for the
        given submission_id + question_id it is updated; otherwise a new
        record is created.

        Args:
            submission_id: The submission the responses belong to.
            responses: List of response payloads.
            enterprise_id: The enterprise/tenant ID.

        Returns:
            All IrbSubmissionResponse records for the submission.
        """
        for resp_data in responses:
            existing = (
                self.db.query(IrbSubmissionResponse)
                .filter(
                    IrbSubmissionResponse.submission_id == submission_id,
                    IrbSubmissionResponse.question_id == resp_data.question_id,
                )
                .first()
            )
            if existing:
                existing.answer = resp_data.answer
                existing.user_confirmed = True
            else:
                new_resp = IrbSubmissionResponse(
                    submission_id=submission_id,
                    question_id=resp_data.question_id,
                    enterprise_id=enterprise_id,
                    answer=resp_data.answer,
                    user_confirmed=True,
                )
                self.db.add(new_resp)

        self.db.commit()

        return (
            self.db.query(IrbSubmissionResponse)
            .filter(IrbSubmissionResponse.submission_id == submission_id)
            .all()
        )

    # ------------------------------------------------------------------
    # 7. Upload file
    # ------------------------------------------------------------------

    def upload_file(
        self,
        submission_id: UUID,
        file_name: str,
        file_url: str,
        file_type: str,
        enterprise_id: UUID,
    ) -> IrbSubmissionFile:
        """Attach a file record to a submission.

        Args:
            submission_id: The submission to attach the file to.
            file_name: Display name of the file.
            file_url: URL/path where the file is stored.
            file_type: Type of file (protocol, consent_form, supporting_doc).
            enterprise_id: The enterprise/tenant ID.

        Returns:
            The created IrbSubmissionFile.

        Raises:
            NotFoundException: If submission not found.
        """
        submission = (
            self.db.query(IrbSubmission)
            .filter(IrbSubmission.id == submission_id)
            .first()
        )
        if not submission:
            raise NotFoundException(f"IRB submission with id {submission_id} not found")

        file_record = IrbSubmissionFile(
            submission_id=submission_id,
            enterprise_id=enterprise_id,
            file_name=file_name,
            file_url=file_url,
            file_type=file_type,
        )
        self.db.add(file_record)
        self.db.commit()
        self.db.refresh(file_record)
        return file_record

    # ------------------------------------------------------------------
    # 8. Triage (submitted -> in_triage or draft)
    # ------------------------------------------------------------------

    def triage(
        self,
        submission_id: UUID,
        action: str,
        note: Optional[str],
        user_id: int,
    ) -> IrbSubmission:
        """Triage a submitted submission: accept for review or return to draft.

        Args:
            submission_id: The submission to triage.
            action: Either 'accept' or 'return'.
            note: Optional note (typically used when returning).
            user_id: The user performing the triage.

        Returns:
            The updated IrbSubmission.

        Raises:
            NotFoundException: If submission not found.
            BadRequestException: If submission is not in submitted status or
                action is invalid.
        """
        submission = (
            self.db.query(IrbSubmission)
            .filter(IrbSubmission.id == submission_id)
            .first()
        )
        if not submission:
            raise NotFoundException(f"IRB submission with id {submission_id} not found")
        if submission.status != "submitted":
            raise BadRequestException(
                "Only submitted submissions can be triaged"
            )

        if action == "accept":
            submission.status = "in_triage"
            self._record_history(
                submission_id=submission.id,
                from_status="submitted",
                to_status="in_triage",
                changed_by_id=user_id,
                enterprise_id=submission.enterprise_id,
            )
        elif action == "return":
            submission.status = "draft"
            self._record_history(
                submission_id=submission.id,
                from_status="submitted",
                to_status="draft",
                changed_by_id=user_id,
                enterprise_id=submission.enterprise_id,
                note=note,
            )
        else:
            raise BadRequestException(
                f"Invalid triage action: {action}. Must be 'accept' or 'return'."
            )

        self.db.commit()
        self.db.refresh(submission)
        return submission

    # ------------------------------------------------------------------
    # 9. Assign main reviewer
    # ------------------------------------------------------------------

    def assign_main_reviewer(
        self, submission_id: UUID, reviewer_id: int, user_id: int
    ) -> IrbSubmission:
        """Assign a main reviewer to a submission in triage.

        Args:
            submission_id: The submission to assign.
            reviewer_id: The user ID of the main reviewer.
            user_id: The user performing the assignment.

        Returns:
            The updated IrbSubmission.

        Raises:
            NotFoundException: If submission not found.
            BadRequestException: If submission is not in_triage.
        """
        submission = (
            self.db.query(IrbSubmission)
            .filter(IrbSubmission.id == submission_id)
            .first()
        )
        if not submission:
            raise NotFoundException(f"IRB submission with id {submission_id} not found")
        if submission.status != "in_triage":
            raise BadRequestException(
                "Main reviewer can only be assigned when submission is in triage"
            )

        submission.main_reviewer_id = reviewer_id
        submission.status = "assigned_to_main"
        self._record_history(
            submission_id=submission.id,
            from_status="in_triage",
            to_status="assigned_to_main",
            changed_by_id=user_id,
            enterprise_id=submission.enterprise_id,
        )
        self.db.commit()
        self.db.refresh(submission)
        return submission

    # ------------------------------------------------------------------
    # 10. Assign reviewers
    # ------------------------------------------------------------------

    def assign_reviewers(
        self, submission_id: UUID, reviewer_ids: list[int], user_id: int
    ) -> list[IrbReview]:
        """Assign multiple reviewers to a submission and move to under_review.

        Each reviewer's role is looked up from their board membership.

        Args:
            submission_id: The submission to assign reviewers to.
            reviewer_ids: List of user IDs to assign as reviewers.
            user_id: The user performing the assignment.

        Returns:
            The created IrbReview records.

        Raises:
            NotFoundException: If submission not found.
            BadRequestException: If submission is not in assigned_to_main status.
        """
        submission = (
            self.db.query(IrbSubmission)
            .filter(IrbSubmission.id == submission_id)
            .first()
        )
        if not submission:
            raise NotFoundException(f"IRB submission with id {submission_id} not found")
        if submission.status != "assigned_to_main":
            raise BadRequestException(
                "Reviewers can only be assigned when submission is assigned to main reviewer"
            )

        reviews: list[IrbReview] = []
        for rid in reviewer_ids:
            # Look up the reviewer's board membership to determine their role
            member = (
                self.db.query(IrbBoardMember)
                .filter(
                    IrbBoardMember.board_id == submission.board_id,
                    IrbBoardMember.user_id == rid,
                    IrbBoardMember.is_active.is_(True),
                )
                .first()
            )
            role = member.role if member else "associate_reviewer"

            review = IrbReview(
                submission_id=submission_id,
                reviewer_id=rid,
                enterprise_id=submission.enterprise_id,
                role=role,
                recommendation=None,
                completed_at=None,
            )
            self.db.add(review)
            reviews.append(review)

        submission.status = "under_review"
        self._record_history(
            submission_id=submission.id,
            from_status="assigned_to_main",
            to_status="under_review",
            changed_by_id=user_id,
            enterprise_id=submission.enterprise_id,
        )
        self.db.commit()
        for review in reviews:
            self.db.refresh(review)
        return reviews

    # ------------------------------------------------------------------
    # 11. Submit review
    # ------------------------------------------------------------------

    def submit_review(
        self, submission_id: UUID, data: IrbReviewCreate, reviewer_id: int
    ) -> IrbReview:
        """Submit a review for an assigned reviewer.

        Args:
            submission_id: The submission being reviewed.
            data: Review data (recommendation, comments, feedback).
            reviewer_id: The reviewer submitting the review.

        Returns:
            The updated IrbReview.

        Raises:
            NotFoundException: If no review assignment found for this reviewer.
        """
        review = (
            self.db.query(IrbReview)
            .filter(
                IrbReview.submission_id == submission_id,
                IrbReview.reviewer_id == reviewer_id,
            )
            .first()
        )
        if not review:
            raise NotFoundException(
                "No review assignment found for this reviewer on this submission"
            )

        review.recommendation = data.recommendation
        review.comments = data.comments
        review.feedback_to_submitter = data.feedback_to_submitter
        review.completed_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(review)
        return review

    # ------------------------------------------------------------------
    # 12. Issue decision
    # ------------------------------------------------------------------

    def issue_decision(
        self, submission_id: UUID, data: IrbDecisionCreate, user_id: int
    ) -> IrbDecision:
        """Issue a final decision on a submission under review.

        Only the main reviewer may issue a decision.

        Args:
            submission_id: The submission to decide on.
            data: Decision data (decision, rationale, letter, conditions).
            user_id: The user issuing the decision (must be main reviewer).

        Returns:
            The created IrbDecision.

        Raises:
            NotFoundException: If submission not found.
            BadRequestException: If submission is not under_review.
            ForbiddenException: If user is not the main reviewer.
        """
        submission = (
            self.db.query(IrbSubmission)
            .filter(IrbSubmission.id == submission_id)
            .first()
        )
        if not submission:
            raise NotFoundException(f"IRB submission with id {submission_id} not found")
        if submission.status != "under_review":
            raise BadRequestException(
                "Decisions can only be issued for submissions under review"
            )
        if submission.main_reviewer_id != user_id:
            raise ForbiddenException(
                "Only the main reviewer can issue a decision"
            )

        # Map decision value to submission status
        decision_to_status = {
            "accept": "accepted",
            "minor_revise": "revision_requested",
            "major_revise": "revision_requested",
            "decline": "declined",
        }
        new_status = decision_to_status[data.decision]

        decision = IrbDecision(
            submission_id=submission_id,
            decided_by_id=user_id,
            enterprise_id=submission.enterprise_id,
            decision=data.decision,
            rationale=data.rationale,
            letter=data.letter,
            conditions=data.conditions,
            decided_at=datetime.utcnow(),
        )
        self.db.add(decision)

        submission.status = new_status
        submission.decided_at = datetime.utcnow()

        if data.decision in ("minor_revise", "major_revise"):
            submission.revision_type = (
                "minor" if data.decision == "minor_revise" else "major"
            )

        self._record_history(
            submission_id=submission.id,
            from_status="under_review",
            to_status=new_status,
            changed_by_id=user_id,
            enterprise_id=submission.enterprise_id,
        )

        self.db.commit()
        self.db.refresh(decision)
        return decision

    # ------------------------------------------------------------------
    # 13. Escalate
    # ------------------------------------------------------------------

    def escalate(
        self,
        submission_id: UUID,
        target_board_id: UUID,
        user_id: int,
        enterprise_id: UUID,
    ) -> IrbSubmission:
        """Escalate a submission to a different board.

        Creates a new submission on the target board linked back to the
        original via escalated_from_id.

        Args:
            submission_id: The original submission to escalate from.
            target_board_id: The board to escalate to.
            user_id: The user performing the escalation.
            enterprise_id: The enterprise/tenant ID.

        Returns:
            The newly created escalated IrbSubmission.

        Raises:
            NotFoundException: If original submission not found.
        """
        original = (
            self.db.query(IrbSubmission)
            .filter(IrbSubmission.id == submission_id)
            .first()
        )
        if not original:
            raise NotFoundException(f"IRB submission with id {submission_id} not found")

        new_submission = IrbSubmission(
            enterprise_id=enterprise_id,
            board_id=target_board_id,
            project_id=original.project_id,
            submitted_by_id=user_id,
            submission_type=original.submission_type,
            status="draft",
            version=1,
            escalated_from_id=submission_id,
        )
        self.db.add(new_submission)
        self.db.commit()
        self.db.refresh(new_submission)
        return new_submission

    # ------------------------------------------------------------------
    # 14. Resubmit
    # ------------------------------------------------------------------

    def resubmit(
        self, submission_id: UUID, user_id: int, enterprise_id: UUID
    ) -> IrbSubmission:
        """Create a new version of a submission that was sent back for revision.

        Args:
            submission_id: The original submission to resubmit.
            user_id: The user performing the resubmission.
            enterprise_id: The enterprise/tenant ID.

        Returns:
            The newly created resubmission with incremented version.

        Raises:
            NotFoundException: If original submission not found.
            BadRequestException: If original is not in revision_requested status.
        """
        original = (
            self.db.query(IrbSubmission)
            .filter(IrbSubmission.id == submission_id)
            .first()
        )
        if not original:
            raise NotFoundException(f"IRB submission with id {submission_id} not found")
        if original.status != "revision_requested":
            raise BadRequestException(
                "Only submissions with revision requested can be resubmitted"
            )

        new_submission = IrbSubmission(
            enterprise_id=enterprise_id,
            board_id=original.board_id,
            project_id=original.project_id,
            submitted_by_id=user_id,
            submission_type=original.submission_type,
            status="draft",
            version=original.version + 1,
        )
        self.db.add(new_submission)
        self.db.commit()
        self.db.refresh(new_submission)
        return new_submission

    # ------------------------------------------------------------------
    # 15. Dashboard
    # ------------------------------------------------------------------

    def get_dashboard(self, user_id: int, enterprise_id: UUID) -> dict:
        """Get the IRB dashboard data for a user.

        Returns the user's own submissions, their pending reviews, and the
        queue for boards they are a member of.

        Args:
            user_id: The current user's ID.
            enterprise_id: The enterprise/tenant ID.

        Returns:
            Dict with keys: my_submissions, my_pending_reviews, board_queue.
        """
        # My submissions (most recent 20)
        my_submissions = (
            self.db.query(IrbSubmission)
            .filter(
                IrbSubmission.enterprise_id == enterprise_id,
                IrbSubmission.submitted_by_id == user_id,
            )
            .order_by(IrbSubmission.created_at.desc())
            .limit(20)
            .all()
        )

        # My pending reviews (not yet completed)
        pending_reviews = (
            self.db.query(IrbReview)
            .filter(
                IrbReview.reviewer_id == user_id,
                IrbReview.completed_at.is_(None),
            )
            .all()
        )
        pending_submission_ids = [r.submission_id for r in pending_reviews]
        my_pending_reviews: list[IrbSubmission] = []
        if pending_submission_ids:
            my_pending_reviews = (
                self.db.query(IrbSubmission)
                .filter(IrbSubmission.id.in_(pending_submission_ids))
                .all()
            )

        # Board queue: submissions for boards the user is a member of
        member_records = (
            self.db.query(IrbBoardMember)
            .filter(
                IrbBoardMember.user_id == user_id,
                IrbBoardMember.is_active.is_(True),
            )
            .all()
        )
        board_ids = [m.board_id for m in member_records]
        board_queue: list[IrbSubmission] = []
        if board_ids:
            active_statuses = [
                "submitted",
                "in_triage",
                "assigned_to_main",
                "under_review",
            ]
            board_queue = (
                self.db.query(IrbSubmission)
                .filter(
                    IrbSubmission.board_id.in_(board_ids),
                    IrbSubmission.status.in_(active_statuses),
                )
                .order_by(IrbSubmission.created_at.desc())
                .all()
            )

        return {
            "my_submissions": my_submissions,
            "my_pending_reviews": my_pending_reviews,
            "board_queue": board_queue,
        }
