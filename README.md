# Dental Clinic Management System

A full-stack dental clinic management system built with **FastAPI**, **React**, **PostgreSQL**, and **Docker**.

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

- **Patient management** — full profile, medical history, contact details
- **Doctor management** — specialization, contact details
- **Appointments** — book, cancel, reschedule
- **Treatments** — log procedures with tooth number and cost
- **Billing** — invoices, mark as paid, track outstanding amounts
- **JWT Authentication** — secure login with role-based access
- **Patient Portal** — patients see only their own appointments
- **Doctor Portal** — doctors see their schedule, mark appointments complete, add notes

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
│  Port 3000      │        │    Port 8000      │        │  Port 5432  │
└─────────────────┘        └──────────────────┘        └─────────────┘
```

All three run inside **Docker containers** managed by **Docker Compose**.

---

### How Docker Works Here

Docker packages each part of the app into an isolated box called a **container**. Without Docker you'd need to manually install Python, Node.js, and PostgreSQL on your machine and manage version conflicts. Docker handles all of that.

```
docker-compose.yml
├── db               ← PostgreSQL container (the database)
├── patient-service  ← FastAPI backend container (the API)
└── frontend         ← React + nginx container (the website)
```

When you run `docker compose up --build`, Docker:
1. Builds the **backend** image — installs Python and all packages from `requirements.txt`
2. Builds the **frontend** image — installs Node.js, builds the React app, sets up nginx
3. Pulls the **PostgreSQL** image from Docker Hub
4. Starts all three and connects them on a private internal network

Inside Docker, containers talk to each other by **service name** not `localhost`:
- Backend connects to database as `db:5432` (not `localhost:5432`)
- nginx proxies API calls to `patient-service:8000`

**Data persistence** — the database files live in a Docker **volume** called `postgres_data`. This volume is separate from the container, so data survives restarts.

```bash
docker compose up --build   # restarts with new code — data is SAFE
docker compose down         # stops everything — data is SAFE
docker compose down -v      # stops + deletes volume — data is GONE
```

---

### Backend (FastAPI + Python)

```
services/patient-service/
├── main.py       # App entry point, registers all routers, enables CORS
├── models.py     # Database table definitions (SQLAlchemy ORM)
├── schemas.py    # Request/response validation (Pydantic)
├── database.py   # DB connection + session dependency
├── deps.py       # JWT auth utilities (hash password, verify token)
└── routers/
    ├── auth.py          # POST /auth/login  POST /auth/register
    ├── patients.py      # CRUD /patients
    ├── doctors.py       # CRUD /doctors
    ├── appointments.py  # CRUD /appointments
    ├── treatments.py    # CRUD /treatments
    ├── billing.py       # CRUD /billing
    └── seed.py          # POST /dev/seed (loads dummy data)
```

**How a request flows through the backend:**

```
POST /patients/   ← request arrives
      │
      ▼
  Router (patients.py)
      │  Pydantic validates the request body
      │  rejects bad data before it touches the DB
      ▼
  get_current_user (deps.py)
      │  reads the JWT token from the Authorization header
      │  verifies it's valid and not expired
      ▼
  SQLAlchemy ORM
      │  translates Python objects into SQL queries
      ▼
  PostgreSQL     ← data is saved
      │
      ▼
  Pydantic schema shapes the response
      │
      ▼
  JSON response sent back to browser
```

**Key concepts:**

**SQLAlchemy ORM** — Instead of writing raw SQL, you write Python:
```python
# Instead of: INSERT INTO patients (name) VALUES ('John')
patient = Patient(name="John")
db.add(patient)
db.commit()
```

**Pydantic Schemas** — Validates every incoming request automatically:
```python
class PatientCreate(BaseModel):
    name: str               # required
    phone: Optional[str]    # optional
    email: Optional[EmailStr]  # must be valid email if provided
```

**Dependency Injection** — FastAPI automatically provides shared resources to routes:
```python
def create_patient(
    patient: PatientCreate,           # validated request body
    db: Session = Depends(get_db),    # DB session (always closed after)
    user: User = Depends(get_current_user)  # logged-in user from JWT
):
```

**JWT Authentication** — On login, the server creates a signed token:
```
Login with username + password
        │
        ▼
