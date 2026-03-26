/**
 * 發電組合分析頁 | Generation Mix Analysis — OCCTO area generation by source.
 *
 * Modes:
 *   timeseries  — single area, X = time, stacked bar + hover-driven donut panel
 *   comparison  — all areas period-average, X = area name, stacked bar + hover-driven donut panel
 */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Collapse,
  Typography,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReactECharts from 'echarts-for-react';
import { format } from 'date-fns';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { DashboardToolbar } from '@/components/navigation/DashboardToolbar';
import { LoadingOverlay } from '@/components/overlay/LoadingOverlay';
import { useTheme } from '@/app/ThemeProvider';
import { useBufferedDateRange } from '@/hooks/useBufferedDateRange';
import { fetchOcctoArea, fetchHjksOutages } from '@/services';
import OutagesPanel from '@/components/market/outages/OutagesPanel';
import type { OcctoAreaData, HjksOutage } from '@/types';
import GenerationMixLightweightChart, { GEN_SOURCES as GEN_SOURCES_LW } from '@/components/market/generation-mix/GenerationMixLightweightChart';

// GEN_SOURCES is defined in GenerationMixLightweightChart and re-exported
const GEN_SOURCES = GEN_SOURCES_LW;

const RENEWABLE_KEYS: (keyof OcctoAreaData)[] = [
  'solar_power_generation_actual',
  'wind_power_generation_actual',
  'hydropower',
  'geothermal_power',
  'biomass',
];

type PageMode = 'timeseries' | 'comparison';

// ─── Helper: compute values for one data point ───────────────────────────────
function computeGenValues(row: OcctoAreaData | Record<string, number>) {
  return GEN_SOURCES.map((s) => Math.max(0, Number((row as any)[s.key]) || 0));
}

// ─── DonutPanel — hover-driven or average ────────────────────────────────────
interface DonutPanelProps {
  title: string;
  values: number[]; // aligned with GEN_SOURCES
  isDark: boolean;
}

