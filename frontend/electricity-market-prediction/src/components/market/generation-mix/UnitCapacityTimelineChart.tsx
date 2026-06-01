'use client';

/**
 * UnitCapacityTimelineChart
 *
 * Fuel-stacked timeline of fleet operating/stopped capacity for the selected area,
 * derived from the hjks_unit master registry joined with hjks_outage events
 * (see backend /market-info/hjks-unit-availability). Each timestamp bucket stacks
 * one band per fuel type, reusing the OCCTO generation-mix source colours so the
 * two charts are directly comparable. The active metric selects which capacity:
 *   'stopped'   (停止) — capacity removed by overlapping outages
 *   'operating' (稼動) — available capacity = total − stopped
 *
 * Rendered with TradingView Lightweight Charts using the shared StackedBarSeries
 * plugin (same as GenerationMixLightweightChart) so bars align on the time axis.
 * `autoSize: true` makes the canvas track its container.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Box } from '@mui/material';
import {
    createChart,
    type IChartApi,
    type UTCTimestamp,
} from 'lightweight-charts';
import {
    StackedBarSeries,
    type StackedBarData,
} from '@/components/price-chart/plugins/StackedBarSeries';
import { createFullChartOptions, useChartColors, parseToTimestamp, toChartTime } from '@/utils/chartUtils';
import { GEN_SOURCES } from './GenerationMixLightweightChart';
import type { LinkedChartHandle } from '@/hooks/useLinkedTimeScales';
import type { UnitAvailabilityTimeline } from '@/types';

const JST = 'Asia/Tokyo';
/** JST datetime string → LWC UTCTimestamp (fake-UTC so the axis shows JST wall time). */
const toDisplayTime = (datetime: string): UTCTimestamp =>
    toChartTime(parseToTimestamp(datetime) ?? 0, JST) as UTCTimestamp;

/** fuel-category key → colour, reused from the OCCTO generation-mix sources. */
const FUEL_COLOR: Record<string, string> = Object.fromEntries(
    GEN_SOURCES.map((s) => [s.key as string, s.color]),
);

export type UnitCapacityMetric = 'stopped' | 'operating';

export interface UnitCapacityTimelineChartProps {
    timeline: UnitAvailabilityTimeline | null;
    metric: UnitCapacityMetric;
    isDark: boolean;
    /** When false, only fit the chart once per instance (the linked layout drives the window after). */
    autoFit?: boolean;
    /** When false, hide this chart's time axis (the linked bottom chart owns the shared axis). */
    showTimeAxis?: boolean;
    /** Exposes the chart + main series so the linked layout can sync time-scale & crosshair. */
    onChartReady?: (handle: LinkedChartHandle | null) => void;
}

export const UnitCapacityTimelineChart: React.FC<UnitCapacityTimelineChartProps> = ({
    timeline,
    metric,
    isDark,
    autoFit = true,
    showTimeAxis = true,
    onChartReady,
}) => {
    const colors = useChartColors();
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ReturnType<IChartApi['addCustomSeries']> | null>(null);
    const chartDataRef = useRef<StackedBarData[]>([]);
    const didFitRef = useRef(false);
    const onChartReadyRef = useRef(onChartReady);
    onChartReadyRef.current = onChartReady;

    // ── Build fuel-stacked bar data for the selected metric ─────────────────────
    const chartData: StackedBarData[] = useMemo(() => {
        if (!timeline) return [];
        const keys = timeline.keys;
        return timeline.timeline.map((entry) => ({
            time: toDisplayTime(entry.datetime),
            items: keys.map((k) => {
                const dp = entry.data[k];
                const value = !dp
                    ? 0
                    : metric === 'stopped'
                        ? dp.stopped_capacity_mw
                        : dp.available_capacity_mw;
                return { value: Math.max(0, value), color: FUEL_COLOR[k] ?? '#bdbdbd' };
            }),
        }));
    }, [timeline, metric]);

    // ── Create / destroy chart on theme flip ────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return;

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
                    timeVisible: true,
                    secondsVisible: false,
                },
            }),
        );
        chartRef.current = chart;
        didFitRef.current = false;

        const series = chart.addCustomSeries(new StackedBarSeries(), {
            priceScaleId: 'right',
            priceFormat: { type: 'volume' },
            lastValueVisible: false,
            priceLineVisible: false,
        } as any);
        seriesRef.current = series as any;

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
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDark]);

    // ── Push data without recreating the chart ──────────────────────────────────
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

    return <Box ref={containerRef} sx={{ width: '100%', height: '100%', minHeight: 160 }} />;
};

export default UnitCapacityTimelineChart;
