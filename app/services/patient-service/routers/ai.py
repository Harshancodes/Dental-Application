import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import anthropic

from database import get_db
from models import Patient, Appointment, Treatment, Invoice
from deps import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Assistant"], dependencies=[Depends(get_current_user)])

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


def _get_client() -> anthropic.Anthropic:
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI assistant is not configured. Add ANTHROPIC_API_KEY to your .env file.",
        )
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def _build_patient_context(patient_id: int, db: Session) -> str:
    """Pull all patient data and format it as context for the AI."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    appointments = (
        db.query(Appointment)
        .filter(Appointment.patient_id == patient_id)
        .order_by(Appointment.appointment_date.desc())
        .limit(20)
        .all()
    )

    treatments = (
        db.query(Treatment)
        .join(Appointment)
        .filter(Appointment.patient_id == patient_id)
        .order_by(Treatment.created_at.desc())
        .limit(30)
        .all()
    )

    invoices = (
        db.query(Invoice)
        .filter(Invoice.patient_id == patient_id)
        .order_by(Invoice.created_at.desc())
        .limit(10)
        .all()
    )

    lines = [
        f"PATIENT: {patient.name}",
        f"DOB: {patient.date_of_birth or 'Not recorded'}",
        f"Phone: {patient.phone or 'Not recorded'}",
        f"Email: {patient.email or 'Not recorded'}",
        f"Medical History: {patient.medical_history or 'None recorded'}",
        "",
        f"APPOINTMENTS ({len(appointments)} most recent):",
    ]
    for a in appointments:
        lines.append(
            f"  - {a.appointment_date.strftime('%Y-%m-%d %H:%M')} | "
            f"Status: {a.status} | Reason: {a.reason or 'N/A'} | "
            f"Notes: {a.notes or 'None'}"
        )

    lines.append(f"\nTREATMENTS ({len(treatments)} records):")
    for t in treatments:
        lines.append(
            f"  - {t.procedure_type}"
            + (f" (Tooth #{t.tooth_number})" if t.tooth_number else "")
            + f" | ${t.cost:.2f}"
            + (f" | {t.description}" if t.description else "")
        )

    lines.append(f"\nBILLING ({len(invoices)} invoices):")
    for inv in invoices:
        lines.append(
            f"  - Invoice #{inv.id} | ${inv.total_amount:.2f} | "
            f"Status: {inv.status} | Due: {inv.due_date or 'N/A'}"
        )

    return "\n".join(lines)


SYSTEM_PROMPT = """\
You are an AI assistant for a dental clinic, helping doctors provide better patient care.
You have access to a patient's full clinical history including appointments, treatments, and billing.

Your role:
- Summarize patient history concisely before appointments
- Answer clinical questions about the patient's dental health
- Suggest potential follow-up treatments or questions to ask the patient
- Flag patterns (e.g. overdue treatments, unpaid invoices, recurring issues)
- Always be professional and evidence-based

Keep responses clear and well-structured. Use bullet points for lists.
Do NOT make definitive diagnoses — always frame suggestions as considerations for the doctor.
If asked something outside the provided patient data, say so clearly.
"""


# ── Request/Response schemas ──────────────────────────────────────────────────

class AskRequest(BaseModel):
    patient_id: int
    question: str
    conversation_history: Optional[list] = []  # [{role, content}, ...] for multi-turn


class AskResponse(BaseModel):
    answer: str
    patient_name: str


class SummaryResponse(BaseModel):
    summary: str
    patient_name: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/ask", response_model=AskResponse)
def ask_about_patient(body: AskRequest, db: Session = Depends(get_db)):
    """Ask a question about a specific patient. Supports multi-turn conversation."""
    client_ai = _get_client()
    context = _build_patient_context(body.patient_id, db)

    patient = db.query(Patient).filter(Patient.id == body.patient_id).first()

    system = f"{SYSTEM_PROMPT}\n\n--- PATIENT RECORD ---\n{context}\n--- END OF RECORD ---"

    # Build message history (multi-turn support)
    messages = list(body.conversation_history or [])
    messages.append({"role": "user", "content": body.question})

    response = client_ai.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system=system,
        messages=messages,
    )

    answer = response.content[0].text
    return AskResponse(answer=answer, patient_name=patient.name)


@router.get("/summary/{patient_id}", response_model=SummaryResponse)
def get_patient_summary(patient_id: int, db: Session = Depends(get_db)):
    """Generate a pre-appointment briefing for a patient."""
    client_ai = _get_client()
    context = _build_patient_context(patient_id, db)
    patient = db.query(Patient).filter(Patient.id == patient_id).first()

    system = f"{SYSTEM_PROMPT}\n\n--- PATIENT RECORD ---\n{context}\n--- END OF RECORD ---"

    response = client_ai.messages.create(
        model="claude-opus-4-6",
        max_tokens=800,
        system=system,
        messages=[
            {
                "role": "user",
                "content": (
                    "Give me a concise pre-appointment briefing for this patient. "
                    "Include: key medical history, recent treatments, any outstanding issues or overdue follow-ups, "
                    "and 2-3 suggested questions to ask them today."
                ),
            }
        ],
    )

    return SummaryResponse(summary=response.content[0].text, patient_name=patient.name)
