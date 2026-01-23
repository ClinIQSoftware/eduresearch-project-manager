from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime
from app.api.deps import get_db, get_current_user
from app.models.project import Project
from app.models.user import User
from app.models.user_keyword import UserKeyword
from app.models.user_alert_preference import UserAlertPreference
from app.schemas.keyword import (
    KeywordCreate, KeywordResponse, KeywordListResponse, KeywordBulkUpdate,
    AlertPreferenceUpdate, AlertPreferenceResponse, MatchedProjectResponse,
    SendAlertsRequest
)
from app.services import EmailService
from app.config import settings

router = APIRouter()

MAX_KEYWORDS_PER_USER = 20


def get_matched_keywords_for_project(project: Project, keywords: List[str]) -> List[str]:
    """Return which keywords match a project's title or description."""
    matched = []
    title = (project.title or "").lower()
    description = (project.description or "").lower()

    for keyword in keywords:
        kw_lower = keyword.lower()
        if kw_lower in title or kw_lower in description:
            matched.append(keyword)

    return matched


def search_projects_by_keywords(db: Session, keywords: List[str]) -> List[Project]:
    """Search projects by keywords matching title or description."""
    if not keywords:
        return []

    conditions = []
    for keyword in keywords:
        pattern = f"%{keyword}%"
        conditions.append(Project.title.ilike(pattern))
        conditions.append(Project.description.ilike(pattern))

    return db.query(Project).options(
        joinedload(Project.lead),
        joinedload(Project.institution),
        joinedload(Project.department)
    ).filter(or_(*conditions)).order_by(Project.created_at.desc()).all()


