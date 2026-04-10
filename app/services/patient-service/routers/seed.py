from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from database import get_db
from models import Patient, Doctor, Appointment, Treatment, Invoice, User
from deps import hash_password

router = APIRouter(prefix="/dev", tags=["Dev"])


@router.post("/seed", summary="Seed database with dummy data")
def seed_database(db: Session = Depends(get_db)):
    if db.query(Patient).count() > 0:
        return {"message": "Database already seeded — skipping."}

    # ── Admin user ────────────────────────────────────────────────────────────
    admin = User(
        username="admin",
        email="admin@dentalclinic.com",
        full_name="Admin User",
        hashed_password=hash_password("admin123"),
        role="admin",
    )
    db.add(admin)
    db.flush()


    # ── Patients ──────────────────────────────────────────────────────────────
    patients = [
        Patient(name="John Doe", date_of_birth=date(1989, 3, 15), phone="+1 555 0101", email="john.doe@email.com", address="123 Oak St, Springfield", medical_history="Mild gum sensitivity. No known drug allergies."),
        Patient(name="Sarah Johnson", date_of_birth=date(1996, 7, 22), phone="+1 555 0102", email="sarah.j@email.com", address="456 Maple Ave, Shelbyville", medical_history="Braces (2015–2017). Routine cleanings every 6 months."),
        Patient(name="Michael Chen", date_of_birth=date(1979, 11, 8), phone="+1 555 0103", email="m.chen@email.com", address="789 Pine Rd, Capital City", medical_history="Diabetes Type 2 — requires pre-treatment glucose check. Penicillin allergy."),
        Patient(name="Emma Williams", date_of_birth=date(2005, 2, 14), phone="+1 555 0104", email="emma.w@email.com", address="321 Elm St, Shelbyville", medical_history="Wisdom teeth erupting. Slight crowding on lower jaw."),
        Patient(name="Robert Brown", date_of_birth=date(1962, 9, 30), phone="+1 555 0105", email="r.brown@email.com", address="654 Cedar Ln, Springfield", medical_history="Partial dentures (lower). On hypertension medication."),
    ]
    db.add_all(patients)
    db.flush()

    # ── Doctors ───────────────────────────────────────────────────────────────
    doctors = [
        Doctor(name="Alice Parker", specialization="General Dentistry", phone="+1 555 0201", email="dr.parker@dentalclinic.com"),
        Doctor(name="James Wilson", specialization="Orthodontics", phone="+1 555 0202", email="dr.wilson@dentalclinic.com"),
        Doctor(name="Maria Santos", specialization="Pediatric Dentistry", phone="+1 555 0203", email="dr.santos@dentalclinic.com"),
    ]
    db.add_all(doctors)
    db.flush()

    # ── Appointments ──────────────────────────────────────────────────────────
    now = datetime.now()
    appointments = [
        Appointment(patient_id=patients[0].id, doctor_id=doctors[0].id, appointment_date=now - timedelta(days=30), reason="Routine checkup", status="completed", notes="All good. Next visit in 6 months."),
        Appointment(patient_id=patients[1].id, doctor_id=doctors[1].id, appointment_date=now - timedelta(days=20), reason="Braces adjustment", status="completed", notes="Tightened upper wire."),
        Appointment(patient_id=patients[2].id, doctor_id=doctors[0].id, appointment_date=now - timedelta(days=15), reason="Tooth pain (lower molar)", status="completed", notes="Filled cavity on #30."),
        Appointment(patient_id=patients[4].id, doctor_id=doctors[0].id, appointment_date=now - timedelta(days=10), reason="Denture adjustment", status="completed", notes="Adjusted lower partial."),
        Appointment(patient_id=patients[3].id, doctor_id=doctors[1].id, appointment_date=now - timedelta(days=5), reason="Wisdom tooth consultation", status="cancelled"),
        Appointment(patient_id=patients[0].id, doctor_id=doctors[0].id, appointment_date=now.replace(hour=9, minute=0), reason="Follow-up cleaning", status="scheduled"),
        Appointment(patient_id=patients[2].id, doctor_id=doctors[0].id, appointment_date=now.replace(hour=11, minute=30), reason="Post-filling checkup", status="scheduled"),
        Appointment(patient_id=patients[1].id, doctor_id=doctors[1].id, appointment_date=now + timedelta(days=3), reason="Retainer fitting", status="scheduled"),
        Appointment(patient_id=patients[3].id, doctor_id=doctors[1].id, appointment_date=now + timedelta(days=5), reason="Wisdom tooth extraction consult", status="scheduled"),
        Appointment(patient_id=patients[4].id, doctor_id=doctors[0].id, appointment_date=now + timedelta(days=7), reason="Six-month checkup", status="scheduled"),
    ]
    db.add_all(appointments)
    db.flush()

    # ── Treatments (for completed appointments) ───────────────────────────────
    treatments = [
        Treatment(appointment_id=appointments[0].id, procedure_type="Teeth Cleaning", description="Full mouth cleaning and polish", cost=80.0),
        Treatment(appointment_id=appointments[0].id, procedure_type="X-Ray", tooth_number=None, description="Full mouth panoramic X-ray", cost=50.0),
        Treatment(appointment_id=appointments[1].id, procedure_type="Wire Adjustment", description="Tightened upper arch wire", cost=150.0),
        Treatment(appointment_id=appointments[2].id, procedure_type="Filling", tooth_number=30, description="Composite resin filling on lower right molar", cost=200.0),
        Treatment(appointment_id=appointments[2].id, procedure_type="X-Ray", tooth_number=30, description="Periapical X-ray", cost=40.0),
        Treatment(appointment_id=appointments[3].id, procedure_type="Denture Adjustment", description="Relining of lower partial denture", cost=120.0),
    ]
    db.add_all(treatments)
    db.flush()

    # ── Invoices ──────────────────────────────────────────────────────────────
    invoices = [
        Invoice(patient_id=patients[0].id, appointment_id=appointments[0].id, total_amount=130.0, status="paid", due_date=date(2026, 3, 15), paid_at=now - timedelta(days=25), notes="Paid by card"),
        Invoice(patient_id=patients[1].id, appointment_id=appointments[1].id, total_amount=150.0, status="paid", due_date=date(2026, 3, 25), paid_at=now - timedelta(days=18)),
        Invoice(patient_id=patients[2].id, appointment_id=appointments[2].id, total_amount=240.0, status="unpaid", due_date=date(2026, 4, 20), notes="Patient requested payment plan"),
        Invoice(patient_id=patients[4].id, appointment_id=appointments[3].id, total_amount=120.0, status="paid", due_date=date(2026, 4, 5), paid_at=now - timedelta(days=8)),
    ]
    db.add_all(invoices)
    db.flush()

    # ── Doctor user accounts ──────────────────────────────────────────────────
    doctor_users = [
        User(username="dr.parker", full_name="Alice Parker", hashed_password=hash_password("doctor123"), role="doctor", doctor_id=doctors[0].id),
        User(username="dr.wilson", full_name="James Wilson", hashed_password=hash_password("doctor123"), role="doctor", doctor_id=doctors[1].id),
        User(username="dr.santos", full_name="Maria Santos", hashed_password=hash_password("doctor123"), role="doctor", doctor_id=doctors[2].id),
    ]
    db.add_all(doctor_users)

    # ── Patient user accounts ─────────────────────────────────────────────────
    patient_users = [
        User(username="john.doe",    full_name="John Doe",      hashed_password=hash_password("patient123"), role="patient", patient_id=patients[0].id),
        User(username="sarah.j",     full_name="Sarah Johnson", hashed_password=hash_password("patient123"), role="patient", patient_id=patients[1].id),
        User(username="m.chen",      full_name="Michael Chen",  hashed_password=hash_password("patient123"), role="patient", patient_id=patients[2].id),
        User(username="emma.w",      full_name="Emma Williams", hashed_password=hash_password("patient123"), role="patient", patient_id=patients[3].id),
        User(username="r.brown",     full_name="Robert Brown",  hashed_password=hash_password("patient123"), role="patient", patient_id=patients[4].id),
    ]
    db.add_all(patient_users)
    db.commit()

    return {
        "message": "Database seeded successfully!",
        "credentials": {"username": "admin", "password": "admin123"},
        "patients": len(patients),
        "doctors": len(doctors),
        "appointments": len(appointments),
        "treatments": len(treatments),
        "invoices": len(invoices),
    }
