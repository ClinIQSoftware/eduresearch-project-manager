from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from fastapi import Request

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./eduresearch.db")

# SQLite needs special handling for foreign keys and check constraints
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_tenant_session(request: Request):
    """Get database session with tenant RLS context."""
    db = SessionLocal()
    try:
        if hasattr(request.state, "enterprise_id") and request.state.enterprise_id:
            db.execute(
                text("SELECT set_config('app.current_enterprise_id', :val, true)"),
                {"val": str(request.state.enterprise_id)}
            )
        yield db
    finally:
        db.close()


def get_platform_session():
    """Get database session without RLS context (for platform admin)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
