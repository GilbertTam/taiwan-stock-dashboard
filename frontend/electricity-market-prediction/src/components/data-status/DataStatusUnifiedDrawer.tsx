'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Divider,
    Drawer,
    IconButton,
    Skeleton,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import CloseIcon        from '@mui/icons-material/Close';
import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTheme } from '@/app/ThemeProvider';
import {
    fetchCoverageDetail,
    fetchCoveragePreview,
    DetailHourRow,
    PreviewGroup,
    PreviewEvent,
} from '@/services/dataStatusApi';
import {
    fetchWeatherActual,
    fetchWeatherActualDaily,
    fetchWeatherForecast,
    fetchWeatherForecastDaily,
} from '@/services/weatherApi';
import {
    HOURLY_CATEGORIES,
    DAILY_CATEGORIES,
    WEATHER_FIELD_DISPLAY,
    weatherColors,
} from '@/constants/weatherCategories';
import { BaseChart }  from '@/components/charts/BaseChart';
import { AREA_JP }    from './DataStatusControls';
import type { SelectedCell } from './DataStatusDetailDrawer';
import { RecordsTab } from './RecordsTab';
import type { EChartsOption } from 'echarts';

// ─── Weather chart helpers (ported from DataStatusWeatherDetailDrawer) ────────

const SKIP_FIELDS = new Set([
    'sunrise', 'sunset', 'wind_direction_10m', 'wind_direction_100m',
]);
const BAR_FIELDS = new Set([
    'precipitation', 'rain', 'snowfall', 'snow_depth',
    'precipitation_sum', 'rain_sum', 'snowfall_sum',
]);

function getWeatherFieldColor(field: string, isForecast: boolean): string {
    const c = weatherColors;
    if (field.includes('apparent'))       return isForecast ? c.apparentForecast   : c.apparentActual;
    if (field.includes('dew'))            return isForecast ? c.dewForecast        : c.dewActual;
    if (field.includes('temperature') || field.includes('_temp'))
                                          return isForecast ? c.tempForecast       : c.tempActual;
    if (field.includes('humidity'))       return isForecast ? c.humidityForecast   : c.humidityActual;
    if (field.includes('snowfall') || field.includes('snow'))
                                          return isForecast ? c.snowForecast       : c.snowActual;
    if (field.includes('precipitation') || field.includes('rain'))
                                          return isForecast ? c.precipForecast     : c.precipActual;
    if (field.includes('gust'))           return isForecast ? c.gustForecast       : c.gustActual;
    if (field.includes('wind'))           return isForecast ? c.windForecast       : c.windActual;
    if (field.includes('cloud'))          return isForecast ? c.cloudForecast      : c.cloudActual;
    if (field.includes('radiation'))      return isForecast ? c.radiationForecast  : c.radiationActual;
    if (field.includes('sunshine'))       return isForecast ? c.sunshineForecast   : c.sunshineActual;
    if (field.includes('daylight'))       return isForecast ? c.daylightForecast   : c.daylightActual;
    if (field.includes('surface_pressure')) return isForecast ? c.pressureSurfaceForecast : c.pressureSurfaceActual;
    if (field.includes('pressure'))       return isForecast ? c.pressureMslForecast  : c.pressureMslActual;
    if (field.includes('moisture'))       return isForecast ? c.soilMoistForecast  : c.soilMoistActual;
    if (field.includes('soil'))           return isForecast ? c.soilTempForecast   : c.soilTempActual;
    return '#888899';
}

