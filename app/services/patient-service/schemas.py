from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime


# ── Patient ──────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    name: str
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    medical_history: Optional[str] = None


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    medical_history: Optional[str] = None


class PatientResponse(BaseModel):
    id: int
    name: str
    date_of_birth: Optional[date]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    medical_history: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Doctor ───────────────────────────────────────────────────────────────────

class DoctorCreate(BaseModel):
    name: str
    specialization: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    specialization: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None


class DoctorResponse(BaseModel):
    id: int
    name: str
    specialization: str
    phone: Optional[str]
    email: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Appointment ───────────────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    reason: Optional[str] = None
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[datetime] = None
    reason: Optional[str] = None
    status: Optional[str] = None  # scheduled, completed, cancelled
    notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    reason: Optional[str]
    status: str
    notes: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
