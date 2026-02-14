#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

# Run database migrations (if any)
# Run database migrations
alembic upgrade head

# Start the application
# Create initial superuser if not exists
python scripts/create_user.py admin admin@example.com admin true || true

# Start the application
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
