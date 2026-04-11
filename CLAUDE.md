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
| Cache / Rate-limit state | Redis 7 (Docker) |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Auth | JWT (python-jose) + bcrypt |
| AI | Anthropic Claude API (`claude-opus-4-6`) |
| PDF | ReportLab |
| Rate limiting | slowapi (Redis-backed in prod) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| HTTP client | Axios |
| Routing | React Router v6 |
| Charts | Recharts |
| Calendar | react-big-calendar + date-fns |
| Container | Docker Compose |
| Prod server | nginx (serves frontend + proxies /api to backend) |
| Prod app server | Gunicorn + UvicornWorker (5 workers) |

## Services & Ports
| Service | Port | Notes |
|---------|------|-------|
| patient-service | 8000 | FastAPI backend (Gunicorn in prod) |
| frontend | 3000 | React app via nginx in Docker |
| postgres-db | 5432 | PostgreSQL |
| redis | 6379 | Redis — rate limit state + AI summary cache |

## Project Structure
```
app/
  docker-compose.yml        # Dev: 4 services (db, redis, backend, frontend)
  docker-compose.prod.yml   # Prod overrides: Gunicorn, restart:always, mem limits
  services/
    patient-service/
      main.py               # App entry point, registers all routers, CORS, structured logging
      models.py             # SQLAlchemy models: Patient, Doctor, Appointment, Treatment, Invoice, User
      schemas.py            # Pydantic schemas for request/response
      database.py           # DB engine + get_db() session dependency
      deps.py               # JWT auth: get_current_user, role checks
      limiter.py            # SINGLE shared slowapi Limiter instance (Redis-backed)
      start.sh              # Dev entrypoint: alembic upgrade head + uvicorn
      start.prod.sh         # Prod entrypoint: alembic upgrade head + gunicorn 5 workers
      routers/
        auth.py             # POST /auth/login, /auth/register, /auth/me
        patients.py         # CRUD /patients
        doctors.py          # CRUD /doctors
        appointments.py     # CRUD /appointments (email hooks via BackgroundTasks)
        treatments.py       # CRUD /treatments
        billing.py          # CRUD /billing + GET /billing/{id}/pdf
        ai.py               # POST /ai/ask, GET /ai/summary/{id} (Redis cached)
        uploads.py          # POST/GET/DELETE /uploads/patients/{id}
        seed.py             # POST /dev/seed — inserts dummy data
      services/
        cache.py            # Redis helpers: cache_get, cache_set, cache_delete_pattern
        email_service.py    # smtplib email: appointment confirmation + cancellation
      tests/
        conftest.py         # SQLite in-memory DB, session fixtures, rate limiter disabled
        test_patients.py
        test_auth.py
        test_appointments.py
      Dockerfile
      requirements.txt
  frontend/
    src/
      api/                  # Axios functions: patients.ts, doctors.ts, appointments.ts, etc.
      types/index.ts        # TypeScript interfaces (Patient, Doctor, Appointment...)
      context/
        AuthContext.tsx     # Global auth state, login/logout, JWT storage
      components/
        Layout.tsx          # Sidebar + Outlet wrapper
        Sidebar.tsx         # Dark sidebar, role-aware nav
        Modal.tsx           # Reusable modal with backdrop
        ProtectedRoute.tsx  # Redirects to /login if not authenticated
        SearchableSelect.tsx # Combobox: type-to-filter patient/doctor dropdowns
      pages/
        Login.tsx           # JWT login form
        Dashboard.tsx       # Stats cards + recharts bar/pie charts
        Patients.tsx        # Admin CRUD table with search + modal form
        Doctors.tsx         # Admin CRUD table with specialization dropdown
        Appointments.tsx    # Book/cancel/delete appointments
        Treatments.tsx      # Log procedures (tooth #, type, cost)
        Billing.tsx         # Invoices, mark paid, download PDF
        CalendarView.tsx    # react-big-calendar month/week/day view, color by status
        PatientPortal.tsx   # Patient view: appointments + AI chat + file uploads
        DoctorPortal.tsx    # Doctor view: schedule + AI assistant panel
    vite.config.ts          # Dev: proxies /api -> localhost:8000
    nginx.conf              # Prod: proxies /api -> patient-service:8000, security headers, gzip
    Dockerfile              # Multi-stage: node build -> nginx serve
scripts/
  backup.sh                 # pg_dump to gzipped file, keeps last 7 days
.github/
  workflows/
    test.yml                # CI: pytest + npm build on every push/PR
```

