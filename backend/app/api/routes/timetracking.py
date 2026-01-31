from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.api.deps import get_tenant_db
from app.models.time_entry import TimeEntry
from app.schemas.time_entry import TimeEntryCreate, TimeEntryUpdate, TimeEntryResponse

router = APIRouter()


@router.get("/", response_model=List[TimeEntryResponse])
def get_time_entries(task_id: Optional[int] = None, db: Session = Depends(get_tenant_db)):
    query = db.query(TimeEntry)

    if task_id:
        query = query.filter(TimeEntry.task_id == task_id)

    return query.order_by(TimeEntry.start_time.desc()).all()


@router.get("/active", response_model=Optional[TimeEntryResponse])
def get_active_timer(db: Session = Depends(get_tenant_db)):
    return db.query(TimeEntry).filter(TimeEntry.end_time.is_(None)).first()


@router.post("/", response_model=TimeEntryResponse)
def create_time_entry(entry: TimeEntryCreate, db: Session = Depends(get_tenant_db)):
    # Check if there's already an active timer
    active = db.query(TimeEntry).filter(TimeEntry.end_time.is_(None)).first()
    if active:
        raise HTTPException(
            status_code=400, detail="There is already an active timer. Stop it first."
        )

    start_time = entry.start_time or datetime.utcnow()
    db_entry = TimeEntry(
        task_id=entry.task_id, start_time=start_time, notes=entry.notes
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.put("/{entry_id}", response_model=TimeEntryResponse)
def update_time_entry(
    entry_id: int, entry: TimeEntryUpdate, db: Session = Depends(get_tenant_db)
):
    db_entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Time entry not found")

    update_data = entry.model_dump(exclude_unset=True)

    # If ending the timer, calculate duration
    if "end_time" in update_data and update_data["end_time"]:
        end_time = update_data["end_time"]
        duration = (end_time - db_entry.start_time).total_seconds() / 60
        update_data["duration"] = duration

    for key, value in update_data.items():
        setattr(db_entry, key, value)

    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.post("/{entry_id}/stop", response_model=TimeEntryResponse)
def stop_timer(entry_id: int, db: Session = Depends(get_tenant_db)):
    db_entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Time entry not found")

    if db_entry.end_time:
        raise HTTPException(status_code=400, detail="Timer already stopped")

    end_time = datetime.utcnow()
    duration = (end_time - db_entry.start_time).total_seconds() / 60

    db_entry.end_time = end_time
    db_entry.duration = duration

    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.delete("/{entry_id}")
def delete_time_entry(entry_id: int, db: Session = Depends(get_tenant_db)):
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")

    db.delete(entry)
    db.commit()
    return {"message": "Time entry deleted successfully"}
