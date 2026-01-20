"""Base repository with generic CRUD operations."""
from typing import Generic, List, Optional, Type, TypeVar

from sqlalchemy.orm import Session

from app.database import Base

T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    """Generic base repository providing common CRUD operations.

    Type Parameters:
        T: The SQLAlchemy model type this repository manages.
    """

    def __init__(self, db: Session, model: Type[T]) -> None:
        """Initialize the repository.

        Args:
            db: SQLAlchemy database session.
            model: The model class this repository manages.
        """
        self.db = db
        self.model = model

    def get_by_id(self, entity_id: int) -> Optional[T]:
        """Get a single record by its ID.

        Args:
            entity_id: The primary key ID of the record.

        Returns:
            The record if found, None otherwise.
        """
        return self.db.query(self.model).filter(self.model.id == entity_id).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Get all records with pagination.

        Args:
            skip: Number of records to skip (for pagination).
            limit: Maximum number of records to return.

        Returns:
            List of records.
        """
        return self.db.query(self.model).offset(skip).limit(limit).all()

    def create(self, data: dict) -> T:
        """Create a new record.

        Args:
            data: Dictionary of field values for the new record.

        Returns:
            The newly created record.
        """
        db_obj = self.model(**data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def update(self, entity_id: int, data: dict) -> Optional[T]:
        """Update an existing record.

        Args:
            entity_id: The primary key ID of the record to update.
            data: Dictionary of field values to update.

        Returns:
            The updated record if found, None otherwise.
        """
        db_obj = self.get_by_id(entity_id)
        if db_obj is None:
            return None

        for key, value in data.items():
            if hasattr(db_obj, key):
                setattr(db_obj, key, value)

        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, entity_id: int) -> bool:
        """Delete a record by its ID.

        Args:
            entity_id: The primary key ID of the record to delete.

        Returns:
            True if the record was deleted, False if not found.
        """
        db_obj = self.get_by_id(entity_id)
        if db_obj is None:
            return False

        self.db.delete(db_obj)
        self.db.commit()
        return True

    def count(self) -> int:
        """Get the total count of records.

        Returns:
            The number of records in the table.
        """
        return self.db.query(self.model).count()