## Key conventions
- DB sessions: always use `Depends(get_db)` — never call `SessionLocal()` directly
- Schemas: always use Pydantic for request/response — never raw query params for complex data
- One router file per resource
- Rate limiting: import `limiter` from `limiter.py` — NEVER create a new `Limiter()` in a router
- HTTP status codes: 201 for create, 204 for delete, 404 for not found
- All models have `id`, `created_at`, `updated_at`
- Commit style: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)
- Email and AI calls use `BackgroundTasks` — never block the response

## Database
- URL: `postgresql://admin:admin@db:5432/patients`
- Schema managed by Alembic (`alembic upgrade head` runs on every startup)

## Environment variables (.env)
```
DATABASE_URL=postgresql://admin:admin@db:5432/patients
SECRET_KEY=change-this-in-production
ENVIRONMENT=development
ANTHROPIC_API_KEY=sk-ant-...         # Required for AI features
REDIS_URL=redis://redis:6379/0
ALLOWED_ORIGINS=http://localhost:3000
# Optional email notifications:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@dentalclinic.com
```

## How to run
```bash
cd app
docker compose up --build
```
- Website: http://localhost:3000
- API docs: http://localhost:8000/docs

## How to run in production mode
```bash
cd app
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

## How to seed dummy data
After containers are running, hit this endpoint once:
```
POST http://localhost:8000/dev/seed
```
Seeds 5 patients, 3 doctors, 3 users (admin/doctor/patient), 11 appointments.

### Demo Login Accounts
| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Doctor | `dr.parker` | `doctor123` |
| Patient | `john.doe` | `patient123` |

## What's built
- [x] Patient CRUD (full profile, medical history)
- [x] Doctor CRUD
- [x] Appointments (book, cancel, delete, filter by patient/doctor)
- [x] Treatments (tooth #, procedure type, cost, description)
- [x] Billing / Invoices (create, mark paid, PDF download)
- [x] JWT Authentication (login, register, role-based access: admin/doctor/patient)
- [x] Patient Portal (appointments, AI chat, file uploads)
- [x] Doctor Portal (schedule view, mark complete, add notes, AI assistant)
- [x] AI Assistant (Claude API — pre-appointment summary, multi-turn Q&A, Redis cached)
- [x] File uploads (patient documents — images, PDF, Word; stored in Docker volume)
- [x] Dashboard charts (bar chart: appointments/month; pie chart: status breakdown)
- [x] Calendar view (react-big-calendar, color-coded by status)
- [x] Email notifications (appointment confirmation + cancellation via SMTP)
- [x] Redis cache (AI summaries cached 10 min, rate limit state shared across workers)
- [x] Rate limiting (slowapi, shared Redis-backed limiter, 10/min on login)
- [x] Security headers (X-Frame-Options, CSP, HSTS, X-Content-Type-Options via nginx)
- [x] Gunicorn production server (5 UvicornWorkers)
- [x] Non-root Docker user (appuser)
- [x] Health check endpoint (GET /health — checks DB connection)
- [x] Structured request logging (method, path, status, response time)
- [x] Alembic migrations
- [x] Seed data endpoint
- [x] Docker Compose full stack (4 services)
- [x] Backup script (pg_dump, gzip, 7-day retention)
- [x] GitHub Actions CI (pytest + frontend build)
- [x] Searchable dropdowns (type-to-filter patient/doctor selectors)

## What's next
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend + DB + Redis to Railway (or Render)

## Known decisions
- Frontend API calls go through `/api/` proxy — browser never hits :8000 directly
- Rate limiter lives in `limiter.py` — single instance shared by all routers to avoid split-brain
- Redis is optional — app falls back silently if Redis is unavailable (cache disabled, in-memory rate limiting)
- AI summary results cached 10 min in Redis to reduce Anthropic API costs
- `ANTHROPIC_API_KEY` missing → /ai/* endpoints return 503 (not a crash)
- Seed endpoint at /dev/seed — should be removed or guarded before real deployment
- docker-compose.prod.yml uses memory limits (512MB backend, 256MB frontend) and `restart: always`
