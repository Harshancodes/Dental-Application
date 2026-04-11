"""
Test configuration — sets up an in-memory SQLite database so tests
never touch the real PostgreSQL database.

How it works:
1. We create a fresh SQLite DB in memory for each test session.
2. We override FastAPI's get_db() dependency to use our test DB instead.
3. The rate limiter is disabled so login calls don't trip their own limit.
4. auth_headers is session-scoped — we log in once and reuse the token.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app

# SQLite in-memory database — fast, no setup required, isolated
TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def override_get_db():
    """Replace the real DB session with a test session."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables once before tests run, drop them after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session", autouse=True)
def disable_rate_limiter():
    """
    Turn off the rate limiter for the entire test session.
    Without this, the login endpoint (10/minute) would block
    the auth_headers fixture after ~10 test functions.
    """
    app.state.limiter.enabled = False
    yield
    app.state.limiter.enabled = True


@pytest.fixture
def client():
    """Test client with DB override applied."""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def session_client():
    """
    A single TestClient shared across the whole session.
    Used by auth_headers so we only log in once.
    """
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def auth_headers(session_client):
    """
    Register an admin user and return Authorization headers.
    Session-scoped — runs once and reuses the token for all tests.
    """
    session_client.post("/auth/register", json={
        "username": "testadmin",
        "password": "testpass123",
        "role": "admin",
    })
    resp = session_client.post("/auth/login", data={
        "username": "testadmin",
        "password": "testpass123",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
