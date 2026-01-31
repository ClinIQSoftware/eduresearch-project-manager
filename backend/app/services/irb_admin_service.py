"""IRB Admin service for managing IRB members, assignments, and reporting."""

import logging
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, case, extract
from sqlalchemy.orm import Session, joinedload

from app.models.irb import (
    IrbBoard,
    IrbBoardMember,
    IrbDecision,
    IrbReview,
    IrbSubmission,
    IrbSubmissionHistory,
)
from app.models.user import User

logger = logging.getLogger(__name__)


class IrbAdminService:
    """Service for IRB administration operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_dashboard_stats(self, enterprise_id: UUID) -> dict:
        """Get IRB admin dashboard statistics."""
        # Count submissions by status
        status_counts = (
            self.db.query(
                IrbSubmission.status,
                func.count(IrbSubmission.id).label("count"),
            )
            .filter(IrbSubmission.enterprise_id == enterprise_id)
            .group_by(IrbSubmission.status)
            .all()
        )
        submissions_by_status = {row.status: row.count for row in status_counts}

        total = sum(submissions_by_status.values())
        pending = submissions_by_status.get("submitted", 0) + submissions_by_status.get("in_triage", 0)
        in_review = (
            submissions_by_status.get("assigned_to_main", 0)
            + submissions_by_status.get("under_review", 0)
        )
        completed = (
            submissions_by_status.get("accepted", 0)
            + submissions_by_status.get("declined", 0)
            + submissions_by_status.get("decision_made", 0)
        )

        # Count boards and members
        total_boards = (
            self.db.query(func.count(IrbBoard.id))
            .filter(IrbBoard.enterprise_id == enterprise_id, IrbBoard.is_active.is_(True))
            .scalar() or 0
        )
        total_members = (
            self.db.query(func.count(User.id))
            .filter(User.enterprise_id == enterprise_id, User.irb_role.isnot(None))
            .scalar() or 0
        )

        # Average review turnaround (submissions with decided_at)
        avg_review = (
            self.db.query(
                func.avg(
                    extract("epoch", IrbSubmission.decided_at)
                    - extract("epoch", IrbSubmission.submitted_at)
                )
            )
            .filter(
                IrbSubmission.enterprise_id == enterprise_id,
                IrbSubmission.decided_at.isnot(None),
                IrbSubmission.submitted_at.isnot(None),
            )
            .scalar()
        )
        avg_review_days = round(avg_review / 86400, 1) if avg_review else None

        # Recent activity (last 10 history entries)
        recent = (
            self.db.query(IrbSubmissionHistory)
            .filter(IrbSubmissionHistory.enterprise_id == enterprise_id)
            .order_by(IrbSubmissionHistory.created_at.desc())
            .limit(10)
            .all()
        )
        recent_activity = [
            {
                "id": h.id,
                "submission_id": str(h.submission_id),
                "from_status": h.from_status,
                "to_status": h.to_status,
                "changed_by_id": h.changed_by_id,
                "note": h.note,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
            for h in recent
        ]

        return {
            "total_submissions": total,
            "pending_submissions": pending,
            "in_review_submissions": in_review,
            "completed_submissions": completed,
            "total_boards": total_boards,
            "total_members": total_members,
            "avg_review_days": avg_review_days,
            "submissions_by_status": submissions_by_status,
            "recent_activity": recent_activity,
        }

    def list_members(self, enterprise_id: UUID) -> List[dict]:
        """List all IRB members with their board memberships and review stats."""
        members = (
            self.db.query(User)
            .filter(User.enterprise_id == enterprise_id, User.irb_role.isnot(None))
            .all()
        )

        result = []
        for user in members:
            # Get board memberships
            board_memberships = (
                self.db.query(IrbBoardMember)
                .options(joinedload(IrbBoardMember.board))
                .filter(
                    IrbBoardMember.user_id == user.id,
                    IrbBoardMember.enterprise_id == enterprise_id,
                    IrbBoardMember.is_active.is_(True),
                )
                .all()
            )
            boards = [
                {
                    "board_id": str(bm.board_id),
                    "board_name": bm.board.name if bm.board else None,
                    "role": bm.role,
                }
                for bm in board_memberships
            ]

            # Count reviews
            pending_reviews = (
                self.db.query(func.count(IrbReview.id))
                .filter(
                    IrbReview.reviewer_id == user.id,
                    IrbReview.enterprise_id == enterprise_id,
                    IrbReview.completed_at.is_(None),
                )
                .scalar() or 0
            )
            completed_reviews = (
                self.db.query(func.count(IrbReview.id))
                .filter(
                    IrbReview.reviewer_id == user.id,
                    IrbReview.enterprise_id == enterprise_id,
                    IrbReview.completed_at.isnot(None),
                )
                .scalar() or 0
            )

            result.append({
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "irb_role": user.irb_role,
                "boards": boards,
                "pending_reviews": pending_reviews,
                "completed_reviews": completed_reviews,
            })

        return result

    def set_member_role(self, enterprise_id: UUID, user_id: int, irb_role: str) -> User:
        """Set IRB role on a user."""
        user = (
            self.db.query(User)
            .filter(User.id == user_id, User.enterprise_id == enterprise_id)
            .first()
        )
        if not user:
            return None
        user.irb_role = irb_role
        self.db.commit()
        self.db.refresh(user)
        return user

    def remove_member_role(self, enterprise_id: UUID, user_id: int) -> User:
        """Remove IRB role from a user."""
        user = (
            self.db.query(User)
            .filter(User.id == user_id, User.enterprise_id == enterprise_id)
            .first()
        )
        if not user:
            return None
        user.irb_role = None
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_all_submissions(
        self,
        enterprise_id: UUID,
        board_id: Optional[UUID] = None,
        status: Optional[str] = None,
    ) -> List[IrbSubmission]:
        """Get all submissions with optional filters."""
        query = (
            self.db.query(IrbSubmission)
            .filter(IrbSubmission.enterprise_id == enterprise_id)
        )
        if board_id:
            query = query.filter(IrbSubmission.board_id == board_id)
        if status:
            query = query.filter(IrbSubmission.status == status)
        return query.order_by(IrbSubmission.created_at.desc()).all()

    def assign_reviewers(
        self, enterprise_id: UUID, submission_id: UUID, reviewer_ids: List[int]
    ) -> List[IrbReview]:
        """Assign reviewers to a submission."""
        submission = (
            self.db.query(IrbSubmission)
            .filter(
                IrbSubmission.id == submission_id,
                IrbSubmission.enterprise_id == enterprise_id,
            )
            .first()
        )
        if not submission:
            return []

        created_reviews = []
        for reviewer_id in reviewer_ids:
            # Check if review already exists
            existing = (
                self.db.query(IrbReview)
                .filter(
                    IrbReview.submission_id == submission_id,
                    IrbReview.reviewer_id == reviewer_id,
                )
                .first()
            )
            if existing:
                continue

            # Determine role from board membership
            board_member = (
                self.db.query(IrbBoardMember)
                .filter(
                    IrbBoardMember.board_id == submission.board_id,
                    IrbBoardMember.user_id == reviewer_id,
                    IrbBoardMember.is_active.is_(True),
                )
                .first()
            )
            role = board_member.role if board_member else "associate_reviewer"

            review = IrbReview(
                submission_id=submission_id,
                reviewer_id=reviewer_id,
                enterprise_id=enterprise_id,
                role=role,
            )
            self.db.add(review)
            created_reviews.append(review)

        if created_reviews:
            self.db.commit()
            for r in created_reviews:
                self.db.refresh(r)

        return created_reviews

    def get_reports(self, enterprise_id: UUID) -> dict:
        """Get IRB reporting data."""
        # Submissions over time (last 12 months, grouped by month)
        twelve_months_ago = datetime.utcnow() - timedelta(days=365)
        monthly = (
            self.db.query(
                extract("year", IrbSubmission.created_at).label("year"),
                extract("month", IrbSubmission.created_at).label("month"),
                func.count(IrbSubmission.id).label("count"),
            )
            .filter(
                IrbSubmission.enterprise_id == enterprise_id,
                IrbSubmission.created_at >= twelve_months_ago,
            )
            .group_by("year", "month")
            .order_by("year", "month")
            .all()
        )
        submissions_over_time = [
            {"year": int(row.year), "month": int(row.month), "count": row.count}
            for row in monthly
        ]

        # Reviewer workload
        workload = (
            self.db.query(
                IrbReview.reviewer_id,
                func.count(IrbReview.id).label("total"),
                func.count(case((IrbReview.completed_at.isnot(None), 1))).label("completed"),
                func.count(case((IrbReview.completed_at.is_(None), 1))).label("pending"),
            )
            .filter(IrbReview.enterprise_id == enterprise_id)
            .group_by(IrbReview.reviewer_id)
            .all()
        )
        reviewer_workload = []
        for row in workload:
            user = self.db.query(User).filter(User.id == row.reviewer_id).first()
            reviewer_workload.append({
                "reviewer_id": row.reviewer_id,
                "reviewer_name": f"{user.first_name} {user.last_name}" if user else "Unknown",
                "total": row.total,
                "completed": row.completed,
                "pending": row.pending,
            })

        # Average turnaround
        avg_turnaround = (
            self.db.query(
                func.avg(
                    extract("epoch", IrbSubmission.decided_at)
                    - extract("epoch", IrbSubmission.submitted_at)
                )
            )
            .filter(
                IrbSubmission.enterprise_id == enterprise_id,
                IrbSubmission.decided_at.isnot(None),
                IrbSubmission.submitted_at.isnot(None),
            )
            .scalar()
        )
        avg_turnaround_days = round(avg_turnaround / 86400, 1) if avg_turnaround else None

        # Decision breakdown
        decisions = (
            self.db.query(
                IrbDecision.decision,
                func.count(IrbDecision.id).label("count"),
            )
            .filter(IrbDecision.enterprise_id == enterprise_id)
            .group_by(IrbDecision.decision)
            .all()
        )
        decisions_breakdown = {row.decision: row.count for row in decisions}

        # Submissions by board
        by_board = (
            self.db.query(
                IrbBoard.name,
                func.count(IrbSubmission.id).label("count"),
            )
            .join(IrbSubmission, IrbSubmission.board_id == IrbBoard.id)
            .filter(IrbBoard.enterprise_id == enterprise_id)
            .group_by(IrbBoard.name)
            .all()
        )
        submissions_by_board = [
            {"board_name": row.name, "count": row.count}
            for row in by_board
        ]

        return {
            "submissions_over_time": submissions_over_time,
            "reviewer_workload": reviewer_workload,
            "avg_turnaround_days": avg_turnaround_days,
            "decisions_breakdown": decisions_breakdown,
            "submissions_by_board": submissions_by_board,
        }
