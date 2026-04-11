"""
Tests for authentication endpoints.
Each test is a function — pytest finds them automatically (they start with test_).
"""


def test_register_success(client):
    """A new user can register successfully."""
    resp = client.post("/auth/register", json={
        "username": "newuser",
        "password": "password123",
        "role": "admin",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "newuser"
    assert "hashed_password" not in data  # Password must never be returned


def test_register_duplicate_username(client):
    """Registering the same username twice returns 400."""
    client.post("/auth/register", json={"username": "dupuser", "password": "pass123", "role": "admin"})
    resp = client.post("/auth/register", json={"username": "dupuser", "password": "pass123", "role": "admin"})
    assert resp.status_code == 400


def test_login_success(client):
    """Valid credentials return a JWT token."""
    client.post("/auth/register", json={"username": "loginuser", "password": "pass123", "role": "admin"})
    resp = client.post("/auth/login", data={"username": "loginuser", "password": "pass123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert resp.json()["token_type"] == "bearer"


def test_login_wrong_password(client):
    """Wrong password returns 401."""
    client.post("/auth/register", json={"username": "user2", "password": "correct", "role": "admin"})
    resp = client.post("/auth/login", data={"username": "user2", "password": "wrong"})
    assert resp.status_code == 401


def test_login_nonexistent_user(client):
    """Login with a username that doesn't exist returns 401."""
    resp = client.post("/auth/login", data={"username": "ghost", "password": "anything"})
    assert resp.status_code == 401


def test_me_endpoint(client, auth_headers):
    """Authenticated user can fetch their own profile."""
    resp = client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["username"] == "testadmin"


def test_me_without_token(client):
    """Unauthenticated request to /auth/me returns 401."""
    resp = client.get("/auth/me")
    assert resp.status_code == 401
