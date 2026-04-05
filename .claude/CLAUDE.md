# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A full-stack Japanese electricity market analytics dashboard for JEPX (Japan Electric Power eXchange) spot prices, forecasting, battery storage optimization, and grid operations data.

## Development Commands

### Frontend

```bash
cd frontend/electricity-market-prediction
npm run dev        # Start dev server with Turbopack
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Run Jest tests
npm run test:watch # Jest in watch mode
```

### Backend

```bash
cd backend
# Run locally (requires Python 3.11+)
pip install -r requirements.txt
uvicorn app.main:app --reload

# Database migrations
alembic upgrade head
alembic revision --autogenerate -m "description"

# Create a user
python scripts/create_user.py

# Test Elasticsearch connection
python scripts/test_es.py
```

### Docker (full stack)

```bash
docker-compose up --build   # Start all services
docker-compose up -d        # Start in background
```

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, MUI 6, ECharts |
| Backend | FastAPI, Pydantic 2, SQLAlchemy 2 (async), Python 3.11+ |
| Market Data | Elasticsearch 8.8+ (time-series indices) |
| User Data | SQLite + aiosqlite (async) |
| Optimization | PuLP (linear programming for battery scheduling) |
| Auth | JWT via python-jose, argon2 password hashing |
| Infra | Docker Compose, Nginx reverse proxy, Redis (provisioned, unused) |

### Request Flow

```
Browser → Nginx → /api/* → FastAPI backend → Elasticsearch
                → /*     → Next.js frontend
```

JWT tokens are stored client-side; the Axios instance in `frontend/.../src/services/apiClient.ts` automatically attaches them to every request.

### Backend Structure (`backend/app/`)

- **`api/v1/`** — Route handlers: `auth.py`, `area.py`, `market_info.py`, `prediction.py`, `revenue.py`
- **`services/es_service.py`** — All Elasticsearch queries (the primary data layer)
- **`services/optimization.py`** — PuLP battery charge/discharge scheduler (LP solver)
- **`services/manual_simulation.py`** — Manual battery schedule simulation; mirrors client-side algorithm exactly for frontend/backend parity
- **`schemas/`** — Pydantic request/response models
- **`models/`** — SQLAlchemy ORM (only `users` table)
- **`config.py`** — `Settings` class (Pydantic BaseSettings, reads from env)

Key API routes:
- `POST /api/auth/login` — JWT token
- `GET /api/area/list` — Japanese grid regions (Hokkaido → Kyushu)
- `GET /api/market-info/*` — JEPX spot, imbalance, intraday, OCCTO supply/demand
- `GET /api/custom-spot-market-predict/*` — Price forecasts with CSV export
- `POST /api/revenue/` — Battery revenue optimization via LP solver
- `POST /api/revenue/manual` — Manual schedule simulation (user-defined charge/discharge)

Swagger UI available at `/api/docs` (requires authentication).

### Frontend Structure (`frontend/electricity-market-prediction/src/`)

- **`app/`** — Next.js App Router pages; `/dashboard/*` is the protected area
- **`hooks/useMarketData.ts`** — Central data-fetching hook; manages all market/weather/battery state, date ranges, area selection, and prevents race conditions via request IDs
- **`hooks/useRevenuePageData.ts`** — Atomic fetch coordination for site-revenue page; single `sessionKey` dependency, `isReady` only after `Promise.allSettled`, individual model failures non-blocking
- **`hooks/useVersionedDateSelection.ts`** — Date range with monotonic version counter; `commit()`, `applyPreset()`, `shiftByDays()` methods; version increments even when dates unchanged to force re-fetches
- **`services/`** — Typed API client functions (`marketApi.ts`, `predictionsApi.ts`, `weatherApi.ts`, `gridOperationsApi.ts`)
- **`context/AuthContext.tsx`** — Auth state; `context/MarketDataContext.tsx` — shared market state
- **`components/`** — Organized by domain: `charts/`, `forecast/`, `market/`, `price-chart/`, `revenue/`, `weather/`, `selectors/`, `layout/`
- **`types/`** — Shared TypeScript interfaces; `dateRange.ts` defines `DateRangeSelection` with version counter
- **`utils/manualSimulationClient.ts`** — Client-side battery simulation for instant UI preview (no API roundtrip); TypeScript port of Python backend algorithm
- **`utils/scenarioGenerators.ts`** — 8 algorithmic scenario generators (`nday-avg`, `percentile`, `fixed-window`, `cycle-target`, `spread-threshold`, `peak-valley`, `price-momentum`, `conservative`)

### Dashboard Pages

