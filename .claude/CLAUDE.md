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
- `GET /api/market-info/*` — JEPX spot, imbalance, intraday, OCCTO supply/demand, TDGC balancing market
- `GET /api/custom-spot-market-predict/*` — Price forecasts with CSV export
- `POST /api/revenue/` — Battery revenue optimization via LP solver
- `POST /api/revenue/manual` — Manual schedule simulation (user-defined charge/discharge)

Swagger UI available at `/api/docs` (requires authentication).

### Frontend Structure (`frontend/electricity-market-prediction/src/`)

- **`app/`** — Next.js App Router pages; `/dashboard/*` is the protected area
- **`hooks/useMarketData.ts`** — Central data-fetching hook; manages all market/weather/battery state, date ranges, area selection, and prevents race conditions via request IDs
- **`hooks/useRevenuePageData.ts`** — Atomic fetch coordination for revenue-simulation page; single `sessionKey` dependency, `isReady` only after `Promise.allSettled`, individual model failures non-blocking
- **`hooks/useVersionedDateSelection.ts`** — Date range with monotonic version counter; `commit()`, `applyPreset()`, `shiftByDays()` methods; version increments even when dates unchanged to force re-fetches
- **`services/`** — Typed API client functions (`marketApi.ts`, `predictionsApi.ts`, `weatherApi.ts`, `gridOperationsApi.ts`)
- **`context/AuthContext.tsx`** — Auth state; `context/MarketDataContext.tsx` — shared market state
- **`components/`** — Organized by domain: `charts/`, `forecast/`, `market/`, `price-chart/`, `revenue/`, `weather/`, `selectors/`, `layout/`
- **`types/`** — Shared TypeScript interfaces; `dateRange.ts` defines `DateRangeSelection` with version counter
- **`utils/manualSimulationClient.ts`** — Client-side battery simulation for instant UI preview (no API roundtrip); TypeScript port of Python backend algorithm
- **`utils/scenarioGenerators.ts`** — 8 algorithmic scenario generators (`nday-avg`, `percentile`, `fixed-window`, `cycle-target`, `spread-threshold`, `peak-valley`, `price-momentum`, `conservative`)
- **`components/price-chart/overlays/`** — Overlay data source plugin system; `types.ts` defines `OverlayDataSource` interface, `tdgc.ts` is the reference implementation

### React Hooks — No Hooks After Early Returns

**CRITICAL: Never place `useState`, `useMemo`, `useEffect`, or any hook call after a conditional early `return` in a component.** React requires hooks to be called in the same order every render. Violating this causes "Rendered more hooks than during the previous render" crashes.

**Wrong:**
```tsx
if (!hasData) return <Empty />;      // ← early return
const summary = useMemo(() => …);    // ← hook after return = CRASH
```

**Correct:**
```tsx
const summary = useMemo(() => …);    // ← all hooks first
if (!hasData) return <Empty />;      // ← early returns after all hooks
```

### Dashboard Pages

| Route | Purpose |
|-------|---------|
| `/dashboard` | Live spot prices, key metrics overview |
| `/dashboard/forecast` | Multi-model predictions (Mersol, Volue) with P5/P50/P95 |
| `/dashboard/revenue-simulation` | Battery optimization: LP solver + manual scheduling + scenario suggestions + KPI metrics |
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
| `tdgc` | Balancing market (調整力市場) data |

See `data-mapping.md` for full index schema documentation.

### Import Aliases

Frontend uses `@/*` → `src/*`. Example: `import { useMarketData } from '@/hooks/useMarketData'`.

### I18n Conventions

**Library:** i18next + react-i18next. **Languages:** zh-TW (fallback), en, ja. **Detection:** localStorage key `hdjp-language`, then browser navigator.

**Namespace → Feature mapping:**

| Namespace | Scope |
|-----------|-------|
| `common` | Shared UI (buttons, toolbar, areas, error display, auth aria-labels) |
| `navigation` | Sidebar items, user menu, mobile menu |
| `settings` | Settings page |
| `auth` | Login form, setup form, dev-tool quick setup |
| `dashboard` | Spot overview, quick-access cards, metrics cards, outage badge/drawer |
| `forecast` | Market analysis, data sources, weather fields, axis controls, axis validation |
| `siteRevenue` | Battery simulation, scenario generators, KPIs |
| `generationMix` | Generation sources, outage info |
| `dataStatus` | Data monitoring, Gantt, column labels |
| `weather` | Weather sidebar, data table |
| `dailyCompare` | Daily overlay metrics |

**How to add a new translatable string:**
1. Add the key to all 3 locale files (`locales/zh-TW/<ns>.json`, `locales/en/<ns>.json`, `locales/ja/<ns>.json`)
2. In the component: `const { t } = useTranslation('<namespace>')` then `t('key')` or `t('key', { var: value })`
3. For multiple namespaces: `const { t } = useTranslation('primary'); const { t: tOther } = useTranslation('other')`

**Non-React code (classes, utilities):** Use the `labelKey` pattern — return i18n key strings from the function, resolve with `t()` in the consuming React component. See `AxisRangeValidator.ts` → `SecondaryAxisControls.tsx` for the pattern.

**Area names:** Use `getAreaName(t, areaCode)` from `utils/areaI18n.ts` or `useAreaName()` hook. Resolves via `common:areas.<code>`.

**CRITICAL: Never hardcode user-facing CJK text in components.** All display strings must go through `t()`.

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

### LWC Overlay Data Source — Two-Layer Architecture Rule

**CRITICAL: New overlay data sources on the LWC price chart MUST follow the two-layer pattern. Violating this causes the entire chart to disappear when toggling data sources.**

