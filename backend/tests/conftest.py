"""Test configuration and fixtures for authorization / tenant isolation tests.

Uses an in-memory SQLite database with FastAPI TestClient.
"""

import uuid
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database import Base
from app.main import app
from app.api.deps import get_db, get_tenant_db, get_unscoped_db
from app.middleware.tenant import tenant_context_var


# ── In-memory SQLite engine ──────────────────────────────────────────────────

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Enable foreign keys for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Fixtures ─────────────────────────────────────────────────────────────────

ENTERPRISE_A_ID = uuid.uuid4()
ENTERPRISE_B_ID = uuid.uuid4()


@pytest.fixture(autouse=True)
def setup_database():
    """Create all tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def override_get_tenant_db_factory(enterprise_id: uuid.UUID):
    """Create a tenant-scoped DB override that sets RLS context.

    SQLite doesn't support set_config, so we skip the RLS call
    but still track which enterprise the session is scoped to.
    """
    def override():
        db = TestingSessionLocal()
        try:
            # Store enterprise_id on session for test assertions
            db._test_enterprise_id = enterprise_id
            yield db
        finally:
            db.close()
    return override


@pytest.fixture()
def db() -> Generator[Session, None, None]:
    """Provide a test database session."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def enterprise_a(db: Session):
    """Create Enterprise A."""
    from app.models.enterprise import Enterprise
    ent = Enterprise(id=ENTERPRISE_A_ID, slug="alpha", name="Alpha Corp", is_active=True)
    db.add(ent)
    db.commit()
    db.refresh(ent)
    return ent


@pytest.fixture()
def enterprise_b(db: Session):
    """Create Enterprise B."""
    from app.models.enterprise import Enterprise
    ent = Enterprise(id=ENTERPRISE_B_ID, slug="beta", name="Beta Corp", is_active=True)
    db.add(ent)
    db.commit()
    db.refresh(ent)
    return ent


@pytest.fixture()
def user_a(db: Session, enterprise_a):
    """Create a regular user in Enterprise A."""
    from app.models.user import User
    user = User(
        email="alice@alpha.com",
        first_name="Alice",
        last_name="Alpha",
        password_hash="$2b$12$dummyhashnotarealpasswordhash00000",
        is_active=True,
        is_approved=True,
        enterprise_id=enterprise_a.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def user_b(db: Session, enterprise_b):
    """Create a regular user in Enterprise B."""
    from app.models.user import User
    user = User(
        email="bob@beta.com",
        first_name="Bob",
        last_name="Beta",
        password_hash="$2b$12$dummyhashnotarealpasswordhash00000",
        is_active=True,
        is_approved=True,
        enterprise_id=enterprise_b.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def superuser_a(db: Session, enterprise_a):
    """Create a superuser in Enterprise A."""
    from app.models.user import User
    user = User(
        email="admin@alpha.com",
        first_name="Admin",
        last_name="Alpha",
        password_hash="$2b$12$dummyhashnotarealpasswordhash00000",
        is_active=True,
        is_approved=True,
        is_superuser=True,
        enterprise_id=enterprise_a.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def project_a(db: Session, enterprise_a, user_a):
    """Create a project in Enterprise A with user_a as lead."""
    from app.models.project import Project
    from app.models.project_member import ProjectMember
    project = Project(
        title="Alpha Project",
        enterprise_id=enterprise_a.id,
        lead_id=user_a.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Add user_a as lead member
    member = ProjectMember(
        project_id=project.id,
        user_id=user_a.id,
        role="lead",
        enterprise_id=enterprise_a.id,
    )
    db.add(member)
    db.commit()

    return project


@pytest.fixture()
def project_b(db: Session, enterprise_b, user_b):
    """Create a project in Enterprise B with user_b as lead."""
    from app.models.project import Project
    from app.models.project_member import ProjectMember
    project = Project(
        title="Beta Project",
        enterprise_id=enterprise_b.id,
        lead_id=user_b.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    member = ProjectMember(
        project_id=project.id,
        user_id=user_b.id,
        role="lead",
        enterprise_id=enterprise_b.id,
    )
    db.add(member)
    db.commit()

    return project


def make_token(user, enterprise_id: uuid.UUID) -> str:
    """Create a JWT token for a test user."""
    return create_access_token(
        data={
            "sub": str(user.id),
            "enterprise_id": str(enterprise_id),
        }
    )


def make_client(enterprise_id: uuid.UUID) -> TestClient:
    """Create a TestClient scoped to a specific enterprise.

    Overrides DB dependencies and sets the enterprise slug header.
    """
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_unscoped_db] = override_get_db
    app.dependency_overrides[get_tenant_db] = override_get_tenant_db_factory(enterprise_id)

    client = TestClient(app, headers={"X-Enterprise-Slug": "default"})
    return client


@pytest.fixture(autouse=True)
def cleanup_overrides():
    """Clean up dependency overrides after each test."""
    yield
    app.dependency_overrides.clear()
