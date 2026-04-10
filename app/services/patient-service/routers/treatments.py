from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Treatment, Appointment
from schemas import TreatmentCreate, TreatmentUpdate, TreatmentResponse
from deps import get_current_user

router = APIRouter(
    prefix="/treatments",
    tags=["Treatments"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/", response_model=TreatmentResponse, status_code=201)
def create_treatment(treatment: TreatmentCreate, db: Session = Depends(get_db)):
    if not db.query(Appointment).filter(Appointment.id == treatment.appointment_id).first():
        raise HTTPException(status_code=404, detail="Appointment not found")
    db_treatment = Treatment(**treatment.model_dump())
    db.add(db_treatment)
    db.commit()
    db.refresh(db_treatment)
    return db_treatment


@router.get("/", response_model=List[TreatmentResponse])
def get_treatments(
    skip: int = 0,
    limit: int = 100,
    appointment_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Treatment)
    if appointment_id:
        query = query.filter(Treatment.appointment_id == appointment_id)
    return query.offset(skip).limit(limit).all()


@router.get("/{treatment_id}", response_model=TreatmentResponse)
def get_treatment(treatment_id: int, db: Session = Depends(get_db)):
    treatment = db.query(Treatment).filter(Treatment.id == treatment_id).first()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    return treatment


@router.patch("/{treatment_id}", response_model=TreatmentResponse)
def update_treatment(treatment_id: int, updates: TreatmentUpdate, db: Session = Depends(get_db)):
    treatment = db.query(Treatment).filter(Treatment.id == treatment_id).first()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(treatment, field, value)
    db.commit()
    db.refresh(treatment)
    return treatment


@router.delete("/{treatment_id}", status_code=204)
def delete_treatment(treatment_id: int, db: Session = Depends(get_db)):
    treatment = db.query(Treatment).filter(Treatment.id == treatment_id).first()
    if not treatment:
        raise HTTPException(status_code=404, detail="Treatment not found")
    db.delete(treatment)
    db.commit()
