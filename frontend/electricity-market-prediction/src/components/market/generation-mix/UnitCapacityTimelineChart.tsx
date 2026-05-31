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
}

export const UnitCapacityTimelineChart: React.FC<UnitCapacityTimelineChartProps> = ({
    timeline,
    metric,
    isDark,
}) => {
    const colors = useChartColors();
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ReturnType<IChartApi['addCustomSeries']> | null>(null);

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
                    scaleMargins: { top: 0.05, bottom: 0.05 },
                },
                timeScale: {
                    borderVisible: false,
                    timeVisible: true,
                    secondsVisible: false,
                },
            }),
        );
        chartRef.current = chart;

        const series = chart.addCustomSeries(new StackedBarSeries(), {
            priceScaleId: 'right',
            priceFormat: { type: 'volume' },
            lastValueVisible: false,
            priceLineVisible: false,
        } as any);
        seriesRef.current = series as any;

        return () => {
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDark]);

    // ── Push data without recreating the chart ──────────────────────────────────
    useEffect(() => {
        if (!seriesRef.current || !chartRef.current) return;
        seriesRef.current.setData(chartData);
        chartRef.current.timeScale().fitContent();
    }, [chartData]);

    return <Box ref={containerRef} sx={{ width: '100%', height: '100%', minHeight: 160 }} />;
};

export default UnitCapacityTimelineChart;
