"""
Tests for the /patients endpoints.
Uses session_client + auth_headers so we don't re-login on every test.
"""


def test_create_patient(session_client, auth_headers):
    resp = session_client.post("/patients/", json={"name": "John Doe", "phone": "555-1234"}, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "John Doe"
    assert data["id"] is not None


def test_list_patients(session_client, auth_headers):
    resp = session_client.get("/patients/", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_patient(session_client, auth_headers):
    created = session_client.post("/patients/", json={"name": "Jane Smith"}, headers=auth_headers).json()
    resp = session_client.get(f"/patients/{created['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Jane Smith"


def test_get_patient_not_found(session_client, auth_headers):
    resp = session_client.get("/patients/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_update_patient(session_client, auth_headers):
    created = session_client.post("/patients/", json={"name": "Old Name"}, headers=auth_headers).json()
    resp = session_client.patch(f"/patients/{created['id']}", json={"name": "New Name"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


def test_delete_patient(session_client, auth_headers):
    created = session_client.post("/patients/", json={"name": "To Delete"}, headers=auth_headers).json()
    resp = session_client.delete(f"/patients/{created['id']}", headers=auth_headers)
    assert resp.status_code == 204
    assert session_client.get(f"/patients/{created['id']}", headers=auth_headers).status_code == 404


def test_patients_require_auth(client):
    """Uses isolated client with no token — verifies 401."""
    assert client.get("/patients/").status_code == 401
