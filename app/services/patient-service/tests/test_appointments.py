"""
Tests for the /appointments endpoints.
We create a patient and doctor first, then test appointment operations.
"""
import pytest


@pytest.fixture
def sample_data(session_client, auth_headers):
    """Create a patient and doctor to use in appointment tests."""
    patient = session_client.post("/patients/", json={"name": "Test Patient"}, headers=auth_headers).json()
    doctor = session_client.post("/doctors/", json={"name": "Test Doctor", "specialization": "General"}, headers=auth_headers).json()
    return {"patient_id": patient["id"], "doctor_id": doctor["id"]}


def test_create_appointment(session_client, auth_headers, sample_data):
    """Can book an appointment for an existing patient and doctor."""
    resp = session_client.post("/appointments/", json={
        "patient_id": sample_data["patient_id"],
        "doctor_id": sample_data["doctor_id"],
        "appointment_date": "2027-01-15T10:00:00",
        "reason": "Checkup",
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "scheduled"
    assert data["reason"] == "Checkup"


def test_create_appointment_invalid_patient(session_client, auth_headers, sample_data):
    """Booking with a non-existent patient returns 404."""
    resp = session_client.post("/appointments/", json={
        "patient_id": 99999,
        "doctor_id": sample_data["doctor_id"],
        "appointment_date": "2027-01-15T10:00:00",
    }, headers=auth_headers)
    assert resp.status_code == 404


def test_filter_appointments_by_patient(session_client, auth_headers, sample_data):
    """Can filter appointments by patient_id."""
    session_client.post("/appointments/", json={
        "patient_id": sample_data["patient_id"],
        "doctor_id": sample_data["doctor_id"],
        "appointment_date": "2027-02-01T09:00:00",
    }, headers=auth_headers)
    resp = session_client.get(f"/appointments/?patient_id={sample_data['patient_id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert all(a["patient_id"] == sample_data["patient_id"] for a in resp.json())


def test_cancel_appointment(session_client, auth_headers, sample_data):
    """Cancelling an appointment sets status to cancelled."""
    appt = session_client.post("/appointments/", json={
        "patient_id": sample_data["patient_id"],
        "doctor_id": sample_data["doctor_id"],
        "appointment_date": "2027-03-01T14:00:00",
    }, headers=auth_headers).json()

    resp = session_client.patch(f"/appointments/{appt['id']}/cancel", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"


def test_delete_appointment(session_client, auth_headers, sample_data):
    """Can delete an appointment — returns 204."""
    appt = session_client.post("/appointments/", json={
        "patient_id": sample_data["patient_id"],
        "doctor_id": sample_data["doctor_id"],
        "appointment_date": "2027-04-01T11:00:00",
    }, headers=auth_headers).json()

    resp = session_client.delete(f"/appointments/{appt['id']}", headers=auth_headers)
    assert resp.status_code == 204
