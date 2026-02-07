# Backend Developer Guide

> Django REST Framework backend for the JP Electricity Spot Market Dashboard

---

## 📂 Project Structure

```
backend/
├── backend/                 # Django project settings
│   ├── settings.py          # Main configuration
│   ├── urls.py              # Root URL routing
│   └── wsgi.py              # WSGI entry point
├── market_information/      # Market data API
│   ├── views.py             # ViewSets for market endpoints
│   ├── serializers.py       # DRF serializers
│   └── urls.py              # Endpoint routing
├── custom_spot_market_predict/  # Prediction API
│   ├── views.py             # Prediction ViewSets
│   └── urls.py              # Prediction routing
├── common/                  # Shared utilities
│   └── es_service.py        # Elasticsearch client
├── authentication/          # Auth + OAuth
├── area/                    # Area definitions
├── custom_jwt/              # JWT configuration
├── userprofile/             # User management
├── ping/                    # Health check
├── templates/               # HTML templates
├── manage.py                # Django CLI
└── docker-entrypoint.sh     # Container startup
```

---

## 🔧 Environment Setup

### Prerequisites

- Python 3.10+
- Elasticsearch 8.8+
- Redis (for caching)

### 1. Virtual Environment

```bash
cd backend

# Using venv
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Variables

Create `.env` in the project root:

```env
# Django
DEBUG=True
SECRET_KEY=your-secret-key

# Elasticsearch (Required)
ELASTICSEARCH_HOST=localhost
ELASTICSEARCH_PORT=9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=

# Elasticsearch Indexes (Optional - defaults shown)
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

# OAuth (Optional)
SOCIAL_GOOGLE_CLIENT_ID=
SOCIAL_GOOGLE_CLIENT_SECRET=
SOCIAL_MICROSOFT_CLIENT_ID=
SOCIAL_MICROSOFT_CLIENT_SECRET=
```

### 3. Database Setup

```bash
# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

---

## 🚀 Development Workflow

### Running the Server

```bash
# Development server
python manage.py runserver 8000

# Or with auto-reload
python manage.py runserver 0.0.0.0:8000
```

### Linting & Formatting

```bash
# Format with Black
black .

# Sort imports
isort .

# Lint with flake8
flake8 .
```

### Running Tests

```bash
# All tests
python manage.py test

# Specific app
python manage.py test market_information

# With coverage
coverage run --source='.' manage.py test
coverage report
```

---

## 📖 API Documentation

After starting the server:

| Resource | URL |
|----------|-----|
| **Swagger UI** | http://localhost:8000/api/__hidden_swagger |
| **ReDoc** | http://localhost:8000/api/__hidden_redoc |
| **Admin Panel** | http://localhost:8000/api/__hidden_admin/ |

---

## 🗂️ Key Components

### ESService (`common/es_service.py`)

Central Elasticsearch client for all market data queries:

```python
from common.es_service import ESService

es = ESService()

# Fetch JEPX spot prices
prices = es.get_jepx_trades(
    start_date='20250101',
    end_date='20250107',
    area_name='tokyo'
)

# Fetch predictions
predictions = es.get_predictions(
    start_date='20250101',
    end_date='20250107',
    area_name='tokyo',
    model_name='ModelA'
)
```

### ViewSets

- **MarketInformationViewSet** — Endpoints for spot prices, imbalance, weather, OCCTO data
- **CustomPredictViewSet** — Prediction queries and CSV export
- **PredictionModelViewSet** — List available prediction models

---

## 🐛 Troubleshooting

### Elasticsearch Connection Failed

```
elasticsearch.exceptions.ConnectionError: Connection refused
```

**Fix:** Ensure Elasticsearch is running and env vars are correct:
```bash
curl http://localhost:9200/_cluster/health
```

### Import Errors

```
ModuleNotFoundError: No module named 'rest_framework'
```

**Fix:** Activate virtual environment and install dependencies:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Migration Conflicts

```
django.db.migrations.exceptions.InconsistentMigrationHistory
```

**Fix:** Reset migrations (development only):
```bash
rm db.sqlite3
find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
python manage.py makemigrations
python manage.py migrate
```

---

## 📚 Reference

- [Django REST Framework Docs](https://www.django-rest-framework.org/)
- [drf-yasg (Swagger)](https://drf-yasg.readthedocs.io/)
- [Elasticsearch Python Client](https://elasticsearch-py.readthedocs.io/)
