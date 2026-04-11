# Dental Clinic Management System

A full-stack dental clinic management system built with **FastAPI**, **React**, **PostgreSQL**, **Redis**, and **Docker**. Designed to be production-ready — not a toy project.

---

## Quick Start

Make sure Docker Desktop is running, then:

```bash
cd app
docker compose up --build
```

| URL | What it is |
|-----|-----------|
| http://localhost:3000 | The website |
| http://localhost:8000/docs | Interactive API docs |

**First time only** — go to http://localhost:8000/docs and run `POST /dev/seed` to load demo data.

### Demo Login Accounts

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Doctor | `dr.parker` | `doctor123` |
| Patient | `john.doe` | `patient123` |

---

## Features

- **Patient management** — full profile, medical history, contact details, file attachments
- **Doctor management** — specialization, contact details
- **Appointments** — book, cancel, reschedule; email confirmation on create/cancel
- **Treatments** — log procedures with tooth number, type, and cost
- **Billing** — invoices, mark as paid, track outstanding amounts, download PDF
- **JWT Authentication** — secure login with role-based access (admin / doctor / patient)
- **AI Assistant** — Claude-powered pre-appointment briefings and multi-turn chat (Redis-cached)
- **Patient Portal** — patients see their appointments, chat with AI, upload/download files
- **Doctor Portal** — schedule view, mark appointments complete, AI briefing panel
- **Dashboard** — stats cards, appointments-per-month bar chart, status pie chart
- **Calendar view** — month/week/day/agenda view, color-coded by appointment status
- **Rate limiting** — 10 login attempts/minute, Redis-backed (shared across all workers)
- **Email notifications** — appointment confirmation and cancellation emails via SMTP
- **File uploads** — attach patient documents (images, PDF, Word, max 10 MB)

---

## Architecture

### Big Picture

```
Browser
   │
   ▼
┌─────────────────┐        ┌──────────────────┐        ┌─────────────┐
│    Frontend     │──/api/─▶│   Backend API    │────────▶│  PostgreSQL │
│  React + Vite   │        │    FastAPI        │        │  Database   │
│  nginx (3000)   │        │  Gunicorn (8000)  │        │  Port 5432  │
└─────────────────┘        └────────┬─────────┘        └─────────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │     Redis     │
                            │  Port 6379    │
                            │ Rate limiting │
                            │  AI cache     │
                            └───────────────┘
```

All four services run inside **Docker containers** managed by **Docker Compose**.

---

### How Docker Works Here

Docker packages each part of the app into an isolated container. Without Docker you'd need to manually install Python, Node.js, PostgreSQL, and Redis and manage version conflicts.

```
docker-compose.yml
├── db               ← PostgreSQL 16 container
├── redis            ← Redis 7 container
├── patient-service  ← FastAPI backend
└── frontend         ← React + nginx
```

When you run `docker compose up --build`, Docker:
1. Builds the **backend** image — installs Python and all packages
2. Builds the **frontend** image — builds React app, sets up nginx
3. Pulls the **PostgreSQL** and **Redis** images from Docker Hub
4. Starts all four and connects them on a private internal network

Inside Docker, services talk to each other by **service name**:
- Backend connects to database as `db:5432`
- Backend connects to Redis as `redis:6379`
- nginx proxies API calls to `patient-service:8000`

**Data persistence** — database files live in a Docker **volume** (`postgres_data`). Uploads live in another volume (`uploads_data`). Both survive restarts.

```bash
docker compose up --build   # restart with new code — data is SAFE
docker compose down         # stop everything — data is SAFE
docker compose down -v      # stop + delete volumes — data is GONE
```

---

### Backend (FastAPI + Python)

```
services/patient-service/
├── main.py             # App entry point, CORS, structured logging, /health
├── models.py           # DB table definitions (SQLAlchemy)
├── schemas.py          # Request/response validation (Pydantic)
├── database.py         # DB connection + session dependency
├── deps.py             # JWT auth utilities
├── limiter.py          # Shared slowapi rate limiter (Redis-backed)
├── start.sh            # Dev entrypoint
├── start.prod.sh       # Prod: alembic + gunicorn 5 workers
├── routers/
│   ├── auth.py         # Login, register, /me
│   ├── patients.py     # CRUD
│   ├── doctors.py      # CRUD
│   ├── appointments.py # CRUD + email via BackgroundTasks
│   ├── treatments.py   # CRUD
│   ├── billing.py      # CRUD + PDF download
│   ├── ai.py           # AI ask + summary (Redis cached)
│   ├── uploads.py      # File upload/download/delete
│   └── seed.py         # Load dummy data
└── services/
    ├── cache.py         # Redis helpers
    └── email_service.py # SMTP email sending
```

