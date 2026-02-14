# FastAPI Backend Migration

This directory contains the new FastAPI backend which replaces the legacy Django backend.

## Structure

- `app/`: Main application code
    - `api/v1/`: API endpoints (Auth, Area, Market Info, Revenue, Prediction)
    - `core/`: Core configuration, logging, security, constants
    - `models/`: SQLAlchemy database models
    - `schemas/`: Pydantic schemas for request/response validation
    - `services/`: Business logic (Elasticsearch, Optimization)
- `alembic/`: Database migration scripts
- `scripts/`: Utility scripts (Create User, Test ES)

## Prerequisities

- Docker & Docker Compose
- Elasticsearch (running via Docker Compose)

## Setup & Running

The backend is integrated into the root `docker-compose.yml`.

1. **Build and Start:**
   ```powershell
   docker compose up --build -d backend-api
   ```

2. **Run Migrations:**
   ```powershell
   docker compose exec backend-api alembic upgrade head
   ```

3. **Create Initial User:**
   ```powershell
   # Usage: python scripts/create_user.py <username> <email> <password> [is_superuser]
   docker compose exec backend-api python scripts/create_user.py admin admin@example.com admin true
   ```

4. **Verify:**
   Access `http://localhost:8000/docs` to see the Swagger UI.

## Environment Variables

Configuration is handled via `pydantic-settings` interpreting environment variables.
See `app/config.py` for all available settings.
Key variables are passed via `docker-compose.yml`.

## Development

- The code is mounted as a volume, so changes in `backend_fastapi/` are reflected immediately (hot-reload enabled).
- Logs are streamed to stdout/stderr.

## Testing

Use the scripts in `scripts/` to verify connections:
```powershell
docker compose exec backend-api python scripts/test_es_connection.py
docker compose exec backend-api python scripts/test_es_queries.py
```
