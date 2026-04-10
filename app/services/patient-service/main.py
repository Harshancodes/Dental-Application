from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models import Base
from routers import patients, doctors, appointments, treatments, billing, auth, seed

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Dental Clinic API",
    description="Backend API for managing a dental clinic.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(treatments.router)
app.include_router(billing.router)
app.include_router(seed.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Dental Clinic API v2"}
