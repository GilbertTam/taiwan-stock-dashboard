'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
    fetchWeatherActual,
    fetchWeatherForecast,
    fetchWeatherActualDaily,
    fetchWeatherForecastDaily,
} from '@/services/weatherApi';
import type { WeatherHourlyData, WeatherDailyData } from '@/types';

export const GRID_AREA_CODES = [
    'hokkaido', 'tohoku', 'tokyo', 'chubu', 'hokuriku',
    'kansai', 'chugoku', 'shikoku', 'kyushu',
] as const;

export type GridAreaCode = typeof GRID_AREA_CODES[number];
export type WeatherDataset = 'hourly' | 'daily';

/** A point on a per-area weather-field timeline. `value` may be null when ES has no value. */
export interface WeatherPoint {
    /** JST datetime string from ES (no timezone suffix) */
    datetime: string;
    /** Epoch ms (treating the JST string as JST wall time) */
    timestampMs: number;
    /** Numeric value for the selected field, or null */
    value: number | null;
}

export interface UseWeatherFieldByAreaParams {
    /** Inclusive start date */
    startDate: Date | null;
    /** Inclusive end date */
    endDate: Date | null;
    /** Granularity: hourly (1h) vs daily (24h aggregate) */
    dataset: WeatherDataset;
    /** Field name on WeatherHourlyData or WeatherDailyData (e.g. 'cloud_cover', 'temperature_2m', 'precipitation_sum') */
    field: string;
    /** Optional explicit model filters; falls back to "any model" when null */
    modelActual?: string | null;
    modelForecast?: string | null;
}

export interface UseWeatherFieldByAreaReturn {
    /** Merged actual + forecast series per area, sorted by timestamp ascending */
    seriesByArea: Record<GridAreaCode, WeatherPoint[]>;
    /** Union of timestamps across all areas (ms, unique, sorted) */
    timeline: number[];
    /** Area codes that completely failed to fetch (both actual+forecast empty) */
    failedAreas: GridAreaCode[];
    /** True only after every region's Promise has settled for the current session */
    isReady: boolean;
    /** True while a fetch is in-flight */
    isFetching: boolean;
    /** First top-level error message, if any */
    error: string | null;
}

const EMPTY_SERIES: Record<GridAreaCode, WeatherPoint[]> = GRID_AREA_CODES.reduce(
    (acc, code) => { acc[code] = []; return acc; },
    {} as Record<GridAreaCode, WeatherPoint[]>,
);

/** Parse "YYYY-MM-DD HH:mm:ss" / "YYYY-MM-DDTHH:mm:ss" / "YYYY-MM-DD" (assumed JST) → epoch ms. */
function parseJstToMs(s: string): number {
    if (!s) return NaN;
    // Date-only string → treat as JST midnight
    const padded = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s;
    const normalized = padded.includes('T') ? padded : padded.replace(' ', 'T');
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized);
    const iso = hasTz ? normalized : `${normalized}+09:00`;
    return Date.parse(iso);
}

type AnyWeatherRow = WeatherHourlyData | WeatherDailyData;

/**
 * Fetch a single weather field for all 9 grid areas (actual + forecast) in a
 * single atomic session. Pattern mirrors `useRevenuePageData`: every input is
 * encoded into a `sessionKey`, and a monotonic fetch ID discards stale
 * responses.
 *
 * Slider scrubbing should NOT change inputs to this hook — consumers look up
 * the selected timestamp in `seriesByArea` in-memory.
 */
