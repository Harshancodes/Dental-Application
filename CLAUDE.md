# Dental Application — CLAUDE.md

## Project Overview
A full-featured dental clinic management system built with FastAPI (Python) + PostgreSQL + Docker Compose.
The user is learning alongside development — always explain key decisions briefly.

## Architecture
- **Backend:** FastAPI microservices, one service per domain
- **Database:** PostgreSQL (via Docker), SQLAlchemy ORM
- **Containerization:** Docker Compose
- **Auth:** JWT-based (to be added)

## Services
| Service | Port | Description |
|---------|------|-------------|
| patient-service | 8000 | Patients, Doctors, Appointments, Treatments, Billing |

## Project Structure
```
app/
  docker-compose.yml
  services/
    patient-service/
      main.py          # FastAPI app + router registration
      models.py        # SQLAlchemy ORM models
      schemas.py       # Pydantic request/response schemas
      database.py      # DB engine + session
      routers/         # One file per resource
      requirements.txt
      Dockerfile
```

## Conventions
- Always use Pydantic schemas for request/response (never raw query params for complex data)
- Use dependency injection for DB sessions (`Depends(get_db)`)
- One router file per resource (patients, doctors, appointments, etc.)
- Return meaningful HTTP status codes (201 for create, 404 for not found, etc.)
- All models have `id`, `created_at`, `updated_at`

## Database
- URL: `postgresql://admin:admin@db:5432/patients`
- Tables auto-created on startup via `Base.metadata.create_all`

## Git
- Repo: TBD (user to provide GitHub username)
- Commit style: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)

## Features Planned
- [ ] Patient CRUD
- [ ] Doctor CRUD
- [ ] Appointments
- [ ] Treatments / Procedures
- [ ] Billing / Invoices
- [ ] JWT Authentication

## Known Issues / Notes
- Original `main.py` had Doctor routes but no Doctor model — fixed during refactor
- DB sessions were never closed in original code — fixed with `Depends(get_db)` pattern
