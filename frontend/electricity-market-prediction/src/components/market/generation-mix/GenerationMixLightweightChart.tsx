'use client';

/**
 * GenerationMixLightweightChart
 *
 * Renders the generation-mix stacked bar chart using TradingView Lightweight Charts,
 * replacing ECharts to eliminate flicker and black-bar artifacts caused by React
 * re-renders triggered by hover events.
 *
 * Two display modes:
 *   timeseries  — X axis is real UTC time, one bar per OcctoAreaData row
 *   comparison  — X axis is fake sequential timestamps mapped to area names
 *
 * Outage annotations (timeseries mode only):
 *   Semi-transparent range bands are drawn behind the bars via OutageRangePrimitive.
 *   Colors are keyed to stop_type: 緊急=red, 計画=blue, others=grey.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  createChart,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import {
  StackedBarSeries,
  type StackedBarData,
} from '@/components/price-chart/plugins/StackedBarSeries';
import { createFullChartOptions, useChartColors, parseToTimestamp, toChartTime } from '@/utils/chartUtils';
import {
  OutageRangePrimitive,
  outageStopTypeColors,
  type OutageRangeZone,
} from './OutageRangePrimitive';
import type { LinkedChartHandle } from '@/hooks/useLinkedTimeScales';
import type { OcctoAreaData, HjksOutage } from '@/types';

const JST = 'Asia/Tokyo';
/** Convert a JST datetime string to a LWC-compatible UTCTimestamp (fake-UTC so the chart axis shows JST wall time). */
const toDisplayTime = (datetime: string): UTCTimestamp =>
  toChartTime(parseToTimestamp(datetime) ?? 0, JST) as UTCTimestamp;

// ─── Generation source colour map (must match page.tsx GEN_SOURCES order) ────
export const GEN_SOURCES: { key: keyof OcctoAreaData; labelKey: string; color: string }[] = [
  { key: 'nuclear_power',                 labelKey: 'sources.nuclear',        color: '#7b61ff' },
  { key: 'thermal',                       labelKey: 'sources.thermal',        color: '#ff7043' },
  { key: 'hydropower',                    labelKey: 'sources.hydro',          color: '#29b6f6' },
  { key: 'geothermal_power',              labelKey: 'sources.geothermal',     color: '#a1887f' },
  { key: 'biomass',                       labelKey: 'sources.biomass',        color: '#8bc34a' },
  { key: 'solar_power_generation_actual', labelKey: 'sources.solar',          color: '#ffca28' },
  { key: 'wind_power_generation_actual',  labelKey: 'sources.wind',           color: '#26c6da' },
  { key: 'pumped_storage',                labelKey: 'sources.pumpedStorage',  color: '#78909c' },
  { key: 'battery_storage',              labelKey: 'sources.batteryStorage', color: '#00cc7a' },
  { key: 'others',                        labelKey: 'sources.others',         color: '#bdbdbd' },
];

// Fake-epoch base for comparison mode: each area index maps to EPOCH_BASE + index * 86400
const EPOCH_BASE = 1704067200 as UTCTimestamp; // 2024-01-01 00:00:00 UTC

export interface GenerationMixLightweightChartProps {
  /** Timeseries mode: sorted OcctoAreaData for the selected area */
  timeseriesData: OcctoAreaData[];
  /** Comparison mode: one entry per area, with pre-computed average values */
  comparisonItems: { label: string; values: number[] }[];
  mode: 'timeseries' | 'comparison';
  isDark: boolean;
  onHoverIndexChange: (index: number | null) => void;
  /** Called with outages active at the hovered time (timeseries mode only) */
  onHoverOutagesChange?: (outages: HjksOutage[]) => void;
  /** Called on click with bar index + click timestamp + active outages — used for locking */
  onClickChange?: (index: number | null, time: number | null, outages: HjksOutage[]) => void;
  /** Outage events for annotation bands (timeseries mode only) */
  outages?: HjksOutage[];
  /** UTC-seconds timestamp of the locked bar — crosshair is pinned here while set */
  lockedBarTime?: number | null;
  /** When false, only fit the chart once per instance (the linked layout drives the window after). */
  autoFit?: boolean;
  /** When false, hide this chart's time axis (the linked bottom chart owns the shared axis). */
  showTimeAxis?: boolean;
  /** Exposes the chart + main series so the linked layout can sync time-scale & crosshair. */
  onChartReady?: (handle: LinkedChartHandle | null) => void;
  /** Operable-capacity ceiling overlay (timeseries only): operating capacity (MW) per timestamp.
   *  Drawn as a dashed line on the same price scale so outage-driven dips show against generation. */
  ceilingData?: { datetime: string; value: number }[];
  /** Colour for the ceiling line + its legend swatch. */
  ceilingColor?: string;
  /** Title shown on the ceiling line. */
  ceilingLabel?: string;
}

