"""
Tests for authentication endpoints.
Uses session_client for tests that need auth_headers,
and the isolated client fixture for unauthenticated tests.
"""


def test_register_success(client):
    resp = client.post("/auth/register", json={
        "username": "newuser_auth",
        "password": "password123",
        "role": "admin",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "newuser_auth"
    assert "hashed_password" not in data  # Password must never be returned


def test_register_duplicate_username(client):
    client.post("/auth/register", json={"username": "dupuser", "password": "pass123", "role": "admin"})
    resp = client.post("/auth/register", json={"username": "dupuser", "password": "pass123", "role": "admin"})
    assert resp.status_code == 400


def test_login_success(session_client):
    session_client.post("/auth/register", json={"username": "loginuser", "password": "pass123", "role": "admin"})
    resp = session_client.post("/auth/login", data={"username": "loginuser", "password": "pass123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert resp.json()["token_type"] == "bearer"


def test_login_wrong_password(session_client):
    session_client.post("/auth/register", json={"username": "user_wrongpass", "password": "correct", "role": "admin"})
    resp = session_client.post("/auth/login", data={"username": "user_wrongpass", "password": "wrong"})
    assert resp.status_code == 401


def test_login_nonexistent_user(client):
    resp = client.post("/auth/login", data={"username": "ghost_user", "password": "anything"})
    assert resp.status_code == 401


def test_me_endpoint(session_client, auth_headers):
    resp = session_client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["username"] == "testadmin"


def test_me_without_token(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401
