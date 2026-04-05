/**
 * 疊圖比較頁 | Daily Comparison Overlay
 *
 * Overlays the same metric across every day in the global date range on a single chart.
 * X-axis: コマ 1–48 (30-min slots, 00:00–23:30)
 * Y-axis: unit depends on the selected metric
 * Supports multiple areas simultaneously (small multiples grid layout).
 */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Alert, Chip, Typography } from '@mui/material';
import { format } from 'date-fns';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { DashboardToolbar } from '@/components/navigation/DashboardToolbar';
import { fetchActualPrices } from '@/services/marketApi';
import { fetchImbalance, fetchOcctoArea, fetchIntraday, fetchJepxSystem } from '@/services/gridOperationsApi';
import { DailyCompareControls, MetricKey, MetricConfig, METRIC_CONFIGS } from '@/components/daily-compare/DailyCompareControls';
import { DailyCompareGrid } from '@/components/daily-compare/DailyCompareGrid';

// ─── Fetch registry ─────────────────────────────────────────────────────────

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
    spot_price:         { source: 'actualPrices', getDate: r => r.trade_date,                   getSlot: r => r.time_code - 1,          getValue: r => r.price ?? null },
    system_price:       { source: 'actualPrices', getDate: r => r.trade_date,                   getSlot: r => r.time_code - 1,          getValue: r => r.system_price ?? null },
    imbalance_surplus:  { source: 'imbalance',    getDate: datetimeToDate,                      getSlot: datetimeToSlot,                getValue: r => r.imbalance_surplus_rate ?? null },
    imbalance_deficit:  { source: 'imbalance',    getDate: datetimeToDate,                      getSlot: datetimeToSlot,                getValue: r => r.imbalance_deficit_rate ?? null },
    imbalance_quantity: { source: 'imbalance',    getDate: datetimeToDate,                      getSlot: datetimeToSlot,                getValue: r => r.imbalance_quantity ?? null },
    intraday_avg:       { source: 'intraday',     getDate: r => (r.date ?? '').substring(0, 10), getSlot: r => r.time_code - 1,        getValue: r => r.average_price ?? null },
    intraday_volume:    { source: 'intraday',     getDate: r => (r.date ?? '').substring(0, 10), getSlot: r => r.time_code - 1,        getValue: r => r.total_contracted_volume ?? null },
    solar:              { source: 'occtoArea',    getDate: datetimeToDate,                      getSlot: datetimeToSlot,                getValue: r => r.solar_power_generation_actual ?? null },
    solar_curtail:      { source: 'occtoArea',    getDate: datetimeToDate,                      getSlot: datetimeToSlot,                getValue: r => r.solar_power_output_control ?? null },
    wind:               { source: 'occtoArea',    getDate: datetimeToDate,                      getSlot: datetimeToSlot,                getValue: r => r.wind_power_generation_actual ?? null },
    wind_curtail:       { source: 'occtoArea',    getDate: datetimeToDate,                      getSlot: datetimeToSlot,                getValue: r => r.wind_power_output_control ?? null },
    thermal:            { source: 'occtoArea',    getDate: datetimeToDate,                      getSlot: datetimeToSlot,                getValue: r => r.thermal ?? null },
    nuclear:            { source: 'occtoArea',    getDate: datetimeToDate,                      getSlot: datetimeToSlot,                getValue: r => r.nuclear_power ?? null },
    hydro:              { source: 'occtoArea',    getDate: datetimeToDate,                      getSlot: datetimeToSlot,                getValue: r => r.hydropower ?? null },
    area_demand:        { source: 'occtoArea',    getDate: datetimeToDate,                      getSlot: datetimeToSlot,                getValue: r => r.area_demand ?? null },
    jepx_sell_qty:      { source: 'jepxSystem',   getDate: r => r.trade_date,                   getSlot: r => r.time_code - 1,          getValue: r => r.sell_quantity ?? null },
    jepx_contract_qty:  { source: 'jepxSystem',   getDate: r => r.trade_date,                   getSlot: r => r.time_code - 1,          getValue: r => r.contract_quantity ?? null },
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

// ─── Page ────────────────────────────────────────────────────────────────────

const ECHARTS_GROUP_ID = 'daily-compare-crosshair';