@router.get("", response_model=KeywordListResponse)
def get_keywords(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's keywords."""
    keywords = db.query(UserKeyword).filter(
        UserKeyword.user_id == current_user.id
    ).order_by(UserKeyword.created_at.desc()).all()

    return KeywordListResponse(keywords=keywords)


@router.post("", response_model=KeywordResponse)
def add_keyword(
    keyword_data: KeywordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new keyword. Max 20 keywords per user."""
    # Check limit
    count = db.query(UserKeyword).filter(
        UserKeyword.user_id == current_user.id
    ).count()

    if count >= MAX_KEYWORDS_PER_USER:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum of {MAX_KEYWORDS_PER_USER} keywords allowed"
        )

    # Check for duplicate
    existing = db.query(UserKeyword).filter(
        UserKeyword.user_id == current_user.id,
        UserKeyword.keyword.ilike(keyword_data.keyword)
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Keyword already exists"
        )

    keyword = UserKeyword(
        user_id=current_user.id,
        keyword=keyword_data.keyword.strip()
    )
    db.add(keyword)
    db.commit()
    db.refresh(keyword)

    return keyword


@router.delete("/{keyword_id}")
def delete_keyword(
    keyword_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a keyword."""
    keyword = db.query(UserKeyword).filter(
        UserKeyword.id == keyword_id,
        UserKeyword.user_id == current_user.id
    ).first()

    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")

    db.delete(keyword)
    db.commit()

    return {"message": "Keyword deleted successfully"}


@router.put("/bulk", response_model=KeywordListResponse)
def bulk_update_keywords(
    data: KeywordBulkUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Replace all keywords with new list. Max 20 keywords."""
    if len(data.keywords) > MAX_KEYWORDS_PER_USER:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum of {MAX_KEYWORDS_PER_USER} keywords allowed"
        )

    # Delete existing keywords
    db.query(UserKeyword).filter(
        UserKeyword.user_id == current_user.id
    ).delete()

    # Add new keywords (deduplicated)
    seen = set()
    new_keywords = []
    for kw in data.keywords:
        kw_lower = kw.lower().strip()
        if kw_lower and kw_lower not in seen:
            seen.add(kw_lower)
            keyword = UserKeyword(
                user_id=current_user.id,
                keyword=kw.strip()
            )
            db.add(keyword)
            new_keywords.append(keyword)

    db.commit()

    # Refresh to get IDs
    for kw in new_keywords:
        db.refresh(kw)

    return KeywordListResponse(keywords=new_keywords)


@router.get("/preferences", response_model=AlertPreferenceResponse)
def get_alert_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's alert preferences. Creates default if not exists."""
    pref = db.query(UserAlertPreference).filter(
        UserAlertPreference.user_id == current_user.id
    ).first()

    if not pref:
        # Create default preferences
        pref = UserAlertPreference(
            user_id=current_user.id,
            alert_frequency="weekly",
            dashboard_new_weeks=2
        )
        db.add(pref)
        db.commit()
        db.refresh(pref)

    return pref


@router.put("/preferences", response_model=AlertPreferenceResponse)
def update_alert_preferences(
    data: AlertPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update alert preferences."""
    pref = db.query(UserAlertPreference).filter(
        UserAlertPreference.user_id == current_user.id
    ).first()

    if not pref:
        pref = UserAlertPreference(user_id=current_user.id)
        db.add(pref)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pref, key, value)

    pref.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pref)

    return pref


@router.get("/matched-projects", response_model=List[MatchedProjectResponse])
def get_matched_projects(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all projects matching user's saved keywords."""
    # Get user's keywords
    user_keywords = db.query(UserKeyword).filter(
        UserKeyword.user_id == current_user.id
    ).all()

    if not user_keywords:
        return []

    keyword_list = [kw.keyword for kw in user_keywords]
    projects = search_projects_by_keywords(db, keyword_list)

    # Add matched keywords to each project
    results = []
    for project in projects[offset:offset + limit]:
        matched = get_matched_keywords_for_project(project, keyword_list)
        # Convert to dict and add matched_keywords
        project_dict = {
            "id": project.id,
            "title": project.title,
            "description": project.description,
            "color": project.color,
            "classification": project.classification,
            "status": project.status,
            "open_to_participants": project.open_to_participants,
            "start_date": project.start_date,
            "institution_id": project.institution_id,
            "department_id": project.department_id,
            "lead_id": project.lead_id,
            "last_status_change": project.last_status_change,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "institution": project.institution,
            "department": project.department,
            "lead": project.lead,
            "matched_keywords": matched
        }
        results.append(project_dict)

    return results


@router.get("/matched-projects/new", response_model=List[MatchedProjectResponse])
def get_new_matched_projects(
    weeks: Optional[int] = Query(default=None, ge=1, le=52, description="Number of weeks to look back (overrides user preference)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get new matched projects for dashboard (within specified or user's configured week range)."""
    # Use provided weeks or fall back to user's preferences
    if weeks is None:
        pref = db.query(UserAlertPreference).filter(
            UserAlertPreference.user_id == current_user.id
        ).first()
        weeks = pref.dashboard_new_weeks if pref else 2
    cutoff_date = datetime.utcnow() - timedelta(weeks=weeks)

    # Get user's keywords
    user_keywords = db.query(UserKeyword).filter(
        UserKeyword.user_id == current_user.id
    ).all()

    if not user_keywords:
        return []

    keyword_list = [kw.keyword for kw in user_keywords]

    # Build search conditions
    conditions = []
    for keyword in keyword_list:
        pattern = f"%{keyword}%"
        conditions.append(Project.title.ilike(pattern))
        conditions.append(Project.description.ilike(pattern))

    # Search with date filter
    projects = db.query(Project).options(
        joinedload(Project.lead),
        joinedload(Project.institution),
        joinedload(Project.department)
    ).filter(
        or_(*conditions),
        Project.created_at >= cutoff_date
    ).order_by(Project.created_at.desc()).limit(10).all()

    # Add matched keywords
    results = []
    for project in projects:
        matched = get_matched_keywords_for_project(project, keyword_list)
        project_dict = {
            "id": project.id,
            "title": project.title,
            "description": project.description,
            "color": project.color,
            "classification": project.classification,
            "status": project.status,
            "open_to_participants": project.open_to_participants,
            "start_date": project.start_date,
            "institution_id": project.institution_id,
            "department_id": project.department_id,
            "lead_id": project.lead_id,
            "last_status_change": project.last_status_change,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "institution": project.institution,
            "department": project.department,
            "lead": project.lead,
            "matched_keywords": matched
        }
        results.append(project_dict)

    return results


@router.post("/send-alerts")
async def send_scheduled_alerts(
    data: SendAlertsRequest,
    db: Session = Depends(get_db)
):
    """
    Cron-triggered endpoint to send scheduled keyword alert emails.
    Requires cron_secret for authentication.
    """
    # Validate cron secret
    if not settings.cron_secret or data.cron_secret != settings.cron_secret:
        raise HTTPException(
            status_code=403,
            detail="Invalid cron secret"
        )

    # Get users with matching frequency who have keywords
    query = db.query(UserAlertPreference).filter(
        UserAlertPreference.alert_frequency != "disabled"
    )

    if data.frequency:
        query = query.filter(UserAlertPreference.alert_frequency == data.frequency)

    preferences = query.all()

    alerts_sent = 0
    errors = []

    for pref in preferences:
        try:
            # Check if alert is due
            if not is_alert_due(pref):
                continue

            # Get user's keywords
            user_keywords = db.query(UserKeyword).filter(
                UserKeyword.user_id == pref.user_id
            ).all()

            if not user_keywords:
                continue

            keyword_list = [kw.keyword for kw in user_keywords]

            # Get new projects since last alert
            since_date = pref.last_alert_sent_at or (datetime.utcnow() - timedelta(days=30))

            # Build conditions
            conditions = []
            for keyword in keyword_list:
                pattern = f"%{keyword}%"
                conditions.append(Project.title.ilike(pattern))
                conditions.append(Project.description.ilike(pattern))

            # Query new matching projects
            projects_query = db.query(Project).options(
                joinedload(Project.lead),
                joinedload(Project.institution),
                joinedload(Project.department)
            ).filter(
                or_(*conditions),
                Project.created_at >= since_date
            )

            # Exclude previously sent projects
            if pref.last_alert_project_ids:
                projects_query = projects_query.filter(
                    ~Project.id.in_(pref.last_alert_project_ids)
                )

            new_projects = projects_query.all()

            if not new_projects:
                continue

            # Get user
            user = db.query(User).filter(User.id == pref.user_id).first()
            if not user or not user.email:
                continue

            # Prepare projects with matched keywords
            project_data = []
            for project in new_projects:
                matched = get_matched_keywords_for_project(project, keyword_list)
                project_data.append({
                    "project": project,
                    "matched_keywords": matched
                })

            # Build email content
            project_list_html = ""
            for item in project_data:
                p = item["project"]
                kws = ", ".join(item["matched_keywords"])
                project_list_html += f"<li><strong>{p.title}</strong> - matched keywords: {kws}</li>"

            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>New Projects Matching Your Keywords</h2>
                <p>Hello {user.name},</p>
                <p>We found {len(new_projects)} new project(s) matching your keywords:</p>
                <ul>{project_list_html}</ul>
                <p><a href="{settings.frontend_url}/projects">View Projects</a></p>
                <hr>
                <p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
            </body>
            </html>
            """

            # Send email using EmailService
            email_svc = EmailService(db)
            email_svc.send_email(
                to=user.email,
                subject=f"New Projects Matching Your Keywords ({pref.alert_frequency} digest)",
                html_content=html_content,
                institution_id=user.institution_id
            )

            # Update tracking
            pref.last_alert_sent_at = datetime.utcnow()
            pref.last_alert_project_ids = [p.id for p in new_projects]
            db.commit()

            alerts_sent += 1

        except Exception as e:
            errors.append(f"User {pref.user_id}: {str(e)}")

    return {
        "message": f"Processed alerts",
        "alerts_sent": alerts_sent,
        "errors": errors if errors else None
    }


def is_alert_due(pref: UserAlertPreference) -> bool:
    """Check if an alert is due based on frequency and last sent time."""
    if pref.alert_frequency == "disabled":
        return False

    if not pref.last_alert_sent_at:
        return True

    now = datetime.utcnow()
    last_sent = pref.last_alert_sent_at

    if pref.alert_frequency == "daily":
        return (now - last_sent) >= timedelta(days=1)
    elif pref.alert_frequency == "weekly":
        return (now - last_sent) >= timedelta(weeks=1)
    elif pref.alert_frequency == "monthly":
        return (now - last_sent) >= timedelta(days=30)

    return False
