# 🔌 JP Electricity Spot Market Dashboard

> **Real-time electricity price predictions and market analytics for Japan's power grid**

![Dashboard Preview](./docs/dashboard.png)

A comprehensive dashboard for visualizing predicted and actual electricity prices across Japan's 9 power grid areas. Built with **Django REST Framework** and **Next.js**.

---

## ✨ Features

- 📊 **Multi-Model Price Predictions** — Compare forecasts from multiple ML models with P5/P50/P95 percentiles
- 🗾 **9 Grid Areas Covered** — Hokkaido, Tohoku, Tokyo, Chubu, Hokuriku, Kansai, Chugoku, Shikoku, Kyushu
- 🌤️ **Weather Data Integration** — Actual and forecast weather correlated with price trends
- ⚡ **JEPX Market Data** — Spot and intraday market prices from Japan Electric Power Exchange
- 📈 **Grid Operations** — Imbalance data, interconnection flows, OCCTO supply/demand
- 🔐 **JWT Authentication** — Secure API access with Google/Microsoft OAuth support
- 📥 **CSV Export** — Download predictions and actual prices for analysis

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Material UI, Recharts |
| **Backend** | Django 4.2+, Django REST Framework, drf-yasg (Swagger) |
| **Database** | SQLite (dev), Elasticsearch 8.8+ (market data) |
| **Infra** | Docker, Docker Compose, Nginx, Supervisor |

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started) & Docker Compose
- (Optional) Node.js 18+ and Python 3.10+ for local development

### 1. Clone & Configure

```bash
git clone <repository-url>
cd hdre-jp-electricity-spot-price-dashboard

# Copy and edit environment variables
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` with your settings:

```env
PROJECT_NAME=jpex-dashboard
PROJECT_PORT=8787
DEBUG=True

# Elasticsearch (required for market data)
ELASTICSEARCH_HOST=your-es-host
ELASTICSEARCH_PORT=9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
```

### 3. Launch with Docker

```bash
docker-compose build && docker-compose up
```

🎉 **Access the dashboard at:** http://localhost:8787

---

## 📖 Documentation

| Resource | URL |
|----------|-----|
| **Dashboard** | http://localhost:8787 |
| **Admin Panel** | http://localhost:8787/api/__hidden_admin/ |
| **Swagger API** | http://localhost:8787/api/__hidden_swagger |
| **Redoc API** | http://localhost:8787/api/__hidden_redoc |

---

## 🔧 Development Tools

```bash
# Create superuser for admin access
bash dev-tool.sh create-superuser

# Enter Django shell
bash dev-tool.sh shell

# Create new Django app
bash dev-tool.sh django-startapp <APP_NAME>
```

### Full Rebuild

```bash
rm -rf backend-db-data && docker-compose down -v && docker-compose build && docker-compose up
```

---

## 📸 Screenshots

| Dashboard | Model Comparison |
|-----------|------------------|
| ![Dashboard](./docs/dashboard.png) | *Add screenshot* |

---

## 📂 Project Structure

```
hdre-jp-electricity-spot-price-dashboard/
├── backend/                 # Django REST API
│   ├── market_information/  # Market data endpoints
│   ├── custom_spot_market_predict/  # Prediction APIs
│   ├── common/              # Shared services (ES client)
│   └── authentication/      # Auth & OAuth
├── frontend/
│   └── electricity-market-prediction/  # Next.js app
│       └── src/
│           ├── app/         # Next.js pages
│           ├── components/  # React components
│           ├── hooks/       # Custom React hooks
│           └── services/    # API client
├── nginx/                   # Nginx configuration
├── docker-compose.yml       # Container orchestration
└── .env.example             # Environment template
```

---

## 📊 Elasticsearch Indexes

The application uses Elasticsearch to store market data. See the [full index documentation](#elasticsearch-indexes-1) below for detailed data formats.

| Index | Description |
|-------|-------------|
| `prediction` | Model price predictions |
| `jepx_spot_nightly` | JEPX spot market data |
| `imbalance` | Grid imbalance prices |
| `weather_actual` | Observed weather data |
| `weather_forecast` | Weather forecasts |

<details>
<summary><strong>View All Indexes</strong></summary>

| Index | Description |
|-------|-------------|
| `hjks` | Power plant outages |
| `interconnection` | Interconnection flows |
| `jepx_intraday` | Intraday market |
| `jma_earthquake_actual` | Earthquake events |
| `occto_area` | OCCTO area supply/demand |
| `occto_inter` | OCCTO interconnection |
| `occto_event` | OCCTO events |
| `tdgc` | Balancing market data |

</details>

---

## 📄 License

This project is proprietary. All rights reserved.

---

## 🤝 Contributing

Please read the developer documentation in `backend/README.md` and `frontend/electricity-market-prediction/README.md` before contributing.