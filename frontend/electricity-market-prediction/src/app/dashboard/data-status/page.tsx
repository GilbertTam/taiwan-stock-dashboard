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
import { Box, Alert, Dialog, ToggleButton, ToggleButtonGroup } from '@mui/material';
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
import { DataStatusRawView } from '@/components/data-status/DataStatusRawView';

interface RecordsCell { sourceKey: string; area: string; date: string; slot?: number; }

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
                    ...r.tdgc_categories.map(s => ({
                        ...s,
                        isSystem: false as const,
                        validationType: s.validation_type,
                        expectedPerDay: s.expected_per_day,
                    })),
                    ...r.prediction_sources.map(s => ({
                        ...s,
                        isSystem: false as const,
                        validationType: s.validation_type,
                        expectedPerDay: s.expected_per_day,
                    })),
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
    const [selectedArea,    setSelectedArea]    = useState<string>('tokyo');

    // Auto-select newly loaded dynamic sources
    useEffect(() => {
        if (dynamicSources.length === 0) return;
        setSelectedSources(new Set(allSourceKeys));
    }, [allSourceKeys, dynamicSources.length]);

    // ── Records fullscreen dialog state ─────────────────────────────────────
    const [recordsCell, setRecordsCell] = useState<RecordsCell | null>(null);

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
                        />
                    </Box>

                    {/* Right: area filter + gantt */}
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Area single-select tab strip */}
                        <Box sx={{
                            flexShrink: 0,
                            px: 1.5, pt: 0.75, pb: 0.5,
                            borderBottom: '1px solid var(--card-border)',
                        }}>
                            <ToggleButtonGroup
                                exclusive
                                value={selectedArea}
                                onChange={(_, v) => { if (v) setSelectedArea(v); }}
                                size="small"
                                sx={{
                                    flexWrap: 'wrap',
                                    gap: 0.4,
                                    '& .MuiToggleButtonGroup-grouped': {
                                        border: '1px solid var(--card-border) !important',
                                        borderRadius: '6px !important',
                                        mx: 0,
                                    },
                                }}
                            >
                                {AREA_ORDER.map(area => (
                                    <ToggleButton
                                        key={area}
                                        value={area}
                                        sx={{
                                            height: 26, px: 1.25,
                                            fontSize: '0.72rem',
                                            fontWeight: selectedArea === area ? 600 : 400,
                                            color: selectedArea === area ? 'var(--primary)' : 'text.secondary',
                                            '&.Mui-selected': {
                                                backgroundColor: 'rgba(var(--primary-rgb, 99,102,241), 0.1)',
                                                color: 'var(--primary)',
                                            },
                                            '&.Mui-selected:hover': {
                                                backgroundColor: 'rgba(var(--primary-rgb, 99,102,241), 0.15)',
                                            },
                                        }}
                                    >
                                        {AREA_JP[area]}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
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
                                    selectedAreas={new Set([selectedArea])}
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
                onOpenRecords={setRecordsCell}
            />

            {/* ── Full-screen raw records dialog ── */}
            <Dialog
                fullScreen
                open={!!recordsCell}
                onClose={() => setRecordsCell(null)}
            >
                {recordsCell && (
                    <DataStatusRawView
                        sourceKey={recordsCell.sourceKey}
                        area={recordsCell.area}
                        date={recordsCell.date}
                        slot={recordsCell.slot}
                        onClose={() => setRecordsCell(null)}
                    />
                )}
            </Dialog>
        </Box>
    );
}