export function useWeatherFieldByArea(params: UseWeatherFieldByAreaParams): UseWeatherFieldByAreaReturn {
    const { startDate, endDate, dataset, field, modelActual, modelForecast } = params;

    const [seriesByArea, setSeriesByArea] = useState<Record<GridAreaCode, WeatherPoint[]>>(EMPTY_SERIES);
    const [failedAreas,  setFailedAreas]  = useState<GridAreaCode[]>([]);
    const [isReady,      setIsReady]      = useState(false);
    const [isFetching,   setIsFetching]   = useState(false);
    const [error,        setError]        = useState<string | null>(null);

    const fetchIdRef = useRef(0);

    const sessionKey = useMemo(() => {
        if (!startDate || !endDate || !field) return '';
        const s = format(startDate, 'yyyyMMdd');
        const e = format(endDate,   'yyyyMMdd');
        return `${s}__${e}__${dataset}__${field}__${modelActual ?? ''}__${modelForecast ?? ''}`;
    }, [startDate, endDate, dataset, field, modelActual, modelForecast]);

    useEffect(() => {
        if (!sessionKey) return;

        setIsReady(false);
        setIsFetching(true);
        setError(null);
        setSeriesByArea(EMPTY_SERIES);
        setFailedAreas([]);

        const myId = ++fetchIdRef.current;
        const start = format(startDate!, 'yyyyMMdd');
        const end   = format(endDate!,   'yyyyMMdd');

        const fetchActual = dataset === 'hourly' ? fetchWeatherActual : fetchWeatherActualDaily;
        const fetchForecast = dataset === 'hourly' ? fetchWeatherForecast : fetchWeatherForecastDaily;

        const run = async () => {
            try {
                const tasks = GRID_AREA_CODES.flatMap((area) => [
                    fetchActual({ start_date: start, end_date: end, area_name: area })
                        .then(
                            (data) => ({ area, kind: 'actual'   as const, data: data as AnyWeatherRow[], failed: false }),
                            ()     => ({ area, kind: 'actual'   as const, data: [] as AnyWeatherRow[],   failed: true  }),
                        ),
                    fetchForecast({ start_date: start, end_date: end, area_name: area })
                        .then(
                            (data) => ({ area, kind: 'forecast' as const, data: data as AnyWeatherRow[], failed: false }),
                            ()     => ({ area, kind: 'forecast' as const, data: [] as AnyWeatherRow[],   failed: true  }),
                        ),
                ]);

                const results = await Promise.all(tasks);
                if (myId !== fetchIdRef.current) return;

                const merged: Record<GridAreaCode, Map<number, WeatherPoint>> =
                    GRID_AREA_CODES.reduce((acc, code) => {
                        acc[code] = new Map<number, WeatherPoint>();
                        return acc;
                    }, {} as Record<GridAreaCode, Map<number, WeatherPoint>>);

                const byAreaStatus: Record<GridAreaCode, { actualOk: boolean; forecastOk: boolean }> =
                    GRID_AREA_CODES.reduce((acc, c) => {
                        acc[c] = { actualOk: false, forecastOk: false };
                        return acc;
                    }, {} as Record<GridAreaCode, { actualOk: boolean; forecastOk: boolean }>);

                for (const r of results) {
                    if (r.failed) continue;
                    if (r.kind === 'actual') byAreaStatus[r.area].actualOk = true;
                    else byAreaStatus[r.area].forecastOk = true;

                    const filterModel = r.kind === 'actual' ? modelActual : modelForecast;
                    const rows = filterModel
                        ? r.data.filter((d) => (d as { model?: string }).model === filterModel)
                        : r.data;

                    const bucket = merged[r.area];
                    for (const row of rows) {
                        const dt = (row as { datetime?: string }).datetime;
                        if (!dt) continue;
                        const ts = parseJstToMs(dt);
                        if (!Number.isFinite(ts)) continue;
                        const existing = bucket.get(ts);
                        // Actual overrides forecast at the same timestamp
                        if (existing && r.kind === 'forecast') continue;
                        const raw = (row as unknown as Record<string, unknown>)[field];
                        const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
                        bucket.set(ts, { datetime: dt, timestampMs: ts, value });
                    }
                }

                const failedSet = new Set<GridAreaCode>();
                for (const c of GRID_AREA_CODES) {
                    if (!byAreaStatus[c].actualOk && !byAreaStatus[c].forecastOk) failedSet.add(c);
                }

                const sortedSeries: Record<GridAreaCode, WeatherPoint[]> = GRID_AREA_CODES.reduce(
                    (acc, code) => {
                        acc[code] = Array.from(merged[code].values()).sort((a, b) => a.timestampMs - b.timestampMs);
                        return acc;
                    },
                    {} as Record<GridAreaCode, WeatherPoint[]>,
                );

                setSeriesByArea(sortedSeries);
                setFailedAreas(Array.from(failedSet));
                setIsReady(true);
                setIsFetching(false);
            } catch (e: unknown) {
                if (myId !== fetchIdRef.current) return;
                setError(e instanceof Error ? e.message : 'Fetch failed');
                setIsFetching(false);
            }
        };

        run();
        // sessionKey encodes all inputs
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionKey]);

    const timeline = useMemo<number[]>(() => {
        const set = new Set<number>();
        for (const code of GRID_AREA_CODES) {
            for (const p of seriesByArea[code]) set.add(p.timestampMs);
        }
        return Array.from(set).sort((a, b) => a - b);
    }, [seriesByArea]);

    return { seriesByArea, timeline, failedAreas, isReady, isFetching, error };
}