Server verifies password (bcrypt hash comparison)
        │
        ▼
Server creates JWT token containing: { username, role, id, doctor_id, patient_id }
        │
        ▼
Frontend stores token in localStorage
        │
        ▼
Every future request sends: Authorization: Bearer <token>
        │
        ▼
Server reads token, knows who you are — no DB lookup needed
```

---

### Frontend (React + TypeScript)

```
frontend/src/
├── api/               # Functions that call the backend (axios)
│   ├── client.ts      # Axios instance — attaches JWT token to every request
│   ├── auth.ts
│   ├── patients.ts
│   ├── doctors.ts
│   ├── appointments.ts
│   ├── treatments.ts
│   └── billing.ts
├── types/
│   └── index.ts       # TypeScript interfaces (Patient, Doctor, Appointment...)
├── context/
│   └── AuthContext.tsx  # Stores logged-in user globally, login/logout functions
├── components/
│   ├── Layout.tsx       # Sidebar + main content wrapper
│   ├── Sidebar.tsx      # Navigation — changes based on user role
│   ├── Modal.tsx        # Reusable popup modal
│   └── ProtectedRoute.tsx  # Redirects to /login if not authenticated
└── pages/
    ├── Login.tsx
    ├── Dashboard.tsx
    ├── Patients.tsx
    ├── Doctors.tsx
    ├── Appointments.tsx
    ├── Treatments.tsx
    ├── Billing.tsx
    ├── PatientPortal.tsx
    └── DoctorPortal.tsx
```

**How the API proxy works:**

The frontend never calls `localhost:8000` directly. All API calls go to `/api/...` and are forwarded automatically:

```
Frontend calls → /api/patients/
                      │
          ┌───────────┴───────────┐
          │ Development (Vite)    │ Production (nginx)
          │ vite.config.ts proxy  │ nginx.conf proxy
          └───────────┬───────────┘
                      │
                      ▼
          patient-service:8000/patients/
```

This means the browser only ever talks to one server. The backend address is never exposed.

**How role-based access works:**

```
Login
  │
  ├── role = admin   →  /dashboard       (full app — all pages visible)
  ├── role = doctor  →  /doctor-portal   (only their schedule)
  └── role = patient →  /patient-portal  (only their appointments)
```

The sidebar automatically shows different navigation items based on the logged-in user's role.

---

### Database (PostgreSQL)

Six tables with relationships:

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

- A **patient** has many appointments and invoices
- A **doctor** has many appointments
- An **appointment** has many treatments and one invoice
- A **user** account links to either a doctor or patient record

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Database | PostgreSQL 16 | Production-grade relational database |
| ORM | SQLAlchemy | Python ↔ SQL — no raw queries needed |
| Backend | FastAPI | Fast, modern Python API framework with auto docs |
| Validation | Pydantic v2 | Request/response validation with type safety |
| Auth | JWT + bcrypt | Industry standard — stateless, secure |
| Frontend | React 18 + TypeScript | Component-based UI with type safety |
| Styling | Tailwind CSS | Utility-first — professional UI fast |
| HTTP client | Axios | API calls from frontend with interceptors |
| Routing | React Router v6 | Client-side page navigation |
| Bundler | Vite | Fast development server and build tool |
| Containers | Docker | Consistent environment everywhere |
| Orchestration | Docker Compose | Run all containers with one command |
| Prod server | nginx | Serves static React files + proxies API |

---

## Project Structure

```
Dental-Application/
├── CLAUDE.md                    # AI assistant context file
├── README.md                    # This file
└── app/
    ├── docker-compose.yml       # Defines all 3 services
    ├── frontend/                # React application
    │   ├── Dockerfile           # Multi-stage: node build → nginx serve
    │   ├── nginx.conf           # Serves React + proxies /api to backend
    │   ├── src/
    │   └── ...
    └── services/
        └── patient-service/     # FastAPI application
            ├── Dockerfile
            ├── requirements.txt
            └── ...
```

---

## API Reference

Full interactive docs available at **http://localhost:8000/docs** when running.

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
| POST | /dev/seed | Load dummy data | No |
