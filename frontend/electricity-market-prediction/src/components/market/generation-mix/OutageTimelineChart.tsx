'use client';

/**
 * OutageTimelineChart
 *
 * Bottom chart of the linked generation-mix view: a Gantt-style timeline of HJKS
 * outage events (one band per event, lane-packed, coloured by stop_type) rendered with
 * TradingView Lightweight Charts so its time axis can be drag-linked to the top OCCTO
 * stacked chart. Bands are drawn by OutageBandPrimitive; an invisible flat baseline
 * series establishes the time scale (so timeToCoordinate works) and is given the same
 * price-scale minimum width as the top chart so the two plot areas align horizontally.
 *
 * Time conversion follows the project rule: JST datetime string → parseToTimestamp →
 * toChartTime('Asia/Tokyo') (fake-UTC so the axis shows JST wall time). Never new Date().
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Box } from '@mui/material';
import { format } from 'date-fns';
import {
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { createFullChartOptions, useChartColors, parseToTimestamp, toChartTime } from '@/utils/chartUtils';
import {
  OutageBandPrimitive,
  computeOutageLanes,
  outageStopTypeColors,
  type OutageBandZone,
} from './OutageBandPrimitive';
import type { LinkedChartHandle } from '@/hooks/useLinkedTimeScales';
import type { HjksOutage } from '@/types';

const JST = 'Asia/Tokyo';
const toDisplayTime = (datetime: string): UTCTimestamp =>
  toChartTime(parseToTimestamp(datetime) ?? 0, JST) as UTCTimestamp;

/** Right price-scale min width — kept identical to the top chart so plot areas align. */
const PRICE_SCALE_MIN_WIDTH = 72;

export interface OutageTimelineChartProps {
  outages: HjksOutage[];
  /** Datetimes of the top chart's bars — used as the baseline so both share a time domain. */
  baselineTimes: string[];
  startDate: Date | null;
  endDate: Date | null;
  isDark: boolean;
  /** When false, only fit the chart once per instance (linked layout drives the window after). */
  autoFit?: boolean;
  onChartReady?: (handle: LinkedChartHandle | null) => void;
}

export const OutageTimelineChart: React.FC<OutageTimelineChartProps> = ({
  outages,
  baselineTimes,
  startDate,
  endDate,
  isDark,
  autoFit = true,
  onChartReady,
}) => {
  const colors = useChartColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const primRef = useRef<OutageBandPrimitive | null>(null);
  const didFitRef = useRef(false);

  // Stable ref to onChartReady so it never re-creates the chart.
  const onChartReadyRef = useRef(onChartReady);
  onChartReadyRef.current = onChartReady;

  // ── Invisible flat baseline (value 0) so the time scale + price-scale width exist ──
  const baselineData = useMemo(() => {
    const seen = new Set<number>();
    const pts: { time: UTCTimestamp; value: number }[] = [];
    for (const dt of baselineTimes) {
      const t = Number(toDisplayTime(dt));
      if (!Number.isFinite(t) || seen.has(t)) continue;
      seen.add(t);
      pts.push({ time: t as UTCTimestamp, value: 0 });
    }
    pts.sort((a, b) => Number(a.time) - Number(b.time));
    if (pts.length === 0 && startDate && endDate) {
      // Fallback span: two points across the selected range.
      const a = Number(toDisplayTime(`${format(startDate, 'yyyy-MM-dd')} 00:00:00`));
      const b = Number(toDisplayTime(`${format(endDate, 'yyyy-MM-dd')} 23:00:00`));
      if (Number.isFinite(a)) pts.push({ time: a as UTCTimestamp, value: 0 });
      if (Number.isFinite(b) && b !== a) pts.push({ time: b as UTCTimestamp, value: 0 });
    }
    return pts;
  }, [baselineTimes, startDate, endDate]);
  const baselineDataRef = useRef(baselineData);
  baselineDataRef.current = baselineData;

  // ── Outage bands (lane-packed) ──────────────────────────────────────────────
  const zones: OutageBandZone[] = useMemo(() => {
    const { lanes, totalLanes } = computeOutageLanes(outages);
    return lanes.map(({ outage, laneIndex }) => {
      const startTime = Number(toDisplayTime(outage.start_datetime));
      const endTime = Number(toDisplayTime(outage.end_datetime));
      const { fillColor, edgeColor } = outageStopTypeColors(outage.stop_type ?? '');
      const cap = outage.down_capacity != null ? ` ↓${Math.round(outage.down_capacity)}MW` : '';
      const raw = `${outage.name ?? ''} ${outage.unit_name ?? ''}${cap}`.trim();
      const label = raw.length > 28 ? raw.slice(0, 27) + '…' : raw;
      return { startTime, endTime, laneIndex, totalLanes, fillColor, edgeColor, label };
    });
  }, [outages]);
  const zonesRef = useRef(zones);
  zonesRef.current = zones;

  // ── Create / destroy chart on theme flip ─────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(
      containerRef.current,
      createFullChartOptions(colors, isDark, {
        autoSize: true,
        rightPriceScale: {
          borderVisible: false,
          minimumWidth: PRICE_SCALE_MIN_WIDTH,
          scaleMargins: { top: 0.05, bottom: 0.05 },
        },
        timeScale: {
          borderVisible: false,
          timeVisible: true,
          secondsVisible: false,
        },
        // Gantt lanes are not prices — hide the horizontal crosshair line/label.
        crosshair: {
          horzLine: { visible: false, labelVisible: false },
        },
      }),
    );
    chartRef.current = chart;

    const series = chart.addSeries(LineSeries, {
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
      priceFormat: { type: 'volume' },
    });
    seriesRef.current = series;
    series.setData(baselineDataRef.current);

    const prim = new OutageBandPrimitive();
    (series as any).attachPrimitive(prim);
    primRef.current = prim;
    prim.setZones(zonesRef.current);

    didFitRef.current = false;
    chart.timeScale().fitContent();
    didFitRef.current = true;

    onChartReadyRef.current?.({ chart, series });

    return () => {
      onChartReadyRef.current?.(null);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      primRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  // ── Update baseline data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    seriesRef.current.setData(baselineData);
    if (autoFit || !didFitRef.current) {
      chartRef.current.timeScale().fitContent();
      didFitRef.current = true;
    }
  }, [baselineData, autoFit]);

  // ── Update outage bands ─────────────────────────────────────────────────────
  useEffect(() => {
    primRef.current?.setZones(zones);
  }, [zones]);

  return <Box ref={containerRef} sx={{ width: '100%', height: '100%', minHeight: 120 }} />;
};

export default OutageTimelineChart;