function buildWeatherMiniOption(
    fields: string[],
    data: any[],
    isForecast: boolean,
    isDaily: boolean,
    axisColor: string,
    darkMode: boolean,
): EChartsOption | null {
    const series: any[] = [];
    for (const field of fields) {
        if (SKIP_FIELDS.has(field)) continue;
        const values: [number, number][] = [];
        for (const d of data) {
            const v = d[field];
            if (v === null || v === undefined) continue;
            const ts = new Date(d.datetime).getTime();
            if (!isNaN(ts)) values.push([ts, Number(v)]);
        }
        if (values.length === 0) continue;
        const display = WEATHER_FIELD_DISPLAY[field];
        const label   = display?.shortLabel ?? field;
        const unit    = display?.unit ?? '';
        const color   = getWeatherFieldColor(field, isForecast);
        const isBar   = BAR_FIELDS.has(field);
        series.push({
            name: unit ? `${label} (${unit})` : label,
            type: isBar ? 'bar' : 'line',
            data: values,
            smooth: !isBar,
            itemStyle: { color },
            lineStyle: isBar ? undefined : { type: isForecast ? 'dashed' : 'solid', width: 1.5 },
            barMaxWidth: 6,
            showSymbol: isDaily,
            symbolSize: isDaily ? 5 : 0,
        });
    }
    if (series.length === 0) return null;
    const splitLineColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const axisLineColor  = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
    return {
        animation: false,
        backgroundColor: 'transparent',
        grid: { left: 50, right: 12, top: 6, bottom: 24 },
        xAxis: {
            type: 'time',
            axisLabel: { fontSize: 9, color: axisColor },
            axisLine: { show: true, lineStyle: { color: axisLineColor } },
            axisTick: { show: false },
            splitLine: { show: false },
        },
        yAxis: {
            type: 'value',
            axisLabel: { fontSize: 9, color: axisColor },
            splitLine: { lineStyle: { color: splitLineColor } },
        },
        tooltip: { trigger: 'axis', textStyle: { fontSize: 11 } },
        series,
    };
}

// ─── Market chart builder ─────────────────────────────────────────────────────

function buildMarketMiniOption(
    group: PreviewGroup,
    axisColor: string,
    darkMode: boolean,
): EChartsOption {
    const splitLineColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const axisLineColor  = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
    return {
        animation: false,
        backgroundColor: 'transparent',
        grid: { left: 58, right: 12, top: 6, bottom: 24 },
        xAxis: {
            type: 'time',
            axisLabel: { fontSize: 9, color: axisColor },
            axisLine: { show: true, lineStyle: { color: axisLineColor } },
            axisTick: { show: false },
            splitLine: { show: false },
        },
        yAxis: {
            type: 'value',
            axisLabel: { fontSize: 9, color: axisColor },
            splitLine: { lineStyle: { color: splitLineColor } },
        },
        tooltip: { trigger: 'axis', textStyle: { fontSize: 11 } },
        series: group.series.map(s => ({
            name: s.unit ? `${s.name} (${s.unit})` : s.name,
            type: s.type,
            data: s.data,
            smooth: s.type === 'line',
            itemStyle: { color: s.color },
            lineStyle: s.type === 'line' ? { width: 1.5 } : undefined,
            barMaxWidth: 8,
            showSymbol: false,
            ...(group.stacked && s.type === 'bar' ? { stack: 'total' } : {}),
        })),
    };
}

// ─── Prediction confidence-band chart builder ─────────────────────────────────
// Renders a fan chart: P5–P95 confidence band (stacked area) + P50 main line.
// Falls back to the generic market chart if the P5/P50/P95 trio is not detected.

