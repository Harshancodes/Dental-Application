# Dental Application — CLAUDE.md

## Who I'm working with
Harshancodes — learning full-stack development while building this project.
Always explain architectural decisions briefly. Use clear language, not jargon.

## What this project is
A full-featured dental clinic management system. The goal is a real, production-quality
application that a dental clinic could actually use — not a toy project.

## Tech stack
| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI (Python) |
| Database | PostgreSQL 16 (Docker) |
| ORM | SQLAlchemy |
| Validation | Pydantic v2 |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| HTTP client | Axios |
| Routing | React Router v6 |
| Container | Docker Compose |
| Prod server | nginx (serves frontend + proxies /api to backend) |

## Services & Ports
| Service | Port | Notes |
|---------|------|-------|
| patient-service | 8000 | FastAPI backend |
| frontend | 3000 | React app via nginx in Docker |
| postgres-db | 5432 | PostgreSQL |

## Project Structure
```
app/
  docker-compose.yml
  services/
    patient-service/
      main.py            # App entry point, registers all routers
      models.py          # SQLAlchemy models: Patient, Doctor, Appointment
      schemas.py         # Pydantic schemas for request/response
      database.py        # DB engine + get_db() session dependency
      routers/
        patients.py      # CRUD /patients
        doctors.py       # CRUD /doctors
        appointments.py  # CRUD /appointments (filter by patient_id/doctor_id)
        seed.py          # POST /dev/seed — inserts dummy data
      Dockerfile
      requirements.txt
  frontend/
    src/
      api/               # Axios functions: patients.ts, doctors.ts, appointments.ts
      types/index.ts     # TypeScript interfaces (Patient, Doctor, Appointment)
      components/
        Layout.tsx        # Sidebar + Outlet wrapper
        Sidebar.tsx       # Dark sidebar with Admin + Portals sections
        Modal.tsx         # Reusable modal with backdrop
      pages/
        Dashboard.tsx     # Stats cards + recent appointments table
        Patients.tsx      # Admin CRUD table with search + modal form
        Doctors.tsx       # Admin CRUD table with specialization dropdown
        Appointments.tsx  # Book/cancel/delete appointments
        PatientPortal.tsx # Patient-facing view — select patient, see appointments
        DoctorPortal.tsx  # Doctor-facing view — schedule, mark complete, add notes
    vite.config.ts       # Dev: proxies /api -> localhost:8000
    nginx.conf           # Prod: proxies /api -> patient-service:8000
    Dockerfile           # Multi-stage: node build -> nginx serve
```

## Key conventions
- DB sessions: always use `Depends(get_db)` — never call `SessionLocal()` directly
- Schemas: always use Pydantic for request/response — never raw query params for complex data
- One router file per resource
- HTTP status codes: 201 for create, 204 for delete, 404 for not found
- All models have `id`, `created_at`, `updated_at`
- Commit style: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)

## Database
- URL: `postgresql://admin:admin@db:5432/patients`
- Tables auto-created on startup via `Base.metadata.create_all`

## How to run
```bash
cd app
docker compose up --build
```
- Website: http://localhost:3000
- API docs: http://localhost:8000/docs

## How to seed dummy data
After containers are running, hit this endpoint once:
```
POST http://localhost:8000/dev/seed
```
(Available in Swagger at http://localhost:8000/docs)
Seeds 5 patients, 3 doctors, 11 appointments.

## What's built
- [x] Patient CRUD (full profile)
- [x] Doctor CRUD
- [x] Appointments (book, cancel, delete, filter by patient/doctor)
- [x] Patient Portal (patient-facing appointment view)
- [x] Doctor Portal (schedule view, mark complete, add notes)
- [x] Seed data endpoint
- [x] Docker Compose full stack

## What's next
- [ ] Treatments / Procedures (tooth #, procedure type, cost)
- [ ] Billing / Invoices
- [ ] JWT Authentication (login page, protected routes, roles)

## Known decisions
- Frontend API calls go through `/api/` proxy — browser never hits :8000 directly
- No auth yet — portals use a dropdown to "select" identity (will be replaced by login)
- Seed endpoint is at /dev/seed — should be removed or guarded before real deployment
