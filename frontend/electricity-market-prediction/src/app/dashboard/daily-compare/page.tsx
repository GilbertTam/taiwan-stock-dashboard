/**
 * 疊圖比較頁 | Daily Comparison Overlay
 *
 * Overlays the same metric across every day in the global date range on a single chart.
 * X-axis: コマ 1–48 (30-min slots, 00:00–23:30)
 * Y-axis: unit depends on the selected metric
 * Color: most recent day = brightest; older days progressively more transparent
 *
 * Date range is shared with the global toolbar (same as all other pages).
 */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Alert } from '@mui/material';
import { format } from 'date-fns';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { DashboardToolbar } from '@/components/navigation/DashboardToolbar';
import { ResizableLayout } from '@/components/layout/ResizableLayout';
import { useBufferedDateRange } from '@/hooks/useBufferedDateRange';
import { fetchActualPrices } from '@/services/marketApi';
import { fetchImbalance, fetchOcctoArea, fetchIntraday, fetchJepxSystem } from '@/services/gridOperationsApi';
import { DailyCompareControls, MetricKey, MetricConfig, METRIC_CONFIGS } from '@/components/daily-compare/DailyCompareControls';
import { DailyOverlayChart } from '@/components/daily-compare/DailyOverlayChart';

// ─── Fetch registry ────────────────────────────────────────────────────────────

