from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from database import get_db
from models import Patient, Doctor, Appointment

router = APIRouter(prefix="/dev", tags=["Dev"])


@router.post("/seed", summary="Seed database with dummy data")
def seed_database(db: Session = Depends(get_db)):
    if db.query(Patient).count() > 0:
        return {"message": "Database already seeded — skipping."}

    # ── Patients ─────────────────────────────────────────────────────────────
    patient_data = [
        {
            "name": "John Doe",
            "date_of_birth": "1989-03-15",
            "phone": "+1 555 0101",
            "email": "john.doe@email.com",
            "address": "123 Oak St, Springfield",
            "medical_history": "Mild gum sensitivity. No known drug allergies.",
        },
        {
            "name": "Sarah Johnson",
            "date_of_birth": "1996-07-22",
            "phone": "+1 555 0102",
            "email": "sarah.j@email.com",
            "address": "456 Maple Ave, Shelbyville",
            "medical_history": "Braces (2015–2017). Routine cleanings every 6 months.",
        },
        {
            "name": "Michael Chen",
            "date_of_birth": "1979-11-08",
            "phone": "+1 555 0103",
            "email": "m.chen@email.com",
            "address": "789 Pine Rd, Capital City",
            "medical_history": "Diabetes Type 2 — requires pre-treatment glucose check. Penicillin allergy.",
        },
        {
            "name": "Emma Williams",
            "date_of_birth": "2005-02-14",
            "phone": "+1 555 0104",
            "email": "emma.w@email.com",
            "address": "321 Elm St, Shelbyville",
            "medical_history": "Wisdom teeth erupting. Slight crowding on lower jaw.",
        },
        {
            "name": "Robert Brown",
            "date_of_birth": "1962-09-30",
            "phone": "+1 555 0105",
            "email": "r.brown@email.com",
            "address": "654 Cedar Ln, Springfield",
            "medical_history": "Partial dentures (lower). On hypertension medication — check blood pressure before procedures.",
        },
    ]
    patients = [Patient(**p) for p in patient_data]
    db.add_all(patients)
    db.flush()

    # ── Doctors ──────────────────────────────────────────────────────────────
    doctor_data = [
        {"name": "Alice Parker", "specialization": "General Dentistry", "phone": "+1 555 0201", "email": "dr.parker@dentalclinic.com"},
        {"name": "James Wilson", "specialization": "Orthodontics", "phone": "+1 555 0202", "email": "dr.wilson@dentalclinic.com"},
        {"name": "Maria Santos", "specialization": "Pediatric Dentistry", "phone": "+1 555 0203", "email": "dr.santos@dentalclinic.com"},
    ]
    doctors = [Doctor(**d) for d in doctor_data]
    db.add_all(doctors)
    db.flush()

    # ── Appointments ─────────────────────────────────────────────────────────
    now = datetime.now()
    appointments = [
        # Past completed
        Appointment(patient_id=patients[0].id, doctor_id=doctors[0].id, appointment_date=now - timedelta(days=30), reason="Routine checkup", status="completed", notes="All good. Next visit in 6 months."),
        Appointment(patient_id=patients[1].id, doctor_id=doctors[1].id, appointment_date=now - timedelta(days=20), reason="Braces adjustment", status="completed", notes="Tightened upper wire."),
        Appointment(patient_id=patients[2].id, doctor_id=doctors[0].id, appointment_date=now - timedelta(days=15), reason="Tooth pain (lower molar)", status="completed", notes="Filled cavity on #30. Prescribed ibuprofen."),
        Appointment(patient_id=patients[4].id, doctor_id=doctors[0].id, appointment_date=now - timedelta(days=10), reason="Denture adjustment", status="completed", notes="Adjusted lower partial. Patient satisfied."),
        Appointment(patient_id=patients[3].id, doctor_id=doctors[1].id, appointment_date=now - timedelta(days=5), reason="Wisdom tooth consultation", status="cancelled", notes="Patient cancelled — rescheduled."),
        # Today
        Appointment(patient_id=patients[0].id, doctor_id=doctors[0].id, appointment_date=now.replace(hour=9, minute=0), reason="Follow-up cleaning", status="scheduled"),
        Appointment(patient_id=patients[2].id, doctor_id=doctors[0].id, appointment_date=now.replace(hour=11, minute=30), reason="Post-filling checkup", status="scheduled"),
        # Upcoming
        Appointment(patient_id=patients[1].id, doctor_id=doctors[1].id, appointment_date=now + timedelta(days=3), reason="Retainer fitting", status="scheduled"),
        Appointment(patient_id=patients[3].id, doctor_id=doctors[1].id, appointment_date=now + timedelta(days=5), reason="Wisdom tooth extraction consult", status="scheduled"),
        Appointment(patient_id=patients[4].id, doctor_id=doctors[0].id, appointment_date=now + timedelta(days=7), reason="Six-month checkup", status="scheduled"),
        Appointment(patient_id=patients[2].id, doctor_id=doctors[0].id, appointment_date=now + timedelta(days=14), reason="Deep cleaning", status="scheduled"),
    ]
    db.add_all(appointments)
    db.commit()

    return {
        "message": "Database seeded successfully!",
        "patients": len(patients),
        "doctors": len(doctors),
        "appointments": len(appointments),
    }
