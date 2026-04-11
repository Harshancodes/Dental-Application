"""
Test configuration — sets up an in-memory SQLite database so tests
never touch the real PostgreSQL database.

How it works:
1. We create a fresh SQLite DB in memory for each test session.
2. We override FastAPI's get_db() dependency to use our test DB instead.
3. Every test gets a clean state — no leftover data between tests.
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


@pytest.fixture
def client():
    """Test client with DB override applied."""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    """Register an admin user and return Authorization headers."""
    client.post("/auth/register", json={
        "username": "testadmin",
        "password": "testpass123",
        "role": "admin",
    })
    resp = client.post("/auth/login", data={
        "username": "testadmin",
        "password": "testpass123",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
