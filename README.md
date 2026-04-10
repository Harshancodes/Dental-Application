# Dental Application

A full-featured dental clinic management system built with **FastAPI**, **PostgreSQL**, and **Docker Compose**.

## Features
- Patient management (full profile + medical history)
- Doctor management
- Appointment booking, updating, and cancellation
- Auto-generated interactive API docs

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Run the app
```bash
cd app
docker compose up --build
```

The API will be available at: http://localhost:8000

Interactive docs (Swagger UI): http://localhost:8000/docs

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /patients/ | Create a patient |
| GET | /patients/ | List all patients |
| GET | /patients/{id} | Get a patient |
| PATCH | /patients/{id} | Update a patient |
| DELETE | /patients/{id} | Delete a patient |
| POST | /doctors/ | Create a doctor |
| GET | /doctors/ | List all doctors |
| PATCH | /doctors/{id} | Update a doctor |
| DELETE | /doctors/{id} | Delete a doctor |
| POST | /appointments/ | Book an appointment |
| GET | /appointments/ | List appointments |
| PATCH | /appointments/{id} | Update appointment |
| PATCH | /appointments/{id}/cancel | Cancel appointment |
| DELETE | /appointments/{id} | Delete appointment |

## Project Structure
```
app/
  docker-compose.yml
  services/
    patient-service/
      main.py          # App entry point + router registration
      models.py        # Database models (SQLAlchemy)
      schemas.py       # Request/response validation (Pydantic)
      database.py      # DB connection + session dependency
      routers/
        patients.py
        doctors.py
        appointments.py
      Dockerfile
      requirements.txt
```
