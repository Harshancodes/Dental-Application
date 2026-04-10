import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from routers import patients, doctors, appointments, treatments, billing, auth, ai

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

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

# ── Error handlers ────────────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return clean, readable validation errors instead of raw Pydantic output."""
    errors = []
    for error in exc.errors():
        field = " → ".join(str(e) for e in error["loc"] if e != "body")
        errors.append({"field": field, "message": error["msg"]})
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation failed", "errors": errors},
    )


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(treatments.router)
app.include_router(billing.router)
app.include_router(ai.router)

# Seed endpoint only available in development
if ENVIRONMENT == "development":
    from routers import seed
    app.include_router(seed.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Dental Clinic API v2", "environment": ENVIRONMENT}