export default function DailyComparePage() {
    const {
        areas,
        selectedArea: ctxArea,
        startDate,
        endDate,
        dateRangePreset,
        commitDateSelection,
        handleDateRangePreset,
        isLoading: ctxLoading,
    } = useMarketDataContext();

    // Local state — multiple areas
    const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>('spot_price');

    // Sync first area from context on mount
    const didSyncArea = useRef(false);
    useEffect(() => {
        if (!didSyncArea.current && ctxArea) {
            setSelectedAreas([ctxArea]);
            didSyncArea.current = true;
        }
    }, [ctxArea]);

    // Data state: areaName → (date → 48-slot values)
    const [rawDataMap, setRawDataMap] = useState<Map<string, Map<string, (number | null)[]>>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentMetricConfig = useMemo<MetricConfig>(
        () => METRIC_CONFIGS.find(m => m.key === selectedMetric)!,
        [selectedMetric],
    );

    // Fetch all selected areas in parallel whenever inputs change
    useEffect(() => {
        if (selectedAreas.length === 0 || !startDate || !endDate) {
            setRawDataMap(new Map());
            return;
        }

        const ctrl = new AbortController();
        setIsLoading(true);
        setError(null);

        const startStr = format(startDate, 'yyyyMMdd');
        const endStr = format(endDate, 'yyyyMMdd');

        Promise.all(
            selectedAreas.map(area =>
                fetchDailyCompareData(selectedMetric, area, startStr, endStr)
                    .then(data => [area, data] as const)
            )
        )
            .then((results) => {
                if (!ctrl.signal.aborted) setRawDataMap(new Map(results));
            })
            .catch(() => {
                if (!ctrl.signal.aborted) {
                    setError('データの取得に失敗しました。しばらくしてからもう一度お試しください。');
                    setRawDataMap(new Map());
                }
            })
            .finally(() => {
                if (!ctrl.signal.aborted) setIsLoading(false);
            });

        return () => ctrl.abort();
    }, [selectedAreas, selectedMetric, startDate, endDate]);

    const handleRefresh = () => {
        setRawDataMap(new Map());
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative', gap: 0.5, p: 0.5 }}>
            <Box sx={{ flexShrink: 0 }}>
                <DashboardToolbar
                    startDate={startDate}
                    endDate={endDate}
                    dateRangePreset={dateRangePreset}
                    onDateChange={commitDateSelection}
                    onDateRangePreset={handleDateRangePreset}
                    onRefresh={handleRefresh}
                    isLoading={isLoading || ctxLoading}
                />
            </Box>

            <DailyCompareControls
                areas={areas}
                selectedAreas={selectedAreas}
                onAreasChange={setSelectedAreas}
                selectedMetric={selectedMetric}
                onMetricChange={setSelectedMetric}
            />

            {/* Context strip + chart grid */}
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {selectedAreas.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 3, height: 16, backgroundColor: currentMetricConfig.baseColor, borderRadius: 1, flexShrink: 0 }} />
                            <Typography variant="subtitle2" fontWeight={700}>{currentMetricConfig.label}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{currentMetricConfig.unit}</Typography>
                            <Chip
                                size="small"
                                label={{ line: '折線', step: '梯線', bar: '長條' }[currentMetricConfig.chartType] ?? currentMetricConfig.chartType}
                                sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    backgroundColor: `${currentMetricConfig.baseColor}20`,
                                    color: currentMetricConfig.baseColor,
                                    border: `1px solid ${currentMetricConfig.baseColor}40`,
                                }}
                            />
                        </Box>
                        {startDate && endDate && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', flexShrink: 0 }}>
                                {format(startDate, 'MM/dd')} – {format(endDate, 'MM/dd')}
                            </Typography>
                        )}
                    </Box>
                )}
                {error ? (
                    <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>
                ) : (
                    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                        <DailyCompareGrid
                            selectedAreas={selectedAreas}
                            areas={areas}
                            rawDataMap={rawDataMap}
                            metric={currentMetricConfig}
                            isLoading={isLoading}
                            groupId={ECHARTS_GROUP_ID}
                        />
                    </Box>
                )}
            </Box>
        </Box>
    );
}