function buildPredictionMiniOption(
    group: PreviewGroup,
    axisColor: string,
    darkMode: boolean,
): EChartsOption {
    const splitLineColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const axisLineColor  = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';

    const p5  = group.series.find(s => /p5\b/i.test(s.name) && !/p50|p95/i.test(s.name));
    const p50 = group.series.find(s => /p50/i.test(s.name));
    const p95 = group.series.find(s => /p95/i.test(s.name));

    // Fall back to generic chart when the P5/P50/P95 trio is absent
    if (!p5 || !p50 || !p95) return buildMarketMiniOption(group, axisColor, darkMode);

    // Build band-width series: value = P95 - P5 (stacked on invisible P5 base)
    const p5Map = new Map<number, number>(p5.data.map(([t, v]) => [t, v]));
    const bandData: [number, number][] = p95.data.map(([t, v]) => [t, Math.max(0, v - (p5Map.get(t) ?? v))]);

    const bandFill   = darkMode ? 'rgba(255,112,67,0.18)' : 'rgba(255,112,67,0.14)';
    const p50Color   = '#ff7043';
    const boundColor = darkMode ? 'rgba(144,164,174,0.6)' : 'rgba(100,130,150,0.5)';

    return {
        animation: false,
        backgroundColor: 'transparent',
        grid: { left: 58, right: 12, top: 6, bottom: 24 },
        xAxis: {
            type: 'time',
            axisLabel: { fontSize: 9, color: axisColor },
            axisLine: { show: true, lineStyle: { color: axisLineColor } },
            axisTick: { show: false },
            splitLine: { show: false },
        },
        yAxis: {
            type: 'value',
            axisLabel: { fontSize: 9, color: axisColor },
            splitLine: { lineStyle: { color: splitLineColor } },
        },
        tooltip: {
            trigger: 'axis',
            textStyle: { fontSize: 11 },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (params: any) => {
                const arr = Array.isArray(params) ? params : [params];
                return arr
                    .filter((p: any) => p.seriesName !== '_band')
                    .map((p: any) => `${p.marker}${p.seriesName}: ${Number(p.value[1]).toFixed(2)}`)
                    .join('<br/>');
            },
        },
        series: [
            // 1. P5 base — invisible, acts as stack anchor for confidence band
            {
                name: p5.name,
                type: 'line',
                data: p5.data,
                stack: 'confidence_band',
                smooth: true,
                showSymbol: false,
                lineStyle: { opacity: 0, width: 0 },
                areaStyle: { opacity: 0 },
                itemStyle: { color: 'transparent' },
                z: 1,
            },
            // 2. Band width (P95 - P5) — filled area on top of P5 base
            {
                name: '_band',
                type: 'line',
                data: bandData,
                stack: 'confidence_band',
                smooth: true,
                showSymbol: false,
                lineStyle: { opacity: 0, width: 0 },
                areaStyle: { color: bandFill, opacity: 1 },
                itemStyle: { color: bandFill },
                z: 2,
            },
            // 3. P50 main forecast line
            {
                name: p50.name,
                type: 'line',
                data: p50.data,
                smooth: true,
                showSymbol: false,
                lineStyle: { color: p50Color, width: 2 },
                itemStyle: { color: p50Color },
                z: 10,
            },
            // 4. P95 upper bound — thin dashed
            {
                name: p95.name,
                type: 'line',
                data: p95.data,
                smooth: true,
                showSymbol: false,
                lineStyle: { color: boundColor, width: 1, type: 'dashed' },
                itemStyle: { color: boundColor },
                z: 3,
            },
        ],
    };
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────

const formatDate = (d: string) => `${d.slice(0, 4)}/${d.slice(5, 7)}/${d.slice(8, 10)}`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecordsCell { sourceKey: string; area: string; date: string; slot?: number; }

interface Props {
    selectedCell: SelectedCell | null;
    availableDates: string[];           // sorted YYYY-MM-DD list from Gantt rows
    onClose: () => void;
    onNavigate: (cell: SelectedCell) => void;
    onOpenRecords: (cell: RecordsCell) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DataStatusUnifiedDrawer: React.FC<Props> = ({
    selectedCell,
    availableDates,
    onClose,
    onNavigate,
    onOpenRecords,
}) => {
    const { darkMode } = useTheme();

    // ── Tab state ─────────────────────────────────────────────────────────────
    const [activeTab,   setActiveTab]   = useState<0 | 1 | 2>(0);
    const [slotFilter,  setSlotFilter]  = useState<number | null>(null);

    // ── Coverage slot data ────────────────────────────────────────────────────
    const [slotRows,        setSlotRows]        = useState<DetailHourRow[]>([]);
    const [interval,        setInterval]        = useState<'hour' | '30m' | 'day'>('hour');
    const [coverageLoading, setCoverageLoading] = useState(false);

    // ── Market preview data ───────────────────────────────────────────────────
    const [groups,         setGroups]         = useState<PreviewGroup[]>([]);
    const [events,         setEvents]         = useState<PreviewEvent[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [calcTimeLabel,  setCalcTimeLabel]  = useState<string>('');   // prediction sources
    const [previewHitCount, setPreviewHitCount] = useState<number | null>(null);

    // ── Weather preview data ──────────────────────────────────────────────────
    const [weatherData,    setWeatherData]    = useState<any[]>([]);
    const [weatherLoading, setWeatherLoading] = useState(false);

    const isWeather      = selectedCell?.sourceKey.startsWith('weather_') ?? false;
    const isEventSource  = selectedCell?.sourceKey === 'occto_event';

    // Reset tab when source/area changes (keep tab when navigating dates)
    useEffect(() => {
        setActiveTab(0);
        setSlotFilter(null);
    }, [selectedCell?.sourceKey, selectedCell?.area]);

    // Fetch coverage detail whenever cell changes
    useEffect(() => {
        if (!selectedCell) return;
        const dp = selectedCell.date.replace(/-/g, '');
        setCoverageLoading(true);
        setSlotRows([]);
        fetchCoverageDetail(selectedCell.sourceKey, selectedCell.area, dp)
            .then(r => { setSlotRows(r.rows); setInterval(r.interval); })
            .catch(() => setSlotRows([]))
            .finally(() => setCoverageLoading(false));
    }, [selectedCell]);

    // Fetch preview data (market or weather) whenever cell changes
    useEffect(() => {
        if (!selectedCell) return;
        const dp = selectedCell.date.replace(/-/g, '');

        if (isWeather) {
            setWeatherLoading(true);
            setWeatherData([]);
            const params = { start_date: dp, end_date: dp, area_name: selectedCell.area };
            const fetcher: Promise<any[]> =
                selectedCell.sourceKey === 'weather_actual'         ? fetchWeatherActual(params) :
                selectedCell.sourceKey === 'weather_actual_daily'   ? fetchWeatherActualDaily(params) :
                selectedCell.sourceKey === 'weather_forecast'       ? fetchWeatherForecast(params) :
                selectedCell.sourceKey === 'weather_forecast_daily' ? fetchWeatherForecastDaily(params) :
                Promise.resolve([]);
            fetcher
                .then(d => setWeatherData(d ?? []))
                .catch(() => setWeatherData([]))
                .finally(() => setWeatherLoading(false));
        } else {
            setPreviewLoading(true);
            setGroups([]);
            setEvents([]);
            setCalcTimeLabel('');
            setPreviewHitCount(null);
            fetchCoveragePreview(selectedCell.sourceKey, selectedCell.area, dp)
                .then(r => {
                    setGroups(r.groups ?? []);
                    setEvents(r.events ?? []);
                    setCalcTimeLabel(r.calculate_time ?? '');
                    setPreviewHitCount(r.hit_count ?? null);
                })
                .catch(() => {})
                .finally(() => setPreviewLoading(false));
        }
    }, [selectedCell, isWeather]);

    // ── Computed coverage stats ───────────────────────────────────────────────
    const totalSlots   = interval === '30m' ? 48 : interval === 'day' ? 1 : 24;
    const totalDocs    = slotRows.reduce((s, r) => s + r.doc_count, 0);
    const slotsOk      = slotRows.filter(r => r.doc_count > 0).length;
    const slotsMissing = totalSlots - slotsOk;

    // ── Day navigation ────────────────────────────────────────────────────────
    const dateIdx  = selectedCell ? availableDates.indexOf(selectedCell.date) : -1;
    const onPrevDay = dateIdx > 0
        ? () => onNavigate({ ...selectedCell!, date: availableDates[dateIdx - 1] })
        : null;
    const onNextDay = dateIdx >= 0 && dateIdx < availableDates.length - 1
        ? () => onNavigate({ ...selectedCell!, date: availableDates[dateIdx + 1] })
        : null;

    // ── Cross-tab slot navigation ─────────────────────────────────────────────
    const handleSlotClick = useCallback((slot: number) => {
        setSlotFilter(slot);
        setActiveTab(2);
    }, []);

    const handleChartPointClick = useCallback((params: any) => {
        const ts = params?.value?.[0];
        if (ts == null) return;
        // Compute JST hour from UTC timestamp
        const totalJstMin = (new Date(ts).getUTCHours() * 60 + new Date(ts).getUTCMinutes() + 9 * 60) % (24 * 60);
        const jstHour  = Math.floor(totalJstMin / 60);
        const jstMin   = totalJstMin % 60;
        const slot = interval === '30m'
            ? jstHour * 2 + Math.floor(jstMin / 30)
            : jstHour;
        setSlotFilter(slot);
        setActiveTab(2);
    }, [interval]);

    const chartEvents = useMemo(() => ({ click: handleChartPointClick }), [handleChartPointClick]);

    // ── Weather chart memos ───────────────────────────────────────────────────
    const isForecast   = selectedCell?.sourceKey.startsWith('weather_forecast') ?? false;
    const isDaily      = selectedCell?.sourceKey.endsWith('_daily') ?? false;
    const categories   = isDaily ? DAILY_CATEGORIES : HOURLY_CATEGORIES;

    // Fix C: deduplicate by datetime — keep first occurrence per timestamp
    const dedupedWeatherData = useMemo(() => {
        const seen = new Set<string>();
        return weatherData.filter(d => {
            if (seen.has(d.datetime)) return false;
            seen.add(d.datetime);
            return true;
        });
    }, [weatherData]);

    const categoryCharts = useMemo(() => {
        if (dedupedWeatherData.length === 0) return [];
        const axisColor = darkMode ? '#b8bfc9' : '#4b5563';
        return categories
            .filter(cat => cat.id !== 'daily_sunshine')
            .flatMap(cat => {
                const visibleFields = cat.fields.filter(
                    f => !SKIP_FIELDS.has(f) && dedupedWeatherData.some(d => d[f] != null),
                );
                const option = buildWeatherMiniOption(cat.fields, dedupedWeatherData, isForecast, isDaily, axisColor, darkMode);
                if (option === null || visibleFields.length === 0) return [];
                return [{ ...cat, option, visibleFields }];
            });
    }, [dedupedWeatherData, categories, isForecast, isDaily, darkMode]);

    // ── Market chart memos ────────────────────────────────────────────────────
    const isPrediction = selectedCell?.sourceKey.startsWith('prediction_') ?? false;
    const chartOptions = useMemo(() => {
        const axisColor = darkMode ? '#b8bfc9' : '#4b5563';
        return groups.map(g => ({
            group: g,
            option: isPrediction
                ? buildPredictionMiniOption(g, axisColor, darkMode)
                : buildMarketMiniOption(g, axisColor, darkMode),
        }));
    }, [groups, darkMode, isPrediction]);

    // ── Theme colors ──────────────────────────────────────────────────────────
    const bg         = darkMode ? '#16171e' : '#ffffff';
    const border     = darkMode ? '#2d2f3e' : '#e0e0e0';
    const textPri    = darkMode ? '#e8e8e8' : '#111111';
    const textSec    = darkMode ? '#8a8fa0' : '#6b7280';
    const cellOk     = '#52c41a';
    const cellErr    = '#ff4d4f';
    const cellOkDim  = darkMode ? 'rgba(82,196,26,0.18)'  : 'rgba(82,196,26,0.14)';
    const cellErrDim = darkMode ? 'rgba(255,77,79,0.18)'  : 'rgba(255,77,79,0.14)';
    const eventBg    = darkMode ? '#1e202b' : '#f8f9fb';
    const tabsSx = {
        minHeight: 36,
        borderBottom: `1px solid ${border}`,
        '& .MuiTab-root': {
            minHeight: 36,
            fontSize: '0.78rem',
            fontWeight: 500,
            color: textSec,
            textTransform: 'none',
            py: 0,
        },
        '& .Mui-selected': { color: 'var(--primary) !important' },
        '& .MuiTabs-indicator': { backgroundColor: 'var(--primary)' },
    };

    // ── Status badge ──────────────────────────────────────────────────────────
    type Status = 'ok' | 'partial' | 'missing';
    const status: Status =
        coverageLoading          ? 'ok' :
        slotsMissing === 0       ? 'ok' :
        slotsMissing === totalSlots ? 'missing' : 'partial';
    const STATUS = {
        ok:      { label: '✅  資料完整', color: '#52c41a', bg: 'rgba(82,196,26,0.18)'  },
        partial: { label: '⚠️  部分缺失', color: '#fa8c16', bg: 'rgba(250,140,22,0.18)' },
        missing: { label: '❌  資料缺失', color: '#ff4d4f', bg: 'rgba(255,77,79,0.18)'  },
    } as const;
    const sm = STATUS[status];

    const areaLabel   = selectedCell
        ? (selectedCell.area === 'system' ? '全域' : (AREA_JP[selectedCell.area] ?? selectedCell.area))
        : '';
    const granularity = interval === '30m' ? '30分/コマ' : interval === 'day' ? '毎日' : '毎時';
    const slotUnit    = interval === 'day' ? '日' : interval === '30m' ? 'コマ' : 'hr';

    // Compact slot grid columns
    const gridCols = interval === 'day' ? 1 : interval === '30m' ? 8 : 12;
    const cellH    = interval === 'day' ? 60 : interval === '30m' ? 28 : 26;

    const dateParam = selectedCell?.date.replace(/-/g, '') ?? '';

    // ── Full-page raw data navigation ─────────────────────────────────────────
    const handleOpenFullPage = useCallback(() => {
        if (!selectedCell) return;
        onOpenRecords({
            sourceKey: selectedCell.sourceKey,
            area: selectedCell.area,
            date: dateParam,
            slot: slotFilter ?? undefined,
        });
    }, [selectedCell, dateParam, slotFilter, onOpenRecords]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Drawer
            anchor="right"
            open={!!selectedCell}
            onClose={onClose}
            disableEnforceFocus
            slotProps={{
                paper: {
                    elevation: 8,
                    sx: {
                        width: 720,
                        backgroundColor: bg,
                        borderLeft: `1px solid ${border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    },
                },
                backdrop: { sx: { backgroundColor: 'transparent' } },
            }}
        >
            {/* ── Header ──────────────────────────────────────────────────────── */}
            <Box sx={{ px: 1.5, pt: 1.25, pb: 1, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {/* Close */}
                    <IconButton size="small" onClick={onClose} sx={{ color: textSec, mr: 0.5 }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>

                    {/* Source + area */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{
                            fontWeight: 700, color: textPri,
                            fontSize: '0.92rem', lineHeight: 1.25,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {selectedCell?.sourceLabel}
                        </Typography>
                        <Typography variant="body2" sx={{ color: textSec, fontSize: '0.75rem', mt: 0.15 }}>
                            {areaLabel}
                            {!coverageLoading && (
                                <>&nbsp;·&nbsp;<span style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{granularity}</span></>
                            )}
                        </Typography>
                    </Box>

                    {/* Day navigation */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                        <IconButton
                            size="small"
                            disabled={!onPrevDay}
                            onClick={onPrevDay ?? undefined}
                            sx={{ color: onPrevDay ? textSec : 'transparent', p: 0.5 }}
                        >
                            <ChevronLeftIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{
                            fontFamily: 'monospace', fontSize: '0.75rem', color: textPri,
                            px: 0.5, minWidth: 88, textAlign: 'center',
                        }}>
                            {selectedCell ? formatDate(selectedCell.date) : ''}
                        </Typography>
                        <IconButton
                            size="small"
                            disabled={!onNextDay}
                            onClick={onNextDay ?? undefined}
                            sx={{ color: onNextDay ? textSec : 'transparent', p: 0.5 }}
                        >
                            <ChevronRightIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>

                {/* Status badge */}
                <Box sx={{ mt: 1, display: 'inline-flex', alignItems: 'center', px: 1.25, py: 0.4, borderRadius: 1.5, backgroundColor: sm.bg, border: `1.5px solid ${sm.color}` }}>
                    {coverageLoading
                        ? <Skeleton variant="text" width={72} />
                        : <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: sm.color }}>{sm.label}</Typography>
                    }
                </Box>
            </Box>

            {/* ── Tabs ────────────────────────────────────────────────────────── */}
            <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={tabsSx}
            >
                <Tab label="狀態" value={0} />
                <Tab label="預覽" value={1} />
                <Tab label="明細" value={2} />
            </Tabs>

            {/* ── Tab 0: Status ────────────────────────────────────────────────── */}
            {activeTab === 0 && (
                <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {/* KPI row */}
                    <Box sx={{ px: 2, py: 1.25, flexShrink: 0, display: 'flex', gap: 1 }}>
                        {[
                            { label: '總筆數',   value: coverageLoading ? '…' : totalDocs.toLocaleString(), accent: undefined },
                            { label: '有資料',   value: coverageLoading ? '…' : `${slotsOk} / ${totalSlots} ${slotUnit}`, accent: cellOk },
                            { label: '缺失時段', value: coverageLoading ? '…' : `${slotsMissing} ${slotUnit}`, accent: slotsMissing > 0 ? cellErr : cellOk },
                        ].map(({ label, value, accent }) => (
                            <Box key={label} sx={{
                                flex: 1, px: 1, py: 0.75,
                                border: `1px solid ${border}`,
                                borderLeft: accent ? `3px solid ${accent}` : undefined,
                                borderRadius: 1,
                                backgroundColor: darkMode ? '#1e202b' : '#f8f9fb',
                            }}>
                                <Typography sx={{ fontSize: '0.64rem', color: textSec, display: 'block' }}>{label}</Typography>
                                <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: accent ?? textPri }}>{value}</Typography>
                            </Box>
                        ))}
                    </Box>

                    {/* Slot grid */}
                    <Box sx={{ px: 2, pb: 2, flex: 1 }}>
                        <Typography sx={{ fontSize: '0.68rem', color: textSec, mb: 0.75, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {interval === 'day' ? '日別資料狀態' : interval === '30m' ? '各コマ状態（30分）' : '每小時狀態'}
                            {' '}
                            <Box component="span" sx={{ opacity: 0.6, fontWeight: 400 }}>
                                · 點擊格子可查看明細記錄
                            </Box>
                        </Typography>
                        {coverageLoading ? (
                            <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: '3px' }}>
                                {Array.from({ length: Math.min(totalSlots, 24) }).map((_, i) => (
                                    <Skeleton key={i} variant="rounded" height={cellH} />
                                ))}
                            </Box>
                        ) : (
                            <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: '3px' }}>
                                {slotRows.map(({ slot, label, doc_count }) => {
                                    const hasData = doc_count > 0;
                                    return (
                                        <Box
                                            key={slot}
                                            title={`${label} — ${doc_count} 筆（點擊查看明細）`}
                                            onClick={() => handleSlotClick(slot)}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: cellH,
                                                borderRadius: '4px',
                                                border: `1.5px solid ${hasData ? cellOk : cellErr}`,
                                                backgroundColor: hasData ? cellOkDim : cellErrDim,
                                                cursor: 'pointer',
                                                transition: 'opacity 0.1s',
                                                '&:hover': { opacity: 0.75 },
                                            }}
                                        >
                                            <Typography sx={{
                                                fontSize: interval === 'day' ? '0.78rem' : '0.5rem',
                                                fontWeight: 600,
                                                color: hasData ? cellOk : cellErr,
                                            }}>
                                                {label}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </Box>
                </Box>
            )}

            {/* ── Tab 1: Preview ──────────────────────────────────────────────── */}
            {activeTab === 1 && (
                <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, pt: 1.25, pb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 1.25, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: '0.72rem', color: textSec, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            資料預覽
                            {' '}
                            <Box component="span" sx={{ opacity: 0.6, fontWeight: 400 }}>
                                · 點擊圖表資料點可跳至明細
                            </Box>
                        </Typography>
                        {calcTimeLabel && (
                            <Typography sx={{ fontSize: '0.68rem', color: textSec, fontFamily: 'monospace' }}>
                                計算日: {calcTimeLabel}
                            </Typography>
                        )}
                    </Box>

                    {isWeather ? (
                        /* ── Weather charts ──────────────────────────────── */
                        weatherLoading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                {[0, 1, 2].map(i => (
                                    <Box key={i}>
                                        <Skeleton variant="text" width={120} height={14} sx={{ mb: 0.5 }} />
                                        <Skeleton variant="text" width={220} height={10} sx={{ mb: 0.5 }} />
                                        <Skeleton variant="rounded" height={130} />
                                    </Box>
                                ))}
                            </Box>
                        ) : categoryCharts.length === 0 ? (
                            <Box sx={{ py: 3, textAlign: 'center', border: `1px solid ${border}`, borderRadius: 1 }}>
                                <Typography sx={{ fontSize: '0.82rem', color: textSec }}>該日無天氣資料可顯示</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                {categoryCharts.map(cat => (
                                    <Box key={cat.id}>
                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: textPri, mb: 0.5 }}>
                                            {cat.label}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 0.75 }}>
                                            {cat.visibleFields.map((f: string) => {
                                                const d = WEATHER_FIELD_DISPLAY[f];
                                                const lbl = d?.shortLabel ?? f;
                                                const unit = d?.unit ?? '';
                                                return (
                                                    <Box key={f} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Box sx={{ width: 18, height: 3, borderRadius: 1.5, backgroundColor: getWeatherFieldColor(f, isForecast), flexShrink: 0 }} />
                                                        <Typography sx={{ fontSize: '0.62rem', color: textSec, whiteSpace: 'nowrap' }}>
                                                            {lbl}{unit ? ` (${unit})` : ''}
                                                        </Typography>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                        <BaseChart
                                            option={cat.option}
                                            height="130px"
                                            showLoading={false}
                                            onEvents={chartEvents}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        )

                    ) : isEventSource ? (
                        /* ── Event list (occto_event) ────────────────────── */
                        previewLoading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {[0, 1, 2].map(i => <Skeleton key={i} variant="rounded" height={64} />)}
                            </Box>
                        ) : events.length === 0 ? (
                            <Box sx={{ py: 3, textAlign: 'center', border: `1px solid ${border}`, borderRadius: 1 }}>
                                <Typography sx={{ fontSize: '0.82rem', color: textSec }}>當日無事件記錄</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {events.map((ev, i) => (
                                    <Box key={i} sx={{ px: 1.5, py: 1, borderRadius: 1, border: `1px solid ${border}`, backgroundColor: eventBg }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: textSec, fontFamily: 'monospace', mb: 0.25 }}>
                                            {ev.datetime.slice(0, 16).replace('T', ' ')}&nbsp;&nbsp;{AREA_JP[ev.area] ?? ev.area}
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.8rem', color: textPri }}>{ev.description || '（無描述）'}</Typography>
                                        {ev.value !== null && (
                                            <Typography sx={{ fontSize: '0.72rem', color: textSec, mt: 0.25 }}>值：{ev.value}</Typography>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        )

                    ) : (
                        /* ── Market time-series charts ───────────────────── */
                        previewLoading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                {[0, 1, 2].map(i => (
                                    <Box key={i}>
                                        <Skeleton variant="text" width={120} height={14} sx={{ mb: 0.5 }} />
                                        <Skeleton variant="text" width={220} height={10} sx={{ mb: 0.5 }} />
                                        <Skeleton variant="rounded" height={130} />
                                    </Box>
                                ))}
                            </Box>
                        ) : chartOptions.length === 0 ? (
                            <Box sx={{ py: 3, textAlign: 'center', border: `1px solid ${border}`, borderRadius: 1 }}>
                                {previewHitCount !== null && previewHitCount > 0 ? (
                                    <>
                                        <Typography sx={{ fontSize: '0.82rem', color: textSec }}>
                                            此來源圖表欄位值均為空值
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.72rem', color: textSec, mt: 0.5 }}>
                                            ({previewHitCount} 筆資料，數值欄位尚無資料)
                                        </Typography>
                                    </>
                                ) : (
                                    <Typography sx={{ fontSize: '0.82rem', color: textSec }}>該日無資料可顯示</Typography>
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                {chartOptions.map(({ group, option }) => (
                                    <Box key={group.id}>
                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: textPri, mb: 0.5 }}>
                                            {group.label}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 0.75 }}>
                                            {group.series.map(s => (
                                                <Box key={s.name} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Box sx={{
                                                        width: 18, height: s.type === 'bar' ? 8 : 3,
                                                        borderRadius: s.type === 'bar' ? 0.5 : 1.5,
                                                        backgroundColor: s.color, flexShrink: 0,
                                                    }} />
                                                    <Typography sx={{ fontSize: '0.62rem', color: textSec, whiteSpace: 'nowrap' }}>
                                                        {s.name}{s.unit ? ` (${s.unit})` : ''}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                        <BaseChart
                                            option={option}
                                            height={group.stacked ? '200px' : '130px'}
                                            showLoading={false}
                                            onEvents={chartEvents}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        )
                    )}
                </Box>
            )}

            {/* ── Tab 2: Records ──────────────────────────────────────────────── */}
            {activeTab === 2 && selectedCell && (
                <RecordsTab
                    sourceKey={selectedCell.sourceKey}
                    area={selectedCell.area}
                    date={dateParam}
                    interval={interval}
                    slotFilter={slotFilter}
                    onSlotFilterChange={setSlotFilter}
                    onOpenFullPage={handleOpenFullPage}
                />
            )}
        </Drawer>
    );
};
