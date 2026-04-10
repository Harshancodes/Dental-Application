from fastapi import FastAPI
from database import engine
from models import Base
from routers import patients, doctors, appointments, seed

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Dental Clinic API",
    description="Backend API for managing patients, doctors, and appointments at a dental clinic.",
    version="1.0.0",
)

app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(seed.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Dental Clinic API is running"}
