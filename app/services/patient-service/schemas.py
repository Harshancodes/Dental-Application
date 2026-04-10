from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime


# ── Patient ───────────────────────────────────────────────────────────────────

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


# ── Doctor ────────────────────────────────────────────────────────────────────

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
    status: Optional[str] = None
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


# ── Treatment ─────────────────────────────────────────────────────────────────

class TreatmentCreate(BaseModel):
    appointment_id: int
    tooth_number: Optional[int] = None
    procedure_type: str
    description: Optional[str] = None
    cost: float = 0.0


class TreatmentUpdate(BaseModel):
    tooth_number: Optional[int] = None
    procedure_type: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[float] = None


class TreatmentResponse(BaseModel):
    id: int
    appointment_id: int
    tooth_number: Optional[int]
    procedure_type: str
    description: Optional[str]
    cost: float
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Invoice ───────────────────────────────────────────────────────────────────

class InvoiceCreate(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    total_amount: float
    status: str = "unpaid"
    due_date: Optional[date] = None
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    total_amount: Optional[float] = None
    status: Optional[str] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None


class InvoiceResponse(BaseModel):
    id: int
    patient_id: int
    appointment_id: Optional[int]
    total_amount: float
    status: str
    due_date: Optional[date]
    paid_at: Optional[datetime]
    notes: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Auth / User ───────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: str
    role: str = "admin"


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str]
    full_name: Optional[str]
    role: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