| Route | Purpose |
|-------|---------|
| `/dashboard` | Live spot prices, key metrics overview |
| `/dashboard/forecast` | Multi-model predictions (Mersol, Volue) with P5/P50/P95 |
| `/dashboard/site-revenue` | Battery optimization: LP solver + manual scheduling + scenario suggestions + KPI metrics |
| `/dashboard/generation-mix` | Grid generation by energy source |
| `/dashboard/daily-compare` | Multi-area day-over-day comparison with small multiples |
| `/dashboard/data-status` | Data availability timeline and coverage |
| `/dashboard/data-status/records` | Detailed data record viewer |
| `/dashboard/weather` | Actual/forecast weather for 9 regions |
| `/dashboard/settings` | User preferences (region, chart settings) |

### Site Revenue Page — Battery Simulation System

The most complex page in the app. Key design decisions:

- **Dual simulation**: `manualSimulationClient.ts` runs the same algorithm client-side (instant feedback); `POST /revenue/manual` confirms on the backend. The algorithms must remain identical.
- **Atomic data fetch**: `useRevenuePageData` uses a single `sessionKey` + `Promise.allSettled` so the UI only shows results after all model requests settle. Partial results never surface.
- **Scenario generators** live in `utils/scenarioGenerators.ts` and return `ManualSlot[]` for direct application to the editor. `calcPhysicsSlots(config)` computes slot counts from battery physics (capacity, power, efficiency).
- **Component hierarchy**: `RevenueControlBar` (area + model selection) → `RevenueKpiHeader` (4 KPIs: optimal, best model, efficiency %, manual) → `RevenueAnalysisContainer` → `ManualScheduleSidebar` (date tabs + `ManualScheduleEditor` + `ScenarioGenerator`) + chart panels.
- **Cross-day carry-over**: `ManualScheduleSidebar` passes `initialSocMwh` to chain SoC state across dates in multi-day simulations.

### Elasticsearch Indices

The primary data store for all market and operational data:

| Index | Contents |
|-------|---------|
| `prediction` | Price forecasts from Mersol, Volue, etc. |
| `jepx_spot_area_price` | Regional spot prices |
| `jepx_spot_system` | System-wide JEPX metrics and bids |
| `jepx_intraday` | Intraday market data |
| `imbalance` | Imbalance settlement prices |
| `hjks_outage` | Generator outage events |
| `occto_area`, `occto_inter`, `occto_event` | Grid operator data |
| `weather_actual_hourly/daily`, `weather_forecast_hourly/daily` | Weather data |
| `battery_data`, `bid_plans` | Battery operations |

See `data-mapping.md` for full index schema documentation.

### Import Aliases

Frontend uses `@/*` → `src/*`. Example: `import { useMarketData } from '@/hooks/useMarketData'`.

### Lightweight Charts (LWC) — Datetime Handling Rule

**CRITICAL: Always use `parseToTimestamp` + `toChartTime` for LWC data, never `new Date(str).getTime() / 1000` directly.**

Lightweight Charts treats all `UTCTimestamp` values as UTC seconds. The data from Elasticsearch is stored in JST local time without timezone suffix (e.g. `"2024-01-01T00:00:00"` or `"2024-01-01 00:00:00"`). Parsing with `new Date()` makes the result browser-timezone-dependent and shifts the axis display by 9h in JST browsers.

**Correct pattern** (already established — do not deviate):
```typescript
import { parseToTimestamp, toChartTime } from '@/utils/chartUtils';

// JST datetime string → UTCTimestamp for LWC (fake-UTC: LWC axis shows JST wall time)
const toDisplayTime = (datetime: string): UTCTimestamp =>
  toChartTime(parseToTimestamp(datetime) ?? 0, 'Asia/Tokyo') as UTCTimestamp;

// For fields that need plain number (e.g. OutageRangeZone.startTime):
const startTime: number = Number(toDisplayTime(o.start_datetime));
```

- `parseToTimestamp` treats no-timezone strings as JST (+09:00), returns real UTC ms.
- `toChartTime(ms, 'Asia/Tokyo')` adds +9h offset so LWC's UTC-based axis displays JST wall time.
- This only applies to **data going into LWC chart series**. Displayed labels (Typography, etc.) can use raw datetime strings directly (e.g., `datetime.slice(0, 16).replace('T', ' ')`).

**Files using this correctly:** `AllAreasPriceChart.tsx`, `price-chart/utils/transformers.ts`, `chart/converters.ts`, `WeatherTimeSeriesChart.tsx`, `GenerationMixLightweightChart.tsx`, `InterconnectionChartLightweight.tsx`, `IntradayPanel.tsx`.

### Environment Variables

Copy `.env.example` to `.env`. Key variables: `ELASTICSEARCH_HOST`, `ELASTICSEARCH_PORT`, `SECRET_KEY`, `DATABASE_URL`.
