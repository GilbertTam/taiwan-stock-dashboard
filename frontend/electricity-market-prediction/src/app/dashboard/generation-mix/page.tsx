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
  ButtonBase,
  Collapse,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BoltIcon from '@mui/icons-material/Bolt';
import EnergySavingsLeafIcon from '@mui/icons-material/EnergySavingsLeaf';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import AirIcon from '@mui/icons-material/Air';
import ElectricalServicesIcon from '@mui/icons-material/ElectricalServices';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ReactECharts from 'echarts-for-react';
import { format } from 'date-fns';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { DashboardToolbar } from '@/components/navigation/DashboardToolbar';

import { useTheme } from '@/app/ThemeProvider';
import { fetchOcctoArea, fetchHjksOutages, fetchUnitAvailabilityTimeline } from '@/services';
import OutagesPanel from '@/components/market/outages/OutagesPanel';
import type { OcctoAreaData, HjksOutage, UnitAvailabilityTimeline } from '@/types';
import GenerationMixLightweightChart, { GEN_SOURCES as GEN_SOURCES_LW } from '@/components/market/generation-mix/GenerationMixLightweightChart';
import UnitCapacityTimelineChart, { type UnitCapacityMetric } from '@/components/market/generation-mix/UnitCapacityTimelineChart';
import { useTranslation } from 'react-i18next';
import { getAreaName } from '@/utils/areaI18n';

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
/** Which chart fills the main panel in timeseries mode. */
type ChartTab = 'mix' | 'capacity';

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
  const { t } = useTranslation('generationMix');
  const total = values.reduce((s, v) => s + v, 0);
  const pieData = GEN_SOURCES
    .map((s, i) => ({ name: t(s.labelKey), value: values[i], itemStyle: { color: s.color } }))
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
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t(s.labelKey)}</Typography>
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
        {t('totalMW', { total: total.toFixed(0) })}
      </Typography>
    </Box>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GenerationMixPage() {
  const { darkMode } = useTheme();
  const { t } = useTranslation('generationMix');

  const {
    areas,
    selectedArea,
    handleAreaChange,
    startDate,
    endDate,
    dateRangePreset,
    commitDateSelection,
    handleDateRangePreset,
    refreshData,
    registerPageNeeds,
    unregisterPageNeeds,
  } = useMarketDataContext();

  useEffect(() => {
    registerPageNeeds('generation-mix', new Set(['grid']), true);
    return () => unregisterPageNeeds('generation-mix');
  }, [registerPageNeeds, unregisterPageNeeds]);

  const [pageMode, setPageMode] = useState<PageMode>('timeseries');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [outages, setOutages] = useState<HjksOutage[]>([]);
  const [hoveredOutages, setHoveredOutages] = useState<HjksOutage[]>([]);
  const [outagesExpanded, setOutagesExpanded] = useState(false);
  // Lock state: clicking a bar pins the donut + outage detail until clicked again
  const [lockedIndex, setLockedIndex] = useState<number | null>(null);
  const [lockedOutages, setLockedOutages] = useState<HjksOutage[]>([]);
  const [lockedTime, setLockedTime] = useState<number | null>(null);
  // Unit operating/stopped capacity timeline (all 9 areas; hjks_unit ⋈ hjks_outage)
  const [unitAvailability, setUnitAvailability] = useState<UnitAvailabilityTimeline | null>(null);
  const [unitMetric, setUnitMetric] = useState<UnitCapacityMetric>('operating');
  // Which chart fills the main panel (timeseries mode): OCCTO mix vs fuel capacity
  const [chartTab, setChartTab] = useState<ChartTab>('mix');

  // ── Timeseries data (fetched independently per area, not via context scope) ──
  const [timeseriesOcctoData, setTimeseriesOcctoData] = useState<OcctoAreaData[]>([]);
  const [timeseriesLoading, setTimeseriesLoading] = useState(false);
  const [timeseriesVersion, setTimeseriesVersion] = useState(0);
  const timeseriesAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!startDate || !endDate || !selectedArea) return;
    timeseriesAbortRef.current?.abort();
    const ctrl = new AbortController();
    timeseriesAbortRef.current = ctrl;
    setTimeseriesLoading(true);
    fetchOcctoArea({
      start_date: format(startDate, 'yyyyMMdd'),
      end_date: format(endDate, 'yyyyMMdd'),
      area_name: selectedArea,
    })
      .then((data) => { if (!ctrl.signal.aborted) setTimeseriesOcctoData(data); })
      .catch((err) => { if (!ctrl.signal.aborted) { console.error('Failed to fetch timeseries OCCTO data:', err); setTimeseriesOcctoData([]); } })
      .finally(() => { if (!ctrl.signal.aborted) setTimeseriesLoading(false); });
    return () => ctrl.abort();
  }, [startDate, endDate, selectedArea, timeseriesVersion]);

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
  const didAutoExpandRef = useRef(false);
  useEffect(() => {
    if (pageMode !== 'timeseries' || !startDate || !endDate || !selectedArea) {
      setOutages([]);
      didAutoExpandRef.current = false;
      return;
    }
    outagesFetchRef.current?.abort();
    const ctrl = new AbortController();
    outagesFetchRef.current = ctrl;
    didAutoExpandRef.current = false;
    fetchHjksOutages({
      start_date: format(startDate, 'yyyyMMdd'),
      end_date: format(endDate, 'yyyyMMdd'),
      area_name: selectedArea,
    })
      .then((data) => { if (!ctrl.signal.aborted) setOutages(data); })
      .catch((err) => { if (!ctrl.signal.aborted) { console.error('Failed to fetch outages:', err); setOutages([]); } });
    return () => ctrl.abort();
  }, [pageMode, startDate, endDate, selectedArea]);

  // Auto-expand outage panel the first time outages arrive
  useEffect(() => {
    if (outages.length > 0 && !didAutoExpandRef.current) {
      didAutoExpandRef.current = true;
      setOutagesExpanded(true);
    }
  }, [outages.length]);

  // ── Unit availability timeline (selected area, stacked by fuel; timeseries) ──
  const unitAvailAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (pageMode !== 'timeseries' || !startDate || !endDate || !selectedArea) {
      setUnitAvailability(null);
      return;
    }
    unitAvailAbortRef.current?.abort();
    const ctrl = new AbortController();
    unitAvailAbortRef.current = ctrl;
    fetchUnitAvailabilityTimeline({
      start_date: format(startDate, 'yyyyMMdd'),
      end_date: format(endDate, 'yyyyMMdd'),
      area_name: selectedArea,
      interval_minutes: 30,
    })
      .then((data) => { if (!ctrl.signal.aborted) setUnitAvailability(data); })
      .catch((err) => { if (!ctrl.signal.aborted) { console.error('Failed to fetch unit availability:', err); setUnitAvailability(null); } });
    return () => ctrl.abort();
  }, [pageMode, startDate, endDate, selectedArea]);

  // ── Timeseries: sort the independently-fetched area data ───────────────────
  const areaData: OcctoAreaData[] = useMemo(() => {
    if (!timeseriesOcctoData?.length) return [];
    return [...timeseriesOcctoData].sort((a, b) => a.datetime.localeCompare(b.datetime));
  }, [timeseriesOcctoData]);

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
    () => comparisonData.map((d) => getAreaName(t, d.area.name)),
    [comparisonData, t]
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
    if (activeIndex === null) {
      return pageMode === 'comparison' ? t('globalAvg') : t('periodAvgMix');
    }
    if (pageMode === 'timeseries') {
      const label = timeLabels[activeIndex];
      return label ? `${label.slice(5, 16)}` : t('periodAvgMix');
    } else {
      const label = comparisonLabels[activeIndex];
      return label ? `${label} ${t('periodAvgMix')}` : t('periodAvgMix');
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
        label: getAreaName(t, d.area.name),
        values: GEN_SOURCES.map((s) => d.avg[s.key as string] || 0),
      })),
    [comparisonData]
  );

  const handleRefresh = () => {
    setTimeseriesVersion(v => v + 1);
    refreshData?.() ?? window.location.reload();
  };

  const activeLoading = pageMode === 'timeseries' ? timeseriesLoading : allAreaLoading;
  const hasData = pageMode === 'timeseries' ? areaData.length > 0 : comparisonItems.length > 0;

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0.5, p: 0.5 }}>
        {/* Toolbar */}
        <Box sx={{ flexShrink: 0 }}>
          <DashboardToolbar
            startDate={startDate}
            endDate={endDate}
            dateRangePreset={dateRangePreset}
            onDateChange={commitDateSelection}
            onDateRangePreset={handleDateRangePreset}
            onRefresh={handleRefresh}
            isLoading={timeseriesLoading || allAreaLoading}
          />
        </Box>

        {/* Row A: Page identity strip + mode toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, flexShrink: 0, minHeight: 32 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ElectricalServicesIcon sx={{ fontSize: 16, color: 'var(--primary)' }} />
            <Typography variant="subtitle1" fontWeight={700}>{t('title')}</Typography>
            <Box sx={{ width: '1px', height: 14, backgroundColor: 'var(--card-border)', mx: 0.25 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('subtitle')}</Typography>
          </Box>
          {/* Mode toggle — toolbar-style ButtonBase pair */}
          <Box sx={{ display: 'inline-flex', border: '1px solid var(--card-border)', borderRadius: 1, overflow: 'hidden', height: 28, flexShrink: 0 }}>
            {(['timeseries', 'comparison'] as PageMode[]).map((mode, i) => (
              <React.Fragment key={mode}>
                {i > 0 && <Box sx={{ width: '1px', backgroundColor: 'var(--card-border)', flexShrink: 0 }} />}
                <ButtonBase
                  onClick={() => { if (mode !== pageMode) { setPageMode(mode); setHoverIndex(null); setLockedIndex(null); setLockedTime(null); } }}
                  sx={{
                    px: 1.5,
                    fontSize: 11,
                    fontFamily: 'monospace',
                    height: '100%',
                    whiteSpace: 'nowrap',
                    transition: 'background-color 0.15s, color 0.15s',
                    ...(pageMode === mode ? {
                      backgroundColor: 'rgba(0,255,157,0.12)',
                      color: 'var(--primary)',
                      fontWeight: 700,
                    } : {
                      color: 'var(--muted)',
                    }),
                  }}
                >
                  {mode === 'timeseries' ? t('timeseries') : t('comparison')}
                </ButtonBase>
              </React.Fragment>
            ))}
          </Box>
        </Box>

        {/* Row B: Area chip selector (timeseries mode only) */}
        {pageMode === 'timeseries' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.5, flexWrap: 'wrap', flexShrink: 0 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>{t('selectArea')}</Typography>
            {areas.map((area) => (
              <Chip
                key={area.name}
                label={getAreaName(t, area.name)}
                size="small"
                variant={selectedArea === area.name ? 'filled' : 'outlined'}
                onClick={() => handleAreaChange({ target: { value: area.name } } as any)}
                sx={{
                  flexShrink: 0,
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
        )}

        {/* Row C: Comparison mode context banner */}
        {pageMode === 'comparison' && (
          <Box sx={{ px: 1.5, py: 0.5, flexShrink: 0, borderLeft: '4px solid var(--secondary)', backgroundColor: 'rgba(0,210,255,0.05)', borderRadius: '0 4px 4px 0', mx: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('comparisonHint')}
            </Typography>
          </Box>
        )}

        {/* KPI strip — period aggregates (timeseries mode only) */}
        {pageMode === 'timeseries' && periodStats && (
          <Box sx={{ display: 'flex', gap: 1, px: 0.5, flexWrap: 'wrap', flexShrink: 0 }}>
            <Paper variant="outlined" sx={{ px: 1.5, py: 0.6, borderRadius: 1.5, flex: '1 1 110px', borderTop: '2px solid rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                <BoltIcon sx={{ fontSize: 11, color: '#e0e0e0', opacity: 0.8 }} />
                <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1 }}>{t('avgTotalSupply')}</Typography>
              </Box>
              <Typography sx={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', lineHeight: 1.2 }}>
                {periodStats.avgTotal.toFixed(0)}
                <Box component="span" sx={{ fontSize: 11, fontWeight: 400, opacity: 0.6, ml: 0.4 }}>MW</Box>
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ px: 1.5, py: 0.6, borderRadius: 1.5, flex: '1 1 110px', backgroundColor: 'rgba(0,204,122,0.08)', borderColor: 'rgba(0,204,122,0.3)', borderTop: '2px solid rgba(0,204,122,0.5)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                <EnergySavingsLeafIcon sx={{ fontSize: 11, color: '#00cc7a', opacity: 0.7 }} />
                <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1 }}>{t('avgRenewableShare')}</Typography>
              </Box>
              <Typography sx={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#00cc7a', lineHeight: 1.2 }}>
                {periodStats.avgRenewablePct.toFixed(1)}
                <Box component="span" sx={{ fontSize: 11, fontWeight: 400, opacity: 0.6, ml: 0.4 }}>%</Box>
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ px: 1.5, py: 0.6, borderRadius: 1.5, flex: '1 1 110px', backgroundColor: 'rgba(255,202,40,0.08)', borderColor: 'rgba(255,202,40,0.3)', borderTop: '2px solid rgba(255,202,40,0.5)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                <WbSunnyIcon sx={{ fontSize: 11, color: '#ffca28', opacity: 0.7 }} />
                <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1 }}>{t('solarPeak')}</Typography>
              </Box>
              <Typography sx={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#ffca28', lineHeight: 1.2 }}>
                {periodStats.peakSolar.toFixed(0)}
                <Box component="span" sx={{ fontSize: 11, fontWeight: 400, opacity: 0.6, ml: 0.4 }}>MW</Box>
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ px: 1.5, py: 0.6, borderRadius: 1.5, flex: '1 1 110px', backgroundColor: 'rgba(38,198,218,0.08)', borderColor: 'rgba(38,198,218,0.3)', borderTop: '2px solid rgba(38,198,218,0.5)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                <AirIcon sx={{ fontSize: 11, color: '#26c6da', opacity: 0.7 }} />
                <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1 }}>{t('windPeak')}</Typography>
              </Box>
              <Typography sx={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#26c6da', lineHeight: 1.2 }}>
                {periodStats.peakWind.toFixed(0)}
                <Box component="span" sx={{ fontSize: 11, fontWeight: 400, opacity: 0.6, ml: 0.4 }}>MW</Box>
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Charts area — tabbed active chart + donut detail panel */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 1 }}>
          {!hasData && !activeLoading ? (
            <Alert severity="info" sx={{ mx: 0.5, alignSelf: 'flex-start' }}>
              {t('noData')}
            </Alert>
          ) : activeLoading && !hasData ? (
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
                {/* Header: chart tabs (timeseries) or title (comparison) + metric + legend */}
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                  {pageMode === 'timeseries' ? (
                    <Box sx={{ display: 'inline-flex', border: '1px solid var(--card-border)', borderRadius: 1, overflow: 'hidden', height: 24, flexShrink: 0 }}>
                      {([['mix', t('tabGeneration')], ['capacity', t('tabCapacity')]] as [ChartTab, string][]).map(([tab, label], i) => (
                        <React.Fragment key={tab}>
                          {i > 0 && <Box sx={{ width: '1px', backgroundColor: 'var(--card-border)' }} />}
                          <ButtonBase
                            onClick={() => setChartTab(tab)}
                            sx={{
                              px: 1.5, fontSize: 11, fontFamily: 'monospace', height: '100%', whiteSpace: 'nowrap',
                              ...(chartTab === tab
                                ? { backgroundColor: 'rgba(0,255,157,0.12)', color: 'var(--primary)', fontWeight: 700 }
                                : { color: 'var(--muted)' }),
                            }}
                          >
                            {label}
                          </ButtonBase>
                        </React.Fragment>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      {t('regionAvgMix')}
                    </Typography>
                  )}

                  {/* Metric toggle — capacity tab only: 停止 / 稼動 */}
                  {pageMode === 'timeseries' && chartTab === 'capacity' && (
                    <Box sx={{ display: 'inline-flex', border: '1px solid var(--card-border)', borderRadius: 1, overflow: 'hidden', height: 22, flexShrink: 0 }}>
                      {(['stopped', 'operating'] as UnitCapacityMetric[]).map((m, i) => (
                        <React.Fragment key={m}>
                          {i > 0 && <Box sx={{ width: '1px', backgroundColor: 'var(--card-border)' }} />}
                          <ButtonBase
                            onClick={() => setUnitMetric(m)}
                            sx={{
                              px: 1.25, fontSize: 10, fontFamily: 'monospace', height: '100%', whiteSpace: 'nowrap',
                              ...(unitMetric === m
                                ? { backgroundColor: 'rgba(0,255,157,0.12)', color: 'var(--primary)', fontWeight: 700 }
                                : { color: 'var(--muted)' }),
                            }}
                          >
                            {m === 'stopped' ? t('metricStopped') : t('metricOperating')}
                          </ButtonBase>
                        </React.Fragment>
                      ))}
                    </Box>
                  )}

                  {/* Legend — fuel sources; capacity tab shows only fuels present */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
                    {(pageMode === 'timeseries' && chartTab === 'capacity'
                      ? GEN_SOURCES.filter((s) => (unitAvailability?.keys ?? []).includes(s.key as string))
                      : GEN_SOURCES
                    ).map((s) => (
                      <Box key={s.key as string} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: s.color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1 }}>{t(s.labelKey)}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box sx={{ flex: 1, minHeight: 0 }}>
                  {pageMode === 'timeseries' && chartTab === 'capacity' ? (
                    unitAvailability && unitAvailability.timeline.length > 0 ? (
                      <UnitCapacityTimelineChart
                        timeline={unitAvailability}
                        metric={unitMetric}
                        isDark={isDark}
                      />
                    ) : (
                      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('unitCapacityNoData')}</Typography>
                      </Box>
                    )
                  ) : (
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
                  )}
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
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  ...(lockedIndex !== null && {
                    borderColor: 'rgba(0,255,157,0.45)',
                    boxShadow: '0 0 8px rgba(0,255,157,0.15)',
                  }),
                }}
              >
                {/* Lock indicator */}
                {lockedIndex !== null ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LockIcon sx={{ fontSize: 12, color: 'var(--primary)' }} />
                      <Typography sx={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700 }}>{t('locked')}</Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={t('unlock')}
                      variant="outlined"
                      onClick={() => { setLockedIndex(null); setLockedOutages([]); setLockedTime(null); }}
                      sx={{ fontSize: 10, height: 18, cursor: 'pointer', color: 'var(--primary)', borderColor: 'rgba(0,255,157,0.5)' }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <LockOpenIcon sx={{ fontSize: 11, color: 'var(--muted)' }} />
                    <Typography sx={{ fontSize: 11, color: 'var(--muted)' }}>
                      {t('clickToLock')}
                    </Typography>
                  </Box>
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
                          backgroundColor: 'var(--scrollbar-thumb)',
                          borderRadius: 2,
                        },
                      }}
                    >
                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'warning.main', mb: 0.5 }}>
                        {t('activeOutages', { count: activeOutages.length })}
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
                                  {isEmergency ? t('emergency') : isPlanned ? t('planned') : t('stopped')}
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
          <Paper variant="outlined" sx={{ flexShrink: 0, maxHeight: 280, borderRadius: 1.5, overflow: 'hidden' }}>
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
                {t('outageEvents')}
              </Typography>
              {outages.length > 0 && (
                <Chip
                  size="small"
                  label={outages.length}
                  sx={{
                    height: 18,
                    fontSize: 10,
                    mr: 0.75,
                    backgroundColor: 'rgba(255,152,0,0.2)',
                    color: 'warning.main',
                    border: '1px solid rgba(255,152,0,0.4)',
                  }}
                />
              )}
              <IconButton size="small" sx={{ p: 0.25 }} tabIndex={-1}>
                {outagesExpanded
                  ? <ExpandLessIcon sx={{ fontSize: 18 }} />
                  : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Box>
            <Collapse in={outagesExpanded} timeout={0}>
              <Box sx={{ px: 1.5, pb: 1.5, maxHeight: 240, overflowY: 'auto' }}>
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