function datetimeToDate(row: { datetime: string }): string {
    const dt = new Date(row.datetime);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function datetimeToSlot(row: { datetime: string }): number {
    const dt = new Date(row.datetime);
    return (dt.getHours() * 60 + dt.getMinutes()) / 30;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FETCHERS = {
    actualPrices: (area: string, s: string, e: string) =>
        fetchActualPrices({ name: area, start_date: s, end_date: e }),
    imbalance: (area: string, s: string, e: string) =>
        fetchImbalance({ area_name: area, start_date: s, end_date: e }),
    intraday: (area: string, s: string, e: string) =>
        fetchIntraday({ area_name: area, start_date: s, end_date: e }),
    occtoArea: (area: string, s: string, e: string) =>
        fetchOcctoArea({ area_name: area, start_date: s, end_date: e }),
    jepxSystem: (_area: string, s: string, e: string) =>
        fetchJepxSystem({ start_date: s, end_date: e }),
} as const;

type FetcherKey = keyof typeof FETCHERS;

interface MetricMapping {
    source: FetcherKey;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getDate: (r: any) => string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSlot: (r: any) => number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getValue: (r: any) => number | null;
}

const METRIC_MAP: Record<MetricKey, MetricMapping> = {
    spot_price:         { source: 'actualPrices', getDate: r => r.trade_date,              getSlot: r => r.time_code - 1,                getValue: r => r.price ?? null },
    system_price:       { source: 'actualPrices', getDate: r => r.trade_date,              getSlot: r => r.time_code - 1,                getValue: r => r.system_price ?? null },
    imbalance_surplus:  { source: 'imbalance',    getDate: datetimeToDate,                 getSlot: datetimeToSlot,                      getValue: r => r.imbalance_surplus_rate ?? null },
    imbalance_deficit:  { source: 'imbalance',    getDate: datetimeToDate,                 getSlot: datetimeToSlot,                      getValue: r => r.imbalance_deficit_rate ?? null },
    imbalance_quantity: { source: 'imbalance',    getDate: datetimeToDate,                 getSlot: datetimeToSlot,                      getValue: r => r.imbalance_quantity ?? null },
    intraday_avg:       { source: 'intraday',     getDate: r => (r.date ?? '').substring(0, 10), getSlot: r => r.time_code - 1,         getValue: r => r.average_price ?? null },
    intraday_volume:    { source: 'intraday',     getDate: r => (r.date ?? '').substring(0, 10), getSlot: r => r.time_code - 1,         getValue: r => r.total_contracted_volume ?? null },
    solar:              { source: 'occtoArea',    getDate: datetimeToDate,                 getSlot: datetimeToSlot,                      getValue: r => r.solar_power_generation_actual ?? null },
    solar_curtail:      { source: 'occtoArea',    getDate: datetimeToDate,                 getSlot: datetimeToSlot,                      getValue: r => r.solar_power_output_control ?? null },
    wind:               { source: 'occtoArea',    getDate: datetimeToDate,                 getSlot: datetimeToSlot,                      getValue: r => r.wind_power_generation_actual ?? null },
    wind_curtail:       { source: 'occtoArea',    getDate: datetimeToDate,                 getSlot: datetimeToSlot,                      getValue: r => r.wind_power_output_control ?? null },
    thermal:            { source: 'occtoArea',    getDate: datetimeToDate,                 getSlot: datetimeToSlot,                      getValue: r => r.thermal ?? null },
    nuclear:            { source: 'occtoArea',    getDate: datetimeToDate,                 getSlot: datetimeToSlot,                      getValue: r => r.nuclear_power ?? null },
    hydro:              { source: 'occtoArea',    getDate: datetimeToDate,                 getSlot: datetimeToSlot,                      getValue: r => r.hydropower ?? null },
    area_demand:        { source: 'occtoArea',    getDate: datetimeToDate,                 getSlot: datetimeToSlot,                      getValue: r => r.area_demand ?? null },
    jepx_sell_qty:      { source: 'jepxSystem',   getDate: r => r.trade_date,              getSlot: r => r.time_code - 1,                getValue: r => r.sell_quantity ?? null },
    jepx_contract_qty:  { source: 'jepxSystem',   getDate: r => r.trade_date,              getSlot: r => r.time_code - 1,                getValue: r => r.contract_quantity ?? null },
};

async function fetchDailyCompareData(
    metric: MetricKey,
    area: string,
    startDate: string,
    endDate: string,
): Promise<Map<string, (number | null)[]>> {
    const cfg = METRIC_MAP[metric];
    const rows = await FETCHERS[cfg.source](area, startDate, endDate);
    const map = new Map<string, (number | null)[]>();

    for (const row of rows) {
        const date = cfg.getDate(row);
        const slot = cfg.getSlot(row);
        if (!date || slot < 0 || slot >= 48) continue;
        if (!map.has(date)) map.set(date, new Array(48).fill(null));
        map.get(date)![slot] = cfg.getValue(row);
    }

    return map;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DailyComparePage() {
    const {
        areas,
        selectedArea: ctxArea,
        startDate,
        endDate,
        dateRangePreset,
        setStartDate,
        setEndDate,
        handleDateRangePreset,
        isLoading: ctxLoading,
    } = useMarketDataContext();

    // Buffered date range — same pattern as all other pages
    const { tempStartDate, tempEndDate, onDateRangeChange, onDateMenuClose } = useBufferedDateRange({
        startDate,
        endDate,
        setStartDate,
        setEndDate,
        clearPreset: () => handleDateRangePreset(null),
    });

    // Local state — managed independently from the global context
    const [selectedArea, setSelectedArea] = useState<string>('');
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>('spot_price');

    // Sync area from context once on mount
    const didSyncArea = useRef(false);
    useEffect(() => {
        if (!didSyncArea.current && ctxArea) {
            setSelectedArea(ctxArea);
            didSyncArea.current = true;
        }
    }, [ctxArea]);

    // Data state
    const [rawData, setRawData] = useState<Map<string, (number | null)[]>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sorted newest-first
    const sortedDates = useMemo(
        () => [...rawData.keys()].sort((a, b) => b.localeCompare(a)),
        [rawData],
    );

    // Full MetricConfig for the selected metric
    const currentMetricConfig = useMemo<MetricConfig>(
        () => METRIC_CONFIGS.find(m => m.key === selectedMetric)!,
        [selectedMetric],
    );

    // Fetch whenever inputs change
    useEffect(() => {
        if (!selectedArea || !startDate || !endDate) return;

        const ctrl = new AbortController();
        setIsLoading(true);
        setError(null);

        const startStr = format(startDate, 'yyyyMMdd');
        const endStr = format(endDate, 'yyyyMMdd');

        fetchDailyCompareData(selectedMetric, selectedArea, startStr, endStr)
            .then((data) => {
                if (!ctrl.signal.aborted) setRawData(data);
            })
            .catch(() => {
                if (!ctrl.signal.aborted) {
                    setError('データの取得に失敗しました。しばらくしてからもう一度お試しください。');
                    setRawData(new Map());
                }
            })
            .finally(() => {
                if (!ctrl.signal.aborted) setIsLoading(false);
            });

        return () => ctrl.abort();
    }, [selectedArea, selectedMetric, startDate, endDate]);

    const handleRefresh = () => {
        if (!selectedArea || !startDate || !endDate) return;
        setRawData(new Map());
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative' }}>
            {/* Toolbar — shared with all other pages */}
            <Box sx={{ flexShrink: 0, p: 0.5 }}>
                <DashboardToolbar
                    startDate={tempStartDate}
                    endDate={tempEndDate}
                    dateRangePreset={dateRangePreset}
                    onDateRangeChange={onDateRangeChange}
                    onDateRangePreset={handleDateRangePreset}
                    onDateMenuClose={onDateMenuClose}
                    onRefresh={handleRefresh}
                    isLoading={isLoading || ctxLoading}
                />
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex' }}>
                <ResizableLayout
                    direction="horizontal"
                    defaultSizes={[22, 78]}
                    minSizes={[16, 50]}
                    storageKey="daily-compare-layout"
                >
                    {/* Left: controls */}
                    <Box sx={{ height: '100%', overflow: 'hidden', borderRight: '1px solid var(--card-border)', backgroundColor: 'var(--card-bg)' }}>
                        <DailyCompareControls
                            areas={areas}
                            selectedArea={selectedArea}
                            onAreaChange={setSelectedArea}
                            selectedMetric={selectedMetric}
                            onMetricChange={setSelectedMetric}
                        />
                    </Box>

                    {/* Right: chart */}
                    <Box sx={{ height: '100%', p: 1.5, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {error ? (
                            <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>
                        ) : (
                            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                <DailyOverlayChart
                                    seriesData={rawData}
                                    sortedDates={sortedDates}
                                    metric={currentMetricConfig}
                                    isLoading={isLoading}
                                />
                            </Box>
                        )}
                    </Box>
                </ResizableLayout>
            </Box>
        </Box>
    );
}
