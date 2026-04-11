#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting Dental Clinic API (development)..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
