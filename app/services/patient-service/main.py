import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from routers import patients, doctors, appointments, treatments, billing, auth, ai, uploads

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# CORS — in production lock this to your actual domain via ALLOWED_ORIGINS env var
# e.g. ALLOWED_ORIGINS=https://yourdomain.com
# In development we allow localhost ports for the dev server
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
if _raw_origins:
    ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",")]
else:
    # Default: allow local development origins
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:3000",
    ]

# Rate limiter — uses client IP address as the key
# Limits are applied per-route (see routers/auth.py for login limiting)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Dental Clinic API",
    description="Backend API for managing a dental clinic.",
    version="2.0.0",
)

# Attach rate limiter to app state so routes can access it
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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
app.include_router(uploads.router)

# Seed endpoint only available in development
if ENVIRONMENT == "development":
    from routers import seed
    app.include_router(seed.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Dental Clinic API v2", "environment": ENVIRONMENT}