function DonutPanel({ title, values, isDark }: DonutPanelProps) {
  const total = values.reduce((s, v) => s + v, 0);
  const pieData = GEN_SOURCES
    .map((s, i) => ({ name: s.label, value: values[i], itemStyle: { color: s.color } }))
    .filter((d) => d.value > 0);

  const option = useMemo(
    () => ({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (p: any) =>
          `${p.marker}${p.name}: <b>${p.value.toFixed(0)} MW</b> (${p.percent?.toFixed(1)}%)`,
        backgroundColor: isDark ? '#1e2128' : '#fff',
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
        textStyle: { color: isDark ? '#e2e8f0' : '#1a202c', fontSize: 12 },
      },
      series: [
        {
          type: 'pie',
          radius: ['38%', '62%'],
          center: ['50%', '46%'],
          data: pieData,
          label: { show: false },
          emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.3)' } },
        },
      ],
      animation: false,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pieData, isDark]
  );

  const sorted = [...GEN_SOURCES]
    .map((s, i) => ({ ...s, val: values[i] }))
    .filter((s) => s.val > 0)
    .sort((a, b) => b.val - a.val);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5, px: 0.5 }}
      >
        {title}
      </Typography>
      <ReactECharts option={option} style={{ height: 180 }} notMerge />
      <Divider sx={{ my: 0.5 }} />
      <Box sx={{ flex: 1, overflowY: 'auto', px: 0.5 }}>
        {sorted.map((s) => {
          const pct = total > 0 ? (s.val / total) * 100 : 0;
          return (
            <Box
              key={s.key as string}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.3 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.color, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{s.label}</Typography>
              </Box>
              <Typography sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>
                {s.val.toFixed(0)}{' '}
                <span style={{ opacity: 0.55, fontWeight: 400 }}>({pct.toFixed(1)}%)</span>
              </Typography>
            </Box>
          );
        })}
      </Box>
      <Divider sx={{ my: 0.5 }} />
      <Typography sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, px: 0.5 }}>
        合計 {total.toFixed(0)} MW
      </Typography>
    </Box>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GenerationMixPage() {
  const { darkMode } = useTheme();

  const {
    areas,
    selectedArea,
    handleAreaChange,
    startDate,
    endDate,
    dateRangePreset,
    setStartDate,
    setEndDate,
    handleDateRangePreset,
    occtoAreaData,
    isLoading,
    refreshData,
    registerPageNeeds,
    unregisterPageNeeds,
  } = useMarketDataContext();

  useEffect(() => {
    registerPageNeeds('generation-mix', new Set(['grid']), true);
    return () => unregisterPageNeeds('generation-mix');
  }, [registerPageNeeds, unregisterPageNeeds]);

  const { tempStartDate, tempEndDate, onDateRangeChange, onDateMenuClose } = useBufferedDateRange({
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    clearPreset: () => handleDateRangePreset(null),
  });

  const [pageMode, setPageMode] = useState<PageMode>('timeseries');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [outages, setOutages] = useState<HjksOutage[]>([]);
  const [hoveredOutages, setHoveredOutages] = useState<HjksOutage[]>([]);
  const [outagesExpanded, setOutagesExpanded] = useState(false);
  // Lock state: clicking a bar pins the donut + outage detail until clicked again
  const [lockedIndex, setLockedIndex] = useState<number | null>(null);
  const [lockedOutages, setLockedOutages] = useState<HjksOutage[]>([]);
  const [lockedTime, setLockedTime] = useState<number | null>(null);

  // ── All-area data for comparison mode (fetched independently, no area filter) ─
  const [allAreaData, setAllAreaData] = useState<OcctoAreaData[]>([]);
  const [allAreaLoading, setAllAreaLoading] = useState(false);
  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (pageMode !== 'comparison' || !startDate || !endDate) return;
    fetchAbortRef.current?.abort();
    const ctrl = new AbortController();
    fetchAbortRef.current = ctrl;
    setAllAreaLoading(true);
    fetchOcctoArea({
      start_date: format(startDate, 'yyyyMMdd'),
      end_date: format(endDate, 'yyyyMMdd'),
    })
      .then((data) => { if (!ctrl.signal.aborted) setAllAreaData(data); })
      .catch((err) => { if (!ctrl.signal.aborted) { console.error('Failed to fetch all-area OCCTO data:', err); setAllAreaData([]); } })
      .finally(() => { if (!ctrl.signal.aborted) setAllAreaLoading(false); });
    return () => ctrl.abort();
  }, [pageMode, startDate, endDate]);

  // ── Outages fetch (timeseries mode only, filtered by selected area) ─────────
  const outagesFetchRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (pageMode !== 'timeseries' || !startDate || !endDate || !selectedArea) {
      setOutages([]);
      return;
    }
    outagesFetchRef.current?.abort();
    const ctrl = new AbortController();
    outagesFetchRef.current = ctrl;
    fetchHjksOutages({
      start_date: format(startDate, 'yyyyMMdd'),
      end_date: format(endDate, 'yyyyMMdd'),
      area_name: selectedArea,
    })
      .then((data) => { if (!ctrl.signal.aborted) setOutages(data); })
      .catch((err) => { if (!ctrl.signal.aborted) { console.error('Failed to fetch outages:', err); setOutages([]); } });
    return () => ctrl.abort();
  }, [pageMode, startDate, endDate, selectedArea]);

  // ── Timeseries: filter + sort by selected area ──────────────────────────────
  const areaData: OcctoAreaData[] = useMemo(() => {
    if (!occtoAreaData?.length) return [];
    return [...occtoAreaData]
      .filter((d) => !selectedArea || d.area === selectedArea)
      .sort((a, b) => a.datetime.localeCompare(b.datetime));
  }, [occtoAreaData, selectedArea]);

  const timeLabels = useMemo(
    () => areaData.map((d) => d.datetime.slice(0, 16).replace('T', ' ')),
    [areaData]
  );

  // ── Comparison: period average per area (uses all-area fetch) ──────────────
  const comparisonData = useMemo(() => {
    if (!allAreaData.length || !areas.length) return [];
    return areas.map((area) => {
      const rows = allAreaData.filter((d) => d.area === area.name);
      if (!rows.length) return { area, avg: Object.fromEntries(GEN_SOURCES.map((s) => [s.key, 0])) };
      const avg: Record<string, number> = {};
      GEN_SOURCES.forEach((s) => {
        avg[s.key as string] = rows.reduce((sum, r) => sum + (Number((r as any)[s.key]) || 0), 0) / rows.length;
      });
      return { area, avg };
    });
  }, [allAreaData, areas]);

  const comparisonLabels = useMemo(
    () => comparisonData.map((d) => d.area.name_ch || d.area.name),
    [comparisonData]
  );

  // ── Lock: clicking a bar pins display; clicking same bar or empty area unlocks
  const handleChartClick = (index: number | null, time: number | null, clickedOutages: HjksOutage[]) => {
    if (index === null) return; // click outside data — do not unlock
    if (index === lockedIndex) {
      // Toggle off: click same bar again
      setLockedIndex(null);
      setLockedOutages([]);
      setLockedTime(null);
    } else {
      setLockedIndex(index);
      setLockedOutages(clickedOutages);
      setLockedTime(time);
    }
  };

  // When locked, display locked slot; otherwise display hover slot
  const activeIndex   = lockedIndex !== null ? lockedIndex   : hoverIndex;
  const activeOutages = lockedIndex !== null ? lockedOutages : hoveredOutages;

  // ── Display: compute values for donut panel ─────────────────────────────────
  const hoverValues = useMemo((): number[] => {
    if (activeIndex === null) {
      // Show period average
      if (pageMode === 'timeseries') {
        if (!areaData.length) return GEN_SOURCES.map(() => 0);
        const avg = GEN_SOURCES.map((s) =>
          areaData.reduce((sum, r) => sum + (Number((r as any)[s.key]) || 0), 0) / areaData.length
        );
        return avg;
      } else {
        // All-area grand average
        if (!comparisonData.length) return GEN_SOURCES.map(() => 0);
        return GEN_SOURCES.map((s) =>
          comparisonData.reduce((sum, d) => sum + (d.avg[s.key as string] || 0), 0) / comparisonData.length
        );
      }
    }
    if (pageMode === 'timeseries') {
      const row = areaData[activeIndex];
      return row ? computeGenValues(row) : GEN_SOURCES.map(() => 0);
    } else {
      const row = comparisonData[activeIndex];
      return row ? GEN_SOURCES.map((s) => row.avg[s.key as string] || 0) : GEN_SOURCES.map(() => 0);
    }
  }, [activeIndex, pageMode, areaData, comparisonData]);

  const donutTitle = useMemo(() => {
    if (activeIndex === null) return '期間平均組合';
    if (pageMode === 'timeseries') {
      const label = timeLabels[activeIndex];
      return label ? `${label.slice(5, 16)}` : '組合';
    } else {
      const label = comparisonLabels[activeIndex];
      return label ?? '組合';
    }
  }, [activeIndex, pageMode, timeLabels, comparisonLabels]);

  // ── KPI period stats (aggregated to avoid 0 from latest-slot data latency) ──
  // Uses only rows where total > 0 to exclude incomplete time slots.
  const periodStats = useMemo(() => {
    const valid = areaData.filter((d) => (Number((d as any).total) || 0) > 0);
    if (!valid.length) return null;
    const avgTotal = valid.reduce((s, d) => s + (Number((d as any).total) || 0), 0) / valid.length;
    const avgRenewablePct =
      valid.reduce((s, d) => {
        const tot = Number((d as any).total) || 0;
        if (tot === 0) return s;
        const ren = RENEWABLE_KEYS.reduce((r, k) => r + (Number((d as any)[k]) || 0), 0);
        return s + ren / tot;
      }, 0) /
      valid.length *
      100;
    const peakSolar = Math.max(...valid.map((d) => Number((d as any).solar_power_generation_actual) || 0));
    const peakWind = Math.max(...valid.map((d) => Number((d as any).wind_power_generation_actual) || 0));
    return { avgTotal, avgRenewablePct, peakSolar, peakWind };
  }, [areaData]);

  const isDark = darkMode;

  // ── Comparison items for LWC chart ─────────────────────────────────────────
  const comparisonItems = useMemo(
    () =>
      comparisonData.map((d) => ({
        label: d.area.name_ch || d.area.name,
        values: GEN_SOURCES.map((s) => d.avg[s.key as string] || 0),
      })),
    [comparisonData]
  );

  const handleRefresh = () => refreshData?.() ?? window.location.reload();

  const activeLoading = pageMode === 'timeseries' ? isLoading : allAreaLoading;
  const hasData = pageMode === 'timeseries' ? areaData.length > 0 : comparisonItems.length > 0;

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {isLoading && <LoadingOverlay />}
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', gap: 0.5, p: 0.5 }}>
        {/* Toolbar */}
        <Box sx={{ flexShrink: 0 }}>
          <DashboardToolbar
            startDate={tempStartDate}
            endDate={tempEndDate}
            dateRangePreset={dateRangePreset}
            onDateRangeChange={onDateRangeChange}
            onDateRangePreset={handleDateRangePreset}
            onDateMenuClose={onDateMenuClose}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />
        </Box>

        {/* Header row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, flexWrap: 'wrap', gap: 1, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              發電組合分析
            </Typography>
            {pageMode === 'timeseries' && selectedArea && (
              <Chip size="small" label={selectedArea} sx={{ fontFamily: 'monospace', height: 20, fontSize: 11 }} />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {/* Page mode toggle */}
            <ToggleButtonGroup
              value={pageMode}
              exclusive
              onChange={(_, v) => { if (v) { setPageMode(v); setHoverIndex(null); setLockedIndex(null); setLockedTime(null); } }}
              size="small"
              sx={{ '& .MuiToggleButton-root': { py: 0.25, px: 1.25, fontSize: 11, textTransform: 'none' } }}
            >
              <ToggleButton value="timeseries">時序分析</ToggleButton>
              <ToggleButton value="comparison">地區比較</ToggleButton>
            </ToggleButtonGroup>

            {/* Area chips — only meaningful in timeseries mode */}
            {pageMode === 'timeseries' && areas.map((area) => (
              <Chip
                key={area.name}
                label={area.name_ch || area.name}
                size="small"
                variant={selectedArea === area.name ? 'filled' : 'outlined'}
                onClick={() => handleAreaChange({ target: { value: area.name } } as any)}
                sx={{
                  cursor: 'pointer',
                  fontSize: 11,
                  height: 22,
                  ...(selectedArea === area.name && {
                    backgroundColor: 'rgba(0,204,122,0.2)',
                    borderColor: 'rgba(0,204,122,0.5)',
                    color: '#00cc7a',
                    fontWeight: 700,
                  }),
                }}
              />
            ))}
          </Box>
        </Box>

        {/* KPI strip — period aggregates (timeseries mode only) */}
        {pageMode === 'timeseries' && periodStats && (
          <Box sx={{ display: 'flex', gap: 1, px: 0.5, flexWrap: 'wrap', flexShrink: 0 }}>
            <Paper variant="outlined" sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, minWidth: 120 }}>
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>期間均值總供給</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace' }}>
                {periodStats.avgTotal.toFixed(0)} MW
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, minWidth: 120, backgroundColor: 'rgba(0,204,122,0.08)', borderColor: 'rgba(0,204,122,0.3)' }}>
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>均值再生能源佔比</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: '#00cc7a' }}>
                {periodStats.avgRenewablePct.toFixed(1)}%
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, minWidth: 120, backgroundColor: 'rgba(255,202,40,0.08)', borderColor: 'rgba(255,202,40,0.3)' }}>
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>太陽能峰值</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: '#ffca28' }}>
                {periodStats.peakSolar.toFixed(0)} MW
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, minWidth: 120, backgroundColor: 'rgba(38,198,218,0.08)', borderColor: 'rgba(38,198,218,0.3)' }}>
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>風力峰值</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: '#26c6da' }}>
                {periodStats.peakWind.toFixed(0)} MW
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Charts area */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 1 }}>
          {!hasData && !activeLoading ? (
            <Alert severity="info" sx={{ mx: 0.5, alignSelf: 'flex-start' }}>
              該時段無 OCCTO 供需資料 (No OCCTO area data for this period)
            </Alert>
          ) : activeLoading && !hasData && !isLoading ? (
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Stacked bar chart — Lightweight Charts (no ECharts flicker) */}
              <Paper
                variant="outlined"
                sx={{
                  flex: '3 1 500px',
                  minHeight: 0,
                  p: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  borderRadius: 1.5,
                }}
              >
                {/* Title + inline legend */}
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {pageMode === 'timeseries' ? '發電來源時序（堆疊長條）' : '各地區期間平均發電組合'}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
                    {GEN_SOURCES.map((s) => (
                      <Box key={s.key as string} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: s.color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1 }}>{s.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <GenerationMixLightweightChart
                    timeseriesData={areaData}
                    comparisonItems={comparisonItems}
                    mode={pageMode}
                    isDark={isDark}
                    onHoverIndexChange={setHoverIndex}
                    onHoverOutagesChange={setHoveredOutages}
                    onClickChange={handleChartClick}
                    outages={outages}
                    lockedBarTime={lockedTime}
                  />
                </Box>
              </Paper>

              {/* Donut panel + lock indicator + outage detail */}
              <Paper
                variant="outlined"
                sx={{
                  flex: '1 1 220px',
                  maxWidth: 280,
                  minHeight: 0,
                  p: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                }}
              >
                {/* Lock indicator */}
                {lockedIndex !== null && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 10, color: 'primary.main', fontWeight: 700 }}>
                      📌 已鎖定
                    </Typography>
                    <Chip
                      size="small"
                      label="解除"
                      onClick={() => { setLockedIndex(null); setLockedOutages([]); setLockedTime(null); }}
                      sx={{ fontSize: 10, height: 18, cursor: 'pointer' }}
                    />
                  </Box>
                )}
                {lockedIndex === null && (
                  <Typography sx={{ fontSize: 9, color: 'text.disabled', mb: 0.25 }}>
                    點擊圖表可鎖定時段
                  </Typography>
                )}

                <DonutPanel
                  title={donutTitle}
                  values={hoverValues}
                  isDark={isDark}
                />

                {/* Outage detail — below donut, scrollable */}
                {pageMode === 'timeseries' && activeOutages.length > 0 && (
                  <>
                    <Divider sx={{ my: 0.75 }} />
                    <Box
                      sx={{
                        flexShrink: 0,
                        maxHeight: 180,
                        overflowY: 'auto',
                        px: 0.5,
                        '&::-webkit-scrollbar': { width: 4 },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                          borderRadius: 2,
                        },
                      }}
                    >
                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'warning.main', mb: 0.5 }}>
                        ⚡ 停機中 {activeOutages.length} 件
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {activeOutages.map((o) => {
                          const isEmergency = o.stop_type?.includes('緊急');
                          const isPlanned   = o.stop_type?.includes('計画') || o.stop_type?.includes('計畫');
                          const tagColor = isEmergency ? '#ef5350' : isPlanned ? '#42a5f5' : undefined;
                          return (
                            <Box key={o.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography sx={{ fontSize: 10, color: tagColor, fontWeight: 700, minWidth: 28 }}>
                                  {isEmergency ? '緊急' : isPlanned ? '計画' : '停止'}
                                </Typography>
                                <Typography sx={{ fontSize: 10, fontWeight: 600, lineHeight: 1.3 }}>
                                  {o.name} {o.unit_name}
                                </Typography>
                              </Box>
                              <Typography sx={{ fontSize: 10, color: 'text.secondary', fontFamily: 'monospace', pl: 4 }}>
                                {o.down_capacity != null ? `↓${Math.round(o.down_capacity)}MW  ` : ''}
                                {o.start_datetime.slice(0, 16).replace('T', ' ')}
                                {' → '}
                                {o.end_datetime.slice(0, 16).replace('T', ' ')}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  </>
                )}
              </Paper>
            </>
          )}
        </Box>

        {/* Outages panel tab — collapsible, timeseries mode only */}
        {pageMode === 'timeseries' && (
          <Paper variant="outlined" sx={{ flexShrink: 0, borderRadius: 1.5, overflow: 'hidden' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                py: 0.5,
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': { backgroundColor: 'action.hover' },
              }}
              onClick={() => setOutagesExpanded((v) => !v)}
            >
              <WarningAmberIcon sx={{ fontSize: 16, mr: 0.75, color: 'warning.main' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, flex: 1 }}>
                停機事件
              </Typography>
              <IconButton size="small" sx={{ p: 0.25 }} tabIndex={-1}>
                {outagesExpanded
                  ? <ExpandLessIcon sx={{ fontSize: 18 }} />
                  : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Box>
            <Collapse in={outagesExpanded} timeout="auto">
              <Box sx={{ px: 1.5, pb: 1.5, maxHeight: 480, overflowY: 'auto' }}>
                <OutagesPanel
                  startDate={startDate}
                  endDate={endDate}
                  selectedArea={selectedArea ?? ''}
                />
              </Box>
            </Collapse>
          </Paper>
        )}

      </Box>
    </Box>
  );
}
