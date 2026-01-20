from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app.models.project_file import ProjectFile
from app.models.project import Project
from app.models.user import User
from app.schemas.file import FileUploadResponse, FileWithUploader
from app.dependencies import get_current_user, is_project_member, is_project_lead
from app.services.files import save_uploaded_file, read_file, delete_file, get_content_type
from app.services.email import email_service
from app.services.notification_service import NotificationService
from app.config import settings

router = APIRouter()


def get_notification_service(db: Session) -> NotificationService:
    """Get notification service instance."""
    return NotificationService(db)


@router.post("/projects/{project_id}/files", response_model=FileUploadResponse)
async def upload_file(
    project_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a file to a project. Notifies project lead via email with attachment."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if user has access (member or lead)
    if not current_user.is_superuser:
        if not is_project_lead(db, current_user.id, project_id) and \
           not is_project_member(db, current_user.id, project_id):
            raise HTTPException(status_code=403, detail="Access denied")

    try:
        # Save file
        stored_filename, file_path, file_size = await save_uploaded_file(file, project_id)
        content_type = get_content_type(file.filename)

        # Create database record
        project_file = ProjectFile(
            project_id=project_id,
            uploaded_by_id=current_user.id,
            filename=stored_filename,
            original_filename=file.filename,
            file_path=file_path,
            file_size=file_size,
            content_type=content_type
        )
        db.add(project_file)
        db.commit()
        db.refresh(project_file)

        # Email lead with attachment
        if project.lead_id and project.lead_id != current_user.id:
            lead = db.query(User).filter(User.id == project.lead_id).first()
            if lead:
                file_content = await read_file(file_path)
                background_tasks.add_task(
                    email_service.send_file_upload_notification,
                    lead.email,
                    project.title,
                    current_user.name,
                    file.filename,
                    file_content
                )

        # Send in-app notifications to all project members
        notification_service = get_notification_service(db)
        background_tasks.add_task(
            notification_service.notify_file_uploaded,
            project,
            file.filename,
            current_user
        )

        return project_file

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.get("/projects/{project_id}/files", response_model=List[FileWithUploader])
def get_project_files(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all files for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    files = db.query(ProjectFile).options(
        joinedload(ProjectFile.uploaded_by)
    ).filter(ProjectFile.project_id == project_id).order_by(
        ProjectFile.uploaded_at.desc()
    ).all()

    return files


@router.get("/files/{file_id}/download")
async def download_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download a file."""
    project_file = db.query(ProjectFile).filter(ProjectFile.id == file_id).first()
    if not project_file:
        raise HTTPException(status_code=404, detail="File not found")

    # Check access
    if not current_user.is_superuser:
        if not is_project_lead(db, current_user.id, project_file.project_id) and \
           not is_project_member(db, current_user.id, project_file.project_id):
            raise HTTPException(status_code=403, detail="Access denied")

    import os
    if not os.path.exists(project_file.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=project_file.file_path,
        filename=project_file.original_filename,
        media_type=project_file.content_type or "application/octet-stream"
    )


@router.delete("/files/{file_id}")
def delete_project_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a file (lead or uploader only)."""
    project_file = db.query(ProjectFile).filter(ProjectFile.id == file_id).first()
    if not project_file:
        raise HTTPException(status_code=404, detail="File not found")

    project = db.query(Project).filter(Project.id == project_file.project_id).first()

    # Check permissions - lead or uploader can delete
    can_delete = (
        current_user.is_superuser or
        project.lead_id == current_user.id or
        project_file.uploaded_by_id == current_user.id
    )

    if not can_delete:
        raise HTTPException(status_code=403, detail="Access denied")

    # Delete from filesystem
    delete_file(project_file.file_path)

    # Delete from database
    db.delete(project_file)
    db.commit()

    return {"message": "File deleted successfully"}
