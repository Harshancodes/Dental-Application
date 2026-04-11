#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

# Workers = (2 x CPU cores) + 1 — standard formula for CPU-bound apps
# For a typical VPS with 2 cores this gives 5 workers
WORKERS=${GUNICORN_WORKERS:-5}

echo "Starting Dental Clinic API (production, $WORKERS workers)..."
exec gunicorn main:app \
  --workers "$WORKERS" \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
