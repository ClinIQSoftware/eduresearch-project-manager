"""File routes for EduResearch Project Manager.

Handles file upload, download, and management for projects.
"""

from typing import List

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    UploadFile,
    File,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload

from app.api.deps import (
    get_current_user,
    get_tenant_db,
    is_project_member,
    require_project_member,
)
from app.models.project_file import ProjectFile
from app.models.project import Project
from app.models.user import User
from app.schemas import (
    FileUploadResponse,
    FileWithUploader,
)
from app.services import FileService, EmailService

router = APIRouter()


@router.post("/project/{project_id}", response_model=FileUploadResponse)
async def upload_file(
    project_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    project: Project = Depends(require_project_member),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Upload a file to a project. Notifies project lead via email with attachment."""
    file_service = FileService(db)

    try:
        project_file = await file_service.upload_file(project_id, file, current_user)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Email lead with attachment
    if project.lead_id and project.lead_id != current_user.id:
        lead = db.query(User).filter(User.id == project.lead_id).first()
        if lead:
            try:
                file_content = await file_service.read_file_content(
                    project_file.file_path
                )
                email_service = EmailService(db)
                background_tasks.add_task(
                    email_service.send_file_upload_notification,
                    lead.email,
                    project.title,
                    current_user.name,
                    file.filename,
                    file_content,
                )
            except Exception:
                pass  # Don't fail upload if email fails

    return project_file


@router.get("/project/{project_id}", response_model=List[FileWithUploader])
def get_project_files(
    project_id: int,
    _project: Project = Depends(require_project_member),
    db: Session = Depends(get_tenant_db),
):
    """Get all files for a project."""
    files = (
        db.query(ProjectFile)
        .options(joinedload(ProjectFile.uploaded_by))
        .filter(ProjectFile.project_id == project_id)
        .order_by(ProjectFile.uploaded_at.desc())
        .all()
    )

    return files


@router.get("/{file_id}", response_model=FileWithUploader)
def get_file_info(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Get file info by ID."""
    project_file = (
        db.query(ProjectFile)
        .options(joinedload(ProjectFile.uploaded_by))
        .filter(ProjectFile.id == file_id)
        .first()
    )

    if not project_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    # Check membership (file-level routes lack project_id in path, so inline check)
    if not current_user.is_superuser:
        if not is_project_member(db, current_user.id, project_file.project_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
            )

    return project_file


@router.get("/{file_id}/download")
async def download_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Download a file."""
    project_file = db.query(ProjectFile).filter(ProjectFile.id == file_id).first()
    if not project_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    # Check access
    if not current_user.is_superuser:
        if not is_project_member(db, current_user.id, project_file.project_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
            )

    import os

    if not os.path.exists(project_file.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk"
        )

    return FileResponse(
        path=project_file.file_path,
        filename=project_file.original_filename,
        media_type=project_file.content_type or "application/octet-stream",
    )


@router.delete("/{file_id}")
def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_tenant_db),
):
    """Delete a file (lead or uploader only)."""
    project_file = db.query(ProjectFile).filter(ProjectFile.id == file_id).first()
    if not project_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    project = db.query(Project).filter(Project.id == project_file.project_id).first()

    # Check permissions - lead or uploader can delete
    can_delete = (
        current_user.is_superuser
        or (project and project.lead_id == current_user.id)
        or project_file.uploaded_by_id == current_user.id
    )

    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    file_service = FileService(db)

    try:
        file_service.delete_file(file_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {"message": "File deleted successfully"}
