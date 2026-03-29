/**
 * 資料更新狀態頁 | Data Update Status
 *
 * Displays a Gantt heatmap showing per-day data coverage for each
 * data source × area combination.
 *
 * Date range is controlled by the shared toolbar (same as all other pages).
 * X-axis: dates in the selected range
 * Y-axis: data source + area rows
 * Color: green = has data, orange = partial, red = missing, gray = N/A
 */
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Alert, Button, Divider } from '@mui/material';
import { format } from 'date-fns';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { DashboardToolbar } from '@/components/navigation/DashboardToolbar';
import { ResizableLayout } from '@/components/layout/ResizableLayout';
import { useBufferedDateRange } from '@/hooks/useBufferedDateRange';
import { fetchDataCoverage, fetchCoverageSources, CoverageRow } from '@/services/dataStatusApi';
import {
    DataStatusControls,
    SourceConfig,
    STATIC_SOURCE_CONFIGS,
    AREA_ORDER,
    AREA_JP,
} from '@/components/data-status/DataStatusControls';
import { DataStatusKPI } from '@/components/data-status/DataStatusKPI';
import { DataStatusGantt } from '@/components/data-status/DataStatusGantt';
import { SelectedCell } from '@/components/data-status/DataStatusDetailDrawer';
import { DataStatusUnifiedDrawer } from '@/components/data-status/DataStatusUnifiedDrawer';