/** Convert HjksOutage array to OutageRangeZone array for the primitive */
function outagesToZones(outages: HjksOutage[]): OutageRangeZone[] {
  return outages
    .filter((o) => o.start_datetime && o.end_datetime)
    .map((o) => {
      const startTime: number = Number(toDisplayTime(o.start_datetime));
      const endTime: number = Number(toDisplayTime(o.end_datetime));
      if (!isFinite(startTime) || !isFinite(endTime) || endTime <= startTime) return null;
      const { fillColor, edgeColor } = outageStopTypeColors(o.stop_type ?? '');
      const capText = o.down_capacity != null ? ` ↓${Math.round(o.down_capacity)}MW` : '';
      const raw = `${o.name} ${o.unit_name}${capText}`;
      const label = raw.length > 22 ? raw.slice(0, 21) + '…' : raw;
      return { startTime, endTime, fillColor, edgeColor, label };
    })
    .filter((z): z is OutageRangeZone => z !== null);
}

export const GenerationMixLightweightChart: React.FC<GenerationMixLightweightChartProps> = ({
  timeseriesData,
  comparisonItems,
  mode,
  isDark,
  onHoverIndexChange,
  onHoverOutagesChange,
  onClickChange,
  outages = [],
  lockedBarTime,
  autoFit = true,
  showTimeAxis = true,
  onChartReady,
  ceilingData,
  ceilingColor = '#90a4ae',
  ceilingLabel = '',
}) => {
  const colors = useChartColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi['addCustomSeries']> | null>(null);
  const outagesPrimRef = useRef<OutageRangePrimitive | null>(null);
  // Operable-capacity ceiling line (timeseries mode only).
  const ceilingSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  // Whether this chart instance has been fitted once (so autoFit=false fits only on create).
  const didFitRef = useRef(false);
  // Stable ref to onChartReady so it never re-creates the chart.
  const onChartReadyRef = useRef(onChartReady);
  onChartReadyRef.current = onChartReady;
  // Keep a snapshot of the current chart data for crosshair index lookup
  const chartDataRef = useRef<StackedBarData[]>([]);
  // Stable ref to the current outages for crosshair lookup (no re-subscribe needed)
  const outagesRef = useRef<HjksOutage[]>(outages);
  outagesRef.current = outages;
  // Stable ref to locked timestamp — updated every render, no re-subscribe needed
  const lockedBarTimeRef = useRef<number | null>(lockedBarTime ?? null);
  lockedBarTimeRef.current = lockedBarTime ?? null;
  // Stable refs to callbacks (avoids stale closures in subscribe)
  const onHoverRef = useRef(onHoverIndexChange);
  onHoverRef.current = onHoverIndexChange;
  const onHoverOutagesRef = useRef(onHoverOutagesChange);
  onHoverOutagesRef.current = onHoverOutagesChange;
  const onClickRef = useRef(onClickChange);
  onClickRef.current = onClickChange;

  // ── Build chart data ──────────────────────────────────────────────────────
  const chartData: StackedBarData[] = useMemo(() => {
    if (mode === 'timeseries') {
      return timeseriesData.map((d) => ({
        time: toDisplayTime(d.datetime),
        items: GEN_SOURCES.map((s) => ({
          value: Math.max(0, Number((d as any)[s.key]) || 0),
          color: s.color,
        })),
      }));
    } else {
      return comparisonItems.map((item, index) => ({
        time: (EPOCH_BASE + index * 86400) as UTCTimestamp,
        items: GEN_SOURCES.map((s, si) => ({
          value: Math.max(0, item.values[si] || 0),
          color: s.color,
        })),
      }));
    }
  }, [mode, timeseriesData, comparisonItems]);

  // ── Operable-capacity ceiling line data (timeseries mode only) ────────────
  const ceilingDisplay = useMemo(() => {
    if (mode !== 'timeseries' || !ceilingData?.length) return [];
    const seen = new Set<number>();
    const pts: { time: UTCTimestamp; value: number }[] = [];
    for (const c of ceilingData) {
      const t = Number(toDisplayTime(c.datetime));
      if (!Number.isFinite(t) || seen.has(t)) continue;
      seen.add(t);
      pts.push({ time: t as UTCTimestamp, value: c.value });
    }
    pts.sort((a, b) => Number(a.time) - Number(b.time));
    return pts;
  }, [mode, ceilingData]);
  const ceilingDisplayRef = useRef(ceilingDisplay);
  ceilingDisplayRef.current = ceilingDisplay;
  const ceilingColorRef = useRef(ceilingColor);
  ceilingColorRef.current = ceilingColor;
  const ceilingLabelRef = useRef(ceilingLabel);
  ceilingLabelRef.current = ceilingLabel;

  // ── Create / destroy chart when mode or theme changes ────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const comparisonLabels = comparisonItems.map((c) => c.label);

    const chart = createChart(
      containerRef.current,
      createFullChartOptions(colors, isDark, {
        autoSize: true,
        rightPriceScale: {
          borderVisible: false,
          minimumWidth: 72, // keep aligned with the linked OutageTimelineChart's price scale
          scaleMargins: { top: 0.05, bottom: 0.05 },
        },
        timeScale: {
          borderVisible: false,
          visible: showTimeAxis,
          timeVisible: mode === 'timeseries',
          secondsVisible: false,
          ...(mode === 'comparison' && {
            fixLeftEdge: true,
            fixRightEdge: true,
            tickMarkFormatter: (time: UTCTimestamp) => {
              const index = Math.round((time - EPOCH_BASE) / 86400);
              return comparisonLabels[index] ?? '';
            },
          }),
        },
        // Comparison mode uses fake timestamps — hide the date tooltip on the time axis
        ...(mode === 'comparison' && {
          crosshair: { vertLine: { labelVisible: false } },
        }),
      })
    );
    chartRef.current = chart;
    didFitRef.current = false;

    const instance = new StackedBarSeries();
    const series = chart.addCustomSeries(instance, {
      priceScaleId: 'right',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    } as any);
    seriesRef.current = series as any;

    // Attach outage range primitive (bands behind bars)
    const outagesPrim = new OutageRangePrimitive();
    (series as any).attachPrimitive(outagesPrim);
    outagesPrimRef.current = outagesPrim;

    // Operable-capacity ceiling line (timeseries mode only) — same price scale as the bars,
    // so an outage-driven dip in the ceiling shows directly against the generation stack.
    if (mode === 'timeseries') {
      const ceilingSeries = chart.addSeries(LineSeries, {
        color: ceilingColorRef.current,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceScaleId: 'right',
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        title: ceilingLabelRef.current,
      });
      ceilingSeries.setData(ceilingDisplayRef.current);
      ceilingSeriesRef.current = ceilingSeries;
    }

    // Data is always set by the chartData effect below — no stale init here.

    // Helper: snap crosshair to the locked bar position
    const snapCrosshairToLocked = () => {
      const lockedT = lockedBarTimeRef.current;
      if (lockedT === null) return false;
      const lockedData = chartDataRef.current.find((d) => (d as any).time === lockedT);
      if (!lockedData || !seriesRef.current) return false;
      const totalPrice = (lockedData.items as any[]).reduce((s: number, item: any) => s + (item.value || 0), 0);
      chart.setCrosshairPosition(totalPrice, lockedT as UTCTimestamp, seriesRef.current as any);
      return true;
    };

    // Hover detection — fires on every crosshair move, no React re-renders
    chart.subscribeCrosshairMove((param: any) => {
      const lockedT = lockedBarTimeRef.current;

      if (!param.point || param.time === undefined) {
        // Mouse left the chart — if locked, restore crosshair at locked position
        if (lockedT !== null) {
          snapCrosshairToLocked();
          return;
        }
        onHoverRef.current(null);
        onHoverOutagesRef.current?.([]);
        return;
      }

      // If locked and mouse moved to a different bar, snap back
      if (lockedT !== null && param.time !== lockedT) {
        snapCrosshairToLocked();
        return; // don't update hover state while locked
      }

      const idx = chartDataRef.current.findIndex((d) => (d as any).time === param.time);
      onHoverRef.current(idx >= 0 ? idx : null);

      // Find outages active at the hovered UTC timestamp
      const t = param.time as number;
      const active = outagesRef.current.filter((o) => {
        if (!o.start_datetime || !o.end_datetime) return false;
        const start = toDisplayTime(o.start_datetime);
        const end   = toDisplayTime(o.end_datetime);
        return start <= t && t <= end;
      });
      onHoverOutagesRef.current?.(active);
    });

    // Click → lock/unlock the displayed time slot
    chart.subscribeClick((param: any) => {
      if (!param.point || param.time === undefined) {
        onClickRef.current?.(null, null, []);
        return;
      }
      const idx = chartDataRef.current.findIndex((d) => (d as any).time === param.time);
      const t = param.time as number;
      const active = outagesRef.current.filter((o) => {
        if (!o.start_datetime || !o.end_datetime) return false;
        const start = toDisplayTime(o.start_datetime);
        const end   = toDisplayTime(o.end_datetime);
        return start <= t && t <= end;
      });
      onClickRef.current?.(idx >= 0 ? idx : null, t, active);
    });

    // Expose chart + series (and the stacked total at a time) for linked sync.
    const priceAtTime = (time: number): number | null => {
      const d = chartDataRef.current.find((x: any) => x.time === time);
      if (!d) return null;
      return (d.items as any[]).reduce((s: number, it: any) => s + (it.value || 0), 0);
    };
    onChartReadyRef.current?.({ chart, series: series as any, priceAtTime });

    return () => {
      onChartReadyRef.current?.(null);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      outagesPrimRef.current = null;
      ceilingSeriesRef.current = null;
    };
    // Recreate on theme flip or mode change only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isDark]);

  // ── Update bar data without recreating the chart ──────────────────────────
  useEffect(() => {
    chartDataRef.current = chartData;
    if (!seriesRef.current || !chartRef.current) return;
    seriesRef.current.setData(chartData);
    // autoFit=false (linked layout) fits only once per instance so it doesn't fight the linked window.
    if (autoFit || !didFitRef.current) {
      chartRef.current.timeScale().fitContent();
      didFitRef.current = true;
    }
  }, [chartData, autoFit]);

  // ── Update operable-capacity ceiling line (no chart recreation) ───────────
  useEffect(() => {
    ceilingSeriesRef.current?.setData(ceilingDisplay);
  }, [ceilingDisplay]);

  useEffect(() => {
    ceilingSeriesRef.current?.applyOptions({ color: ceilingColor, title: ceilingLabel });
  }, [ceilingColor, ceilingLabel]);

  // ── Clear crosshair when lock is released ────────────────────────────────
  useEffect(() => {
    if (lockedBarTime == null && chartRef.current) {
      chartRef.current.clearCrosshairPosition();
    }
  }, [lockedBarTime]);

  // ── Update outage range bands ─────────────────────────────────────────────
  useEffect(() => {
    const prim = outagesPrimRef.current;
    if (!prim) return;
    // Comparison mode uses fake timestamps — outage bands would be meaningless
    if (mode !== 'timeseries') {
      prim.setZones([]);
      return;
    }
    prim.setZones(outagesToZones(outages));
  }, [outages, mode]);

  return <Box ref={containerRef} sx={{ width: '100%', height: '100%', minHeight: 180 }} />;
};

export default GenerationMixLightweightChart;