The price chart's data pipeline is split into two layers:

| Layer | File | Role | Recompute cost |
|-------|------|------|----------------|
| **Merge layer** | `useChartData.ts` | Merges raw API data into `processedChartData` (one unified timeline) | **High** — rebuilds ALL data points, triggers every downstream memo and chart series redraw |
| **Transform layer** | `useChartDataTransformers.ts` | Extracts selected fields from `processedChartData` into LWC-ready series arrays | **Low** — only regenerates the affected series |

**The rule:** In the merge layer (`useChartData`), always process **ALL fields** of a data source unconditionally. Never gate field processing behind a `selectedXxxFields` Set. Field selection must only happen in the transform layer.

**Why:** If `selectedXxxFields` is a dependency of the `processedChartData` useMemo, toggling a field triggers a full recompute of the entire merged dataset. This causes all chart series (spot price, models, imbalance, etc.) to be rebuilt and redrawn simultaneously, which makes the chart visually disappear. By keeping field selection out of the merge layer, toggling fields only triggers a lightweight series-level update.

**Correct pattern (interconnection, battery, TDGC):**
```typescript
// useChartData.ts — merge layer: process ALL fields, no selection filter
interconnectionData.forEach(item => {
    const point = ensurePoint(ts);
    point.interconnection_flow_diff = forward - reverse;
    point.interconnection_forward = forward;
    // ... all fields stored unconditionally
});

// useChartDataTransformers.ts — transform layer: filter by selection
INTERCONNECTION_FIELDS.forEach(f => {
    if (!selectedInterconnectionFields.has(f.key)) return; // ← selection here
    const data = convertToLineSeriesData(processedChartData, p => p[f.pointKey], timezone);
    out.push({ fieldKey: f.key, data, ... });
});
```

**When adding a new overlay data source (preferred — plugin approach):**

A plugin interface (`OverlayDataSource`) is defined in `components/price-chart/overlays/types.ts`. New sources should implement this interface so that merge + transform + field metadata live in a **single file** under `overlays/`. See `overlays/tdgc.ts` as the reference implementation.

1. **Create `overlays/<source>.ts`** — implement `OverlayDataSource<TRaw>` with `fields`, `categories` (optional), `merge()`, and `transform()`.
2. **Re-export** from `overlays/index.ts`.
3. **Wire into existing hooks** (until the generic `useOverlayDataSources` hook is built):
   - `useChartData.ts` — call `source.merge()` in the merge layer.
   - `useChartDataTransformers.ts` — call `source.transform()` in a `useMemo`.
   - `useChartSeries.ts` — render returned `TransformedSeries[]` and add subchart IDs to `knownSubCharts`.
   - `ChartInfoPanel.tsx` — add tooltip DataChip section.
   - `PriceChartSeriesLegend.tsx` — add legend items.
   - `ForecastControlBar.tsx` — add source chip + popover.
   - `PriceChartContext.tsx` — add selection state.
   - `useForecastPresets.ts` + `presets.ts` — add to preset capture/restore.

**Legacy (manual) approach** (existing sources not yet migrated):
Steps 3's sub-items above are the same 9-file touch pattern used by interconnection, battery, bid plans, and imbalance. These will be migrated to the plugin interface incrementally.

### Environment Variables

Copy `.env.example` to `.env`. Key variables: `ELASTICSEARCH_HOST`, `ELASTICSEARCH_PORT`, `SECRET_KEY`, `DATABASE_URL`.

### Operations — 維運注意

**CRITICAL: 後端必須單一 uvicorn worker 跑（`UVICORN_WORKERS=1`，見 `backend/docker-entrypoint.sh`）。不要改回多 worker。**

本 app 有多個「每行程一份」的單例，多 worker 會各跑一份、互相打架且爆記憶體：

- **APScheduler**（`app/services/scheduler.py`）在每個 worker 各啟動一份 → 每個 cron job（daily snapshot / broker batch / retry / podcast sync）重複跑 N 次，且 SQLite 互相搶寫鎖。
- **TPEX Camoufox 共用 browser session**（`app/services/broker_crawlers/bsr_tpex.py`）+ **broker `Semaphore(1)`**（`broker_service.py`）都是 process 內單例；N worker = N 個 Firefox + 併發控制失效。
- **SQLite 單寫者**：多 worker 併發寫易 `database is locked`。

曾發生的事故（供回溯）：`--workers 4` 時 4 份 Camoufox + 4× 記憶體 → 容器 `OOMKilled`，OOM killer 殺掉瀏覽器子行程，log 出現 `TargetClosedError` / `Connection closed while reading from the driver` / `write EPIPE`，且每個 scheduler job 錯誤 4 連發。改 `--workers 1` 後 idle 記憶體從 ~1900MiB 降到 ~115MiB。

要橫向擴充 web 吞吐，正解是把 **web** 與 **scheduler/crawler** 拆成不同服務（各自單行程），而非靠 uvicorn workers。

**Camoufox 防護**（`bsr_tpex.py`）：`_close_session` 會在 graceful close 失敗/逾時時 `SIGKILL` 殘留的 camoufox 孤兒行程（/proc 掃描，僅 Linux）；`reap_idle_session()` 由 scheduler 每分鐘呼叫，閒置超過 `_SESSION_TTL_S` 就主動關瀏覽器釋放記憶體。動到 broker 抓取時別把這些拿掉。

**容器記憶體**：`backend-api` `mem_limit: 2g`（`docker-compose.yml`）。單行程下 idle ~115MiB、單檔抓取尖峰 ~600MiB，2g 為充足 headroom。
