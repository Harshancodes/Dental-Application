"""
Tests for the /patients endpoints.
auth_headers fixture logs in as admin so we can test protected routes.
"""


def test_create_patient(client, auth_headers):
    """Admin can create a patient."""
    resp = client.post("/patients/", json={"name": "John Doe", "phone": "555-1234"}, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "John Doe"
    assert data["id"] is not None


def test_list_patients(client, auth_headers):
    """Can list all patients."""
    resp = client.get("/patients/", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_patient(client, auth_headers):
    """Can fetch a single patient by ID."""
    created = client.post("/patients/", json={"name": "Jane Smith"}, headers=auth_headers).json()
    resp = client.get(f"/patients/{created['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Jane Smith"


def test_get_patient_not_found(client, auth_headers):
    """Fetching a non-existent patient returns 404."""
    resp = client.get("/patients/99999", headers=auth_headers)
    assert resp.status_code == 404


def test_update_patient(client, auth_headers):
    """Can update a patient's details."""
    created = client.post("/patients/", json={"name": "Old Name"}, headers=auth_headers).json()
    resp = client.patch(f"/patients/{created['id']}", json={"name": "New Name"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


def test_delete_patient(client, auth_headers):
    """Can delete a patient — returns 204 and patient no longer exists."""
    created = client.post("/patients/", json={"name": "To Delete"}, headers=auth_headers).json()
    resp = client.delete(f"/patients/{created['id']}", headers=auth_headers)
    assert resp.status_code == 204
    # Confirm it's gone
    assert client.get(f"/patients/{created['id']}", headers=auth_headers).status_code == 404


def test_patients_require_auth(client):
    """Patient endpoints reject unauthenticated requests."""
    assert client.get("/patients/").status_code == 401
