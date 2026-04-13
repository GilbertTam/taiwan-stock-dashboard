/**
 * @fileoverview Data Status API Service
 *
 * Fetches per-day data coverage counts for each source × area combination,
 * used by the data update status page.
 */

import { createAuthenticatedApi } from './apiClient';

export interface CoverageRow {
    source_key: string;
    source_label: string;
    category: string;
    area: string;       // area name (e.g. 'tokyo') or 'system' for system-wide sources
    date: string;       // YYYY-MM-DD
    doc_count: number;
}

export interface CoverageResponse {
    checked_at: string;
    start_date: string;
    end_date: string;
    rows: CoverageRow[];
}

/**
 * @param startDate YYYYMMDD format
 * @param endDate   YYYYMMDD format
 */
export const fetchDataCoverage = async (startDate: string, endDate: string): Promise<CoverageResponse> => {
    const api = createAuthenticatedApi();
    const res = await api.get<CoverageResponse>('/data-status/coverage', {
        params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
};

// ─── Available sources (dynamic list of prediction models & TDGC categories) ──

export interface DynamicSourceConfig {
    key: string;                // e.g. "prediction_mersol", "tdgc_1000"
    label: string;              // e.g. "Mersol", "一次調整力"
    labelKey?: string;          // i18n key, e.g. "sources.tdgc_1000"
    category: string;           // e.g. "價格預測", "調整市場"
    categoryKey?: string;       // i18n key, e.g. "categories.adjustmentMarket"
    interval: 'hour' | '30m' | 'day';
    validation_type: 'fixed' | 'variable' | 'event';
    expected_per_day: number | null;
}

export interface CoverageSourcesResponse {
    prediction_sources: DynamicSourceConfig[];
    tdgc_categories: DynamicSourceConfig[];
}

/**
 * Fetch currently available prediction model names and TDGC commodity categories from ES.
 * Use to build dynamic source selectors without hardcoding these lists.
 */
export const fetchCoverageSources = async (): Promise<CoverageSourcesResponse> => {
    const api = createAuthenticatedApi();
    const res = await api.get<CoverageSourcesResponse>('/data-status/sources');
    return res.data;
};

// ─── Preview (actual values for chart rendering) ──────────────────────────────

export interface PreviewSeries {
    name: string;
    field?: string;     // backend field name for i18n lookup
    unit: string;
    type: 'line' | 'bar';
    color: string;
    data: [number, number][];   // [unix_ms, value]
}

export interface PreviewGroup {
    id: string;
    label: string;
    stacked?: boolean;      // if true, bar series are rendered as stacked bars
    series: PreviewSeries[];
}

export interface PreviewEvent {
    datetime: string;
    area: string;
    description: string;
    value: number | null;
}

export interface PreviewResponse {
    source_key: string;
    area: string;
    date: string;
    groups?: PreviewGroup[];        // time-series sources
    events?: PreviewEvent[];        // event-based sources (occto_event)
    calculate_time?: string;        // prediction sources only — the run auto-selected for preview
    hit_count?: number;             // raw ES hit count; 0 = no docs found, >0 = docs found but values may be null
}

export const fetchCoveragePreview = async (
    sourceKey: string,
    area: string,
    date: string,
): Promise<PreviewResponse> => {
    const api = createAuthenticatedApi();
    const res = await api.get<PreviewResponse>('/data-status/preview', {
        params: { source_key: sourceKey, area, date },
    });
    return res.data;
};

// ─── Detail (per-slot breakdown for a single cell) ────────────────────────────

export interface DetailHourRow {
    slot: number;       // 0–23 for hourly, 0–47 for 30m
    label: string;      // "05:00" (hourly) or "05:30" (30m)
    doc_count: number;
}

export interface DetailResponse {
    source_key: string;
    area: string;
    date: string;           // YYYYMMDD (echoed from request)
    interval: 'hour' | '30m' | 'day';
    rows: DetailHourRow[];
}

/**
 * Fetch per-hour breakdown for one source × area × date cell.
 * @param date YYYYMMDD format
 */
export const fetchCoverageDetail = async (
    sourceKey: string,
    area: string,
    date: string,
): Promise<DetailResponse> => {
    const api = createAuthenticatedApi();
    const res = await api.get<DetailResponse>('/data-status/detail', {
        params: { source_key: sourceKey, area, date },
    });
    return res.data;
};

// ─── Records (individual ES documents for a cell) ─────────────────────────────

export interface RecordRow {
    slot_index: number;
    slot_label: string;         // "05:00", "05:30", "全日"
    timestamp: string;          // raw datetime value from ES
    fields: Record<string, unknown>;
}

export interface RecordsResponse {
    source_key: string;
    area: string;
    date: string;
    slot: number | null;
    page: number;
    size: number;
    total: number;
    interval: 'hour' | '30m' | 'day';
    rows: RecordRow[];
}

/**
 * Fetch paginated individual ES documents for one source × area × date cell.
 * @param date YYYYMMDD format
 * @param slot 0-based slot index; undefined = all slots
 * @param calculateTime YYYY-MM-DD; for prediction sources, filter to one calculation run
 */
export const fetchCoverageRecords = async (
    sourceKey: string,
    area: string,
    date: string,
    slot?: number,
    calculateTime?: string,
    page = 0,
    size = 20,
): Promise<RecordsResponse> => {
    const api = createAuthenticatedApi();
    const params: Record<string, unknown> = { source_key: sourceKey, area, date, page, size };
    if (slot !== undefined)          params.slot = slot;
    if (calculateTime !== undefined) params.calculate_time = calculateTime;
    const res = await api.get<RecordsResponse>('/data-status/records', { params });
    return res.data;
};

/**
 * Fetch distinct calculate_time values for a prediction source × area × date.
 * Returns dates sorted descending (most recent first).
 * @param date YYYYMMDD format
 */
export const fetchPredictionCalculateTimes = async (
    sourceKey: string,
    area: string,
    date: string,
): Promise<string[]> => {
    const api = createAuthenticatedApi();
    const res = await api.get<{ calculate_times: string[] }>('/data-status/calculate-times', {
        params: { source_key: sourceKey, area, date },
    });
    return res.data.calculate_times;
};