**How a request flows:**

```
POST /appointments/
      │
      ▼
  Router (appointments.py)
      │  Pydantic validates the request body
      ▼
  get_current_user (deps.py)
      │  reads JWT from Authorization header
      ▼
  SQLAlchemy ORM
      │  translates Python objects → SQL
      ▼
  PostgreSQL
      │
      ▼
  BackgroundTasks → send_appointment_confirmation email (non-blocking)
      │
      ▼
  JSON response (201 Created)
```

**Rate limiting — why there's one shared `limiter.py`:**

`slowapi` works by attaching a `Limiter` object to the FastAPI app. If two files each create their own `Limiter()`, they are different objects — the exception handler in `main.py` can only catch errors from *its* limiter, not the other one. The fix: one `limiter.py` module exports a single instance. Every router imports from there. In production with Gunicorn running 5 worker processes, each process has its own memory — so we back the limiter with Redis to share the rate limit counters across all workers.

**AI caching — why summaries are cached in Redis:**

The `/ai/summary/{patient_id}` endpoint calls the Claude API which costs money and takes a few seconds. A doctor refreshing a patient's chart before their appointment shouldn't trigger a new API call every time. We cache the result in Redis for 10 minutes using the key `ai:summary:{patient_id}`. If Redis is unavailable, it falls back to calling the API directly.

---

### Frontend (React + TypeScript)

```
frontend/src/
├── api/
│   ├── client.ts         # Axios instance — attaches JWT to every request
│   ├── auth.ts
│   ├── patients.ts
│   ├── doctors.ts
│   ├── appointments.ts
│   ├── treatments.ts
│   └── billing.ts
├── types/index.ts         # TypeScript interfaces
├── context/
│   └── AuthContext.tsx    # Global auth state, login/logout
├── components/
│   ├── Layout.tsx
│   ├── Sidebar.tsx        # Role-aware navigation
│   ├── Modal.tsx
│   ├── ProtectedRoute.tsx # Redirects to /login if unauthenticated
│   └── SearchableSelect.tsx  # Type-to-filter combobox for patient/doctor pickers
└── pages/
    ├── Login.tsx
    ├── Dashboard.tsx      # Stats + recharts bar/pie charts
    ├── Patients.tsx
    ├── Doctors.tsx
    ├── Appointments.tsx
    ├── Treatments.tsx
    ├── Billing.tsx        # Includes PDF download button
    ├── CalendarView.tsx   # react-big-calendar, color-coded by status
    ├── PatientPortal.tsx  # Appointments + AI chat + file uploads
    └── DoctorPortal.tsx   # Schedule + AI briefing panel
```

**How role-based access works:**

```
Login
  │
  ├── role = admin   →  /dashboard       (full app)
  ├── role = doctor  →  /doctor-portal   (own schedule only)
  └── role = patient →  /patient-portal  (own appointments only)
```

The JWT token contains the user's role. The sidebar renders different navigation items based on it. `ProtectedRoute` wraps pages that require authentication.

---

### Database (PostgreSQL)

Six tables:

```
users
 ├── doctor_id ──────────────────────────────────────┐
 └── patient_id ───────────────────┐                 │
                                   │                 │
patients ──────────────────── appointments ──── treatments
    │                              │
    └──── invoices ────────────────┘
                      doctors ─────┘
```

- A **patient** has many appointments, invoices, and uploaded files
- A **doctor** has many appointments
- An **appointment** has many treatments and one invoice
- A **user** account links to either a doctor or patient record

