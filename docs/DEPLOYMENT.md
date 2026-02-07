# Deployment Guide

## JP Electricity Spot Market Dashboard

This document covers deployment for both development and production environments.

---

## Prerequisites

- Docker & Docker Compose
- Elasticsearch 8.x (external or containerized)
- Node.js 18+ (for frontend development)
- Python 3.12+ (for backend development)

---

## Quick Start (Docker Compose)

### 1. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your settings
nano .env
```

### 2. Build and Run

```bash
# Build and start all services
docker-compose build && docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Initial Setup

```bash
# Create superuser
bash dev-tool.sh create-superuser

# Or on Windows
powershell dev-tool.ps1 create-superuser
```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `PROJECT_NAME` | Docker container prefix | `jepx-dashboard` |
| `PROJECT_PORT` | Exposed port | `8787` |
| `ELASTICSEARCH_HOST` | ES host URL | `http://es.example.com` |
| `ELASTICSEARCH_PORT` | ES port | `9200` |
| `ELASTICSEARCH_USERNAME` | ES username | `elastic` |
| `ELASTICSEARCH_PASSWORD` | ES password | `changeme` |

### Optional (OAuth)

| Variable | Description |
|----------|-------------|
| `SOCIAL_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `SOCIAL_GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `SOCIAL_MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID |
| `SOCIAL_MICROSOFT_CLIENT_SECRET` | Microsoft OAuth secret |

### Elasticsearch Indices

All have defaults but can be overridden:
```env
ES_INDEX_PREDICTION=prediction
ES_INDEX_JEPX=jepx_spot_nightly
ES_INDEX_IMBALANCE=imbalance
ES_INDEX_HJKS=hjks
ES_INDEX_INTERCONNECTION=interconnection
ES_INDEX_INTRADAY=jepx_intraday
ES_INDEX_EARTHQUAKE=jma_earthquake_actual
ES_INDEX_OCCTO_AREA=occto_area
ES_INDEX_OCCTO_INTER=occto_inter
ES_INDEX_OCCTO_EVENT=occto_event
ES_INDEX_TDGC=tdgc
ES_INDEX_WEATHER_ACTUAL=weather_actual
ES_INDEX_WEATHER_FORECAST=weather_forecast
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Nginx (port 80)                  │
│         Routes /api/* → backend, /* → frontend      │
├─────────────────────────────────────────────────────┤
│   Frontend (Next.js)    │    Backend (Django/DRF)   │
│   - Static export       │    - REST API             │
│   - Served via Nginx    │    - Supervisord managed  │
│                         │    - Redis cache          │
└─────────────────────────┴───────────────────────────┘
                            ↓
                    ┌───────────────┐
                    │ Elasticsearch │
                    │   (external)  │
                    └───────────────┘
```

---

## Services

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| `frontend` | `{PROJECT_NAME}-frontend` | - | Next.js app |
| `backend-api` | `{PROJECT_NAME}-api` | - | Django API |
| `backend-redis` | `{PROJECT_NAME}-redis` | - | Redis cache |
| `backend-nginx` | `{PROJECT_NAME}-nginx` | 80→`PROJECT_PORT` | Reverse proxy |

---

## Dev Scripts

### Using Shell (Linux/Mac)

```bash
bash dev-tool.sh <command>
```

### Using PowerShell (Windows)

```powershell
.\dev-tool.ps1 <command>
```

### Available Commands

| Command | Description |
|---------|-------------|
| `create-superuser` | Create Django admin user |
| `shell` | Enter Django shell |
| `django-startapp <name>` | Create new Django app |
| `migrations` | Run Django migrations |
| `collect-statics` | Collect static files |
| `bash` | Enter container bash |
| `supervisorctl` | Manage supervisord |
| `reload-nginx` | Reload nginx config |

---

## Production Checklist

1. **Set `DEBUG=False`** in `.env`
2. **Configure trusted origins** in `settings.py` (`CSRF_TRUSTED_ORIGINS`)
3. **Use strong `SECRET_KEY`**
4. **Enable HTTPS** via nginx
5. **Configure proper ES credentials**
6. **Set up log rotation**

---

## Troubleshooting

### Backend not starting
```bash
docker-compose logs backend-api
```

### Database reset
```bash
rm -rf backend-db-data && docker-compose down -v && docker-compose up -d
```

### Redis connection issues
```bash
docker-compose exec backend-redis redis-cli ping
```

---

## URLs

| Path | Description |
|------|-------------|
| `http://localhost:{PORT}/` | Frontend dashboard |
| `http://localhost:{PORT}/api/__hidden_admin/` | Django admin |
| `http://localhost:{PORT}/api/__hidden_swagger` | Swagger UI |
| `http://localhost:{PORT}/api/__hidden_redoc` | ReDoc |