export default function DataStatusPage() {
    const {
        startDate,
        endDate,
        dateRangePreset,
        setStartDate,
        setEndDate,
        handleDateRangePreset,
        isLoading: ctxLoading,
    } = useMarketDataContext();

    const { tempStartDate, tempEndDate, onDateRangeChange, onDateMenuClose } = useBufferedDateRange({
        startDate,
        endDate,
        setStartDate,
        setEndDate,
        clearPreset: () => handleDateRangePreset(null),
    });

    // ── Dynamic sources (prediction models + TDGC categories) ────────────────
    const [dynamicSources, setDynamicSources] = useState<SourceConfig[]>([]);

    useEffect(() => {
        fetchCoverageSources()
            .then(r => {
                setDynamicSources([
                    ...r.tdgc_categories.map(s => ({ ...s, isSystem: false as const })),
                    ...r.prediction_sources.map(s => ({ ...s, isSystem: false as const })),
                ]);
            })
            .catch(() => { /* keep empty — static sources still work */ });
    }, []);

    // Merged source list: static (market/weather) + dynamic (prediction/TDGC)
    const allSourceConfigs = useMemo<SourceConfig[]>(
        () => [...STATIC_SOURCE_CONFIGS, ...dynamicSources],
        [dynamicSources],
    );
    const allSourceKeys = useMemo(() => allSourceConfigs.map(s => s.key), [allSourceConfigs]);

    // ── Filter state ─────────────────────────────────────────────────────────
    const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set(STATIC_SOURCE_CONFIGS.map(s => s.key)));
    const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set(AREA_ORDER));

    // Auto-select newly loaded dynamic sources
    useEffect(() => {
        if (dynamicSources.length === 0) return;
        setSelectedSources(new Set(allSourceKeys));
    }, [allSourceKeys, dynamicSources.length]);

    // ── Area toggle helpers ──────────────────────────────────────────────────
    const toggleArea = useCallback((area: string) => {
        setSelectedAreas(prev => {
            const next = new Set(prev);
            next.has(area) ? next.delete(area) : next.add(area);
            return next;
        });
    }, []);

    const toggleAllAreas = useCallback(() => {
        setSelectedAreas(prev =>
            prev.size === AREA_ORDER.length ? new Set() : new Set(AREA_ORDER),
        );
    }, []);

    const allAreasSelected = selectedAreas.size === AREA_ORDER.length;
    const someAreasSelected = selectedAreas.size > 0 && !allAreasSelected;

    // ── Detail drawer state ──────────────────────────────────────────────────
    const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

    const handleCellClick = useCallback((
        sourceKey: string,
        area: string,
        date: string,
        docCount: number,
        sourceLabel: string,
    ) => {
        setSelectedCell({ sourceKey, sourceLabel, area, date, docCount });
    }, []);

    // ── Data fetch ───────────────────────────────────────────────────────────
    const [rows, setRows] = useState<CoverageRow[]>([]);
    const [checkedAt, setCheckedAt] = useState<string | null>(null);
    const [fetchedStart, setFetchedStart] = useState('');
    const [fetchedEnd, setFetchedEnd] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!startDate || !endDate) return;
        const startStr = format(startDate, 'yyyyMMdd');
        const endStr = format(endDate, 'yyyyMMdd');

        setIsLoading(true);
        setError(null);
        setSelectedCell(null);
        try {
            const result = await fetchDataCoverage(startStr, endStr);
            setRows(result.rows);
            setCheckedAt(result.checked_at);
            setFetchedStart(result.start_date);
            setFetchedEnd(result.end_date);
        } catch {
            setError('資料載入失敗，請稍後再試。');
            setRows([]);
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ── Available dates for drawer day navigation ────────────────────────────
    const availableDates = useMemo(
        () => [...new Set(rows.map(r => r.date))].sort(),
        [rows],
    );

    // ── Area filter button sx helper ─────────────────────────────────────────
    const areaButtonSx = (active: boolean) => ({
        height: 26,
        px: 1.25,
        fontSize: '0.72rem',
        minWidth: 0,
        fontWeight: active ? 600 : 400,
        borderColor: active ? 'var(--primary)' : 'var(--card-border)',
        ...(active && { color: 'var(--primary-foreground)' }),
    });

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative' }}>
            {/* Shared toolbar */}
            <Box sx={{ flexShrink: 0, p: 0.5 }}>
                <DashboardToolbar
                    startDate={tempStartDate}
                    endDate={tempEndDate}
                    dateRangePreset={dateRangePreset}
                    onDateRangeChange={onDateRangeChange}
                    onDateRangePreset={handleDateRangePreset}
                    onDateMenuClose={onDateMenuClose}
                    onRefresh={loadData}
                    isLoading={isLoading || ctxLoading}
                />
            </Box>

            {/* KPI summary */}
            <Box sx={{ flexShrink: 0, px: 1.5, pt: 1 }}>
                <DataStatusKPI
                    rows={rows}
                    startDate={fetchedStart}
                    endDate={fetchedEnd}
                    checkedAt={checkedAt}
                />
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex' }}>
                <ResizableLayout
                    direction="horizontal"
                    defaultSizes={[20, 80]}
                    minSizes={[14, 50]}
                    storageKey="data-status-layout"
                >
                    {/* Left: source controls */}
                    <Box sx={{ height: '100%', overflow: 'hidden', borderRight: '1px solid var(--card-border)', backgroundColor: 'var(--card-bg)' }}>
                        <DataStatusControls
                            sourceConfigs={allSourceConfigs}
                            selectedSources={selectedSources}
                            onSourcesChange={setSelectedSources}
                            isLoading={isLoading}
                            onRefresh={loadData}
                        />
                    </Box>

                    {/* Right: area filter + gantt */}
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Area filter button strip */}
                        <Box sx={{
                            flexShrink: 0,
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1.5,
                            pt: 1,
                            pb: 0.75,
                            borderBottom: '1px solid var(--card-border)',
                        }}>
                            <Button
                                size="small"
                                variant={allAreasSelected ? 'contained' : someAreasSelected ? 'outlined' : 'outlined'}
                                onClick={toggleAllAreas}
                                sx={areaButtonSx(allAreasSelected)}
                            >
                                全選
                            </Button>

                            <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.25 }} />

                            {AREA_ORDER.map(area => {
                                const active = selectedAreas.has(area);
                                return (
                                    <Button
                                        key={area}
                                        size="small"
                                        variant={active ? 'contained' : 'outlined'}
                                        onClick={() => toggleArea(area)}
                                        sx={areaButtonSx(active)}
                                    >
                                        {AREA_JP[area]}
                                    </Button>
                                );
                            })}
                        </Box>

                        {/* Gantt chart */}
                        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', p: 1.5 }}>
                            {error ? (
                                <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>
                            ) : (
                                <DataStatusGantt
                                    rows={rows}
                                    isLoading={isLoading}
                                    sourceConfigs={allSourceConfigs}
                                    selectedSources={selectedSources}
                                    selectedAreas={selectedAreas}
                                    onCellClick={handleCellClick}
                                />
                            )}
                        </Box>
                    </Box>
                </ResizableLayout>
            </Box>

            <DataStatusUnifiedDrawer
                selectedCell={selectedCell}
                availableDates={availableDates}
                onClose={() => setSelectedCell(null)}
                onNavigate={setSelectedCell}
            />
        </Box>
    );
}