Schema is managed by **Alembic** — migrations run automatically on startup.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Database | PostgreSQL 16 | Production-grade relational database |
| Cache | Redis 7 | Rate limit state + AI response caching |
| ORM | SQLAlchemy | Python ↔ SQL without raw queries |
| Migrations | Alembic | Schema versioning and safe upgrades |
| Backend | FastAPI | Fast, modern Python API with auto docs |
| Validation | Pydantic v2 | Request/response validation with type safety |
| Auth | JWT + bcrypt | Stateless, secure, industry standard |
| AI | Anthropic Claude | Patient briefings and clinical Q&A |
| PDF | ReportLab | Invoice PDF generation |
| Rate limiting | slowapi | Redis-backed, shared across Gunicorn workers |
| Frontend | React 18 + TypeScript | Component-based UI with type safety |
| Styling | Tailwind CSS | Utility-first — professional UI fast |
| HTTP client | Axios | API calls with JWT interceptor |
| Charts | Recharts | Dashboard bar + pie charts |
| Calendar | react-big-calendar | Month/week/day appointment view |
| Routing | React Router v6 | Client-side navigation |
| Bundler | Vite | Fast dev server and build tool |
| Containers | Docker | Consistent environment everywhere |
| Orchestration | Docker Compose | Run all services with one command |
| Prod server | nginx | Serves React + proxies API + security headers |
| App server | Gunicorn + Uvicorn | 5-worker production ASGI server |

---

## Project Structure

```
Dental-Application/
├── CLAUDE.md                    # AI assistant context file
├── README.md                    # This file
├── scripts/
│   └── backup.sh                # pg_dump backup, 7-day retention
├── .github/
│   └── workflows/
│       └── test.yml             # CI: pytest + frontend build
└── app/
    ├── docker-compose.yml       # Dev: 4 services
    ├── docker-compose.prod.yml  # Prod overrides (Gunicorn, restart:always, mem limits)
    ├── frontend/
    │   ├── Dockerfile           # Multi-stage: node build → nginx serve
    │   ├── nginx.conf           # Security headers, gzip, API proxy
    │   └── src/
    └── services/
        └── patient-service/
            ├── Dockerfile
            ├── requirements.txt
            ├── start.sh
            ├── start.prod.sh
            └── ...
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
DATABASE_URL=postgresql://admin:admin@db:5432/patients
SECRET_KEY=change-this-to-a-long-random-string-in-production
ENVIRONMENT=development
ANTHROPIC_API_KEY=sk-ant-...        # Get from console.anthropic.com
REDIS_URL=redis://redis:6379/0

# Optional — email notifications (leave blank to disable)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@dentalclinic.com
```

---

## API Reference

Full interactive docs at **http://localhost:8000/docs** when running.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/login | Get JWT token | No |
| POST | /auth/register | Create user account | No |
| GET | /auth/me | Get current user | Yes |
| GET | /patients/ | List patients | Yes |
| POST | /patients/ | Create patient | Yes |
| PATCH | /patients/{id} | Update patient | Yes |
| DELETE | /patients/{id} | Delete patient | Yes |
| GET | /doctors/ | List doctors | Yes |
| POST | /doctors/ | Create doctor | Yes |
| GET | /appointments/ | List appointments | Yes |
| POST | /appointments/ | Book appointment | Yes |
| PATCH | /appointments/{id}/cancel | Cancel appointment | Yes |
| GET | /treatments/ | List treatments | Yes |
| POST | /treatments/ | Add treatment | Yes |
| GET | /billing/ | List invoices | Yes |
| POST | /billing/ | Create invoice | Yes |
| PATCH | /billing/{id}/pay | Mark invoice paid | Yes |
| GET | /billing/{id}/pdf | Download invoice PDF | Yes |
| POST | /ai/ask | Ask AI about patient | Yes |
| GET | /ai/summary/{id} | Get AI pre-appointment briefing | Yes |
| POST | /uploads/patients/{id} | Upload patient file | Yes |
| GET | /uploads/patients/{id} | List patient files | Yes |
| GET | /uploads/patients/{id}/{filename} | Download file | Yes |
| DELETE | /uploads/patients/{id}/{filename} | Delete file | Yes |
| GET | /health | Health check (DB status) | No |
| POST | /dev/seed | Load dummy data | No |

---

## Running Tests

```bash
cd app/services/patient-service
pip install -r requirements.txt
pytest tests/ -v
```

Tests use an in-memory SQLite database — no Docker needed.

---

## Backups

```bash
chmod +x scripts/backup.sh
./scripts/backup.sh
```

Creates a gzipped PostgreSQL dump in `backups/`. Keeps the last 7 days automatically.
