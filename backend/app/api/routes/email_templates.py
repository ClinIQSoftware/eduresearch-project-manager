"""API routes for managing email templates."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from pathlib import Path
import logging

from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_user
from app.services.email import jinja_env, TEMPLATES_DIR

logger = logging.getLogger(__name__)

router = APIRouter()


class EmailTemplateInfo(BaseModel):
    """Basic template information."""
    name: str
    filename: str
    description: str
    variables: List[str]


class EmailTemplateContent(BaseModel):
    """Full template content."""
    name: str
    filename: str
    description: str
    variables: List[str]
    content: str


class EmailTemplateUpdate(BaseModel):
    """Request to update a template."""
    content: str


class EmailTemplatePreview(BaseModel):
    """Request to preview a template."""
    template_name: str
    sample_data: Optional[dict] = None


class EmailTemplatePreviewResponse(BaseModel):
    """Preview response."""
    html: str
    subject: str


# Template metadata - describes each template
TEMPLATE_METADATA = {
    "meeting_reminder.html": {
        "name": "Meeting Reminder",
        "description": "Sent to project members when a meeting is approaching",
        "variables": ["project_title", "meeting_date", "days_until", "project_id", "app_url"],
        "sample_data": {
            "project_title": "AI Research Project",
            "meeting_date": "Wednesday, January 22, 2025",
            "days_until": 1,
            "project_id": 1,
            "app_url": "http://localhost:8080"
        },
        "subject_template": "[EduResearch] Meeting Reminder: {project_title} - {days_text}"
    },
    "deadline_reminder.html": {
        "name": "Deadline Reminder",
        "description": "Sent to project members when a project deadline is approaching",
        "variables": ["project_title", "deadline_date", "days_until", "is_urgent", "project_id", "app_url", "task_summary"],
        "sample_data": {
            "project_title": "AI Research Project",
            "deadline_date": "Friday, January 24, 2025",
            "days_until": 3,
            "is_urgent": False,
            "project_id": 1,
            "app_url": "http://localhost:8080",
            "task_summary": {
                "total": 10,
                "completed": 6,
                "in_progress": 2,
                "pending": 2
            }
        },
        "subject_template": "[EduResearch] Deadline Reminder: {project_title} - in {days_until} days"
    },
    "base.html": {
        "name": "Base Template",
        "description": "Base template that other templates extend. Changes here affect all emails.",
        "variables": ["title", "header_color"],
        "sample_data": {},
        "subject_template": "Base Template (not sent directly)"
    }
}


def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Require the current user to be a superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage email templates"
        )
    return current_user


@router.get("", response_model=List[EmailTemplateInfo])
def list_templates(
    current_user: User = Depends(require_superuser)
):
    """List all available email templates."""
    templates = []

    for filename, metadata in TEMPLATE_METADATA.items():
        templates.append(EmailTemplateInfo(
            name=metadata["name"],
            filename=filename,
            description=metadata["description"],
            variables=metadata["variables"]
        ))

    return templates


@router.get("/{filename}", response_model=EmailTemplateContent)
def get_template(
    filename: str,
    current_user: User = Depends(require_superuser)
):
    """Get a specific template's content."""
    if filename not in TEMPLATE_METADATA:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{filename}' not found"
        )

    template_path = TEMPLATES_DIR / filename
    if not template_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template file '{filename}' not found on disk"
        )

    content = template_path.read_text(encoding="utf-8")
    metadata = TEMPLATE_METADATA[filename]

    return EmailTemplateContent(
        name=metadata["name"],
        filename=filename,
        description=metadata["description"],
        variables=metadata["variables"],
        content=content
    )


@router.put("/{filename}")
def update_template(
    filename: str,
    update: EmailTemplateUpdate,
    current_user: User = Depends(require_superuser)
):
    """Update a template's content."""
    if filename not in TEMPLATE_METADATA:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{filename}' not found"
        )

    template_path = TEMPLATES_DIR / filename

    # Validate the template by trying to compile it
    try:
        from jinja2 import Environment
        env = Environment()
        env.parse(update.content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Jinja2 template syntax: {str(e)}"
        )

    # Write the updated content
    try:
        template_path.write_text(update.content, encoding="utf-8")

        # Reload the template in the jinja environment
        jinja_env.cache.clear() if hasattr(jinja_env, 'cache') and jinja_env.cache else None

        logger.info(f"Template '{filename}' updated by user {current_user.email}")

        return {"message": f"Template '{filename}' updated successfully"}
    except Exception as e:
        logger.error(f"Failed to update template '{filename}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save template: {str(e)}"
        )


@router.post("/preview", response_model=EmailTemplatePreviewResponse)
def preview_template(
    preview: EmailTemplatePreview,
    current_user: User = Depends(require_superuser)
):
    """Preview a template with sample data."""
    filename = preview.template_name

    if filename not in TEMPLATE_METADATA:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{filename}' not found"
        )

    metadata = TEMPLATE_METADATA[filename]

    # Use provided sample data or default
    sample_data = preview.sample_data or metadata.get("sample_data", {})

    # Add computed fields for meeting reminder
    if filename == "meeting_reminder.html":
        days_until = sample_data.get("days_until", 1)
        if days_until == 0:
            sample_data["days_text"] = "today"
        elif days_until == 1:
            sample_data["days_text"] = "tomorrow"
        else:
            sample_data["days_text"] = f"in {days_until} days"

    # Add computed fields for deadline reminder
    if filename == "deadline_reminder.html":
        days_until = sample_data.get("days_until", 3)
        sample_data["is_urgent"] = days_until == 0
        if days_until == 0:
            sample_data["days_text"] = "today"
        elif days_until == 1:
            sample_data["days_text"] = "tomorrow"
        else:
            sample_data["days_text"] = f"in {days_until} days"

    try:
        # Reload template to get latest version
        jinja_env.cache.clear() if hasattr(jinja_env, 'cache') and jinja_env.cache else None
        template = jinja_env.get_template(filename)
        html = template.render(**sample_data)

        # Generate subject
        subject_template = metadata.get("subject_template", "Preview")
        subject = subject_template.format(**sample_data) if sample_data else subject_template

        return EmailTemplatePreviewResponse(
            html=html,
            subject=subject
        )
    except Exception as e:
        logger.error(f"Failed to preview template '{filename}': {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to render template: {str(e)}"
        )


@router.post("/preview-custom")
def preview_custom_template(
    content: str,
    sample_data: Optional[dict] = None,
    current_user: User = Depends(require_superuser)
):
    """Preview custom template content without saving."""
    from jinja2 import Environment, BaseLoader

    try:
        env = Environment(loader=BaseLoader())
        template = env.from_string(content)
        html = template.render(**(sample_data or {}))

        return {"html": html}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template error: {str(e)}"
        )


@router.post("/{filename}/reset")
def reset_template(
    filename: str,
    current_user: User = Depends(require_superuser)
):
    """Reset a template to its default content."""
    if filename not in TEMPLATE_METADATA:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{filename}' not found"
        )

    # Default templates - these would ideally be stored somewhere safe
    # For now, we'll return an error suggesting manual reset
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Template reset not yet implemented. Please restore from version control."
    )
