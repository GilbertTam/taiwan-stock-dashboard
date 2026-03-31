'use client';

import React, { useCallback, useMemo } from 'react';
import { Box, Typography, Alert, Chip } from '@mui/material';
import * as echarts from 'echarts/core';
import { BaseChart } from '@/components/charts/BaseChart';
import { MetricConfig } from './DailyCompareControls';

// ─── Constants ────────────────────────────────────────────────────────────────

// X-axis: 48 labels, one per 30-min コマ
const SLOT_LABELS = Array.from({ length: 48 }, (_, i) => {
    const h = String(Math.floor(i / 2)).padStart(2, '0');
    const m = i % 2 === 0 ? '00' : '30';
    return `${h}:${m}`;
});

// ─── Color Helpers ─────────────────────────────────────────────────────────────

/** Convert a #rrggbb hex string to [h (0–360), s (0–1), l (0–1)] */
function hexToHsl(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) return [0, 0, l];

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h = 0;
    if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else                h = ((r - g) / d + 4) / 6;

    return [h * 360, s, l];
}

function hue2rgb(p: number, q: number, t: number): number {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
}

/** Convert HSL (h: 0–360, s: 0–1, l: 0–1) to css rgb() string */
function hslToRgb(h: number, s: number, l: number): string {
    h = h / 360;
    let r: number, g: number, b: number;
    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

/**
 * index 0 = newest (L=45%, vivid), index = total-1 = oldest (L=72%, faded).
 * Keeps original hue & saturation; only lightness varies.
 */
function seriesColor(baseHex: string, index: number, total: number): string {
    const [h, s] = hexToHsl(baseHex);
    const l = (45 + (index / Math.max(total - 1, 1)) * 27) / 100;
    return hslToRgb(h, Math.max(s, 0.55), l);
}

/** Line width: newest = 2.5px, oldest = 1px */
function seriesWidth(index: number, total: number): number {
    if (total <= 1) return 2.5;
    return Math.max(1, 2.5 - (index / (total - 1)) * 1.5);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSeries(metric: MetricConfig, date: string, data: (number | null)[], index: number, total: number): any {
    const color = seriesColor(metric.baseColor, index, total);
    const zOrder = total - index;

    if (metric.chartType === 'bar') {
        return {
            name: date,
            type: 'bar',
            data,
            barGap: '-100%',
            barCategoryGap: '30%',
            z: zOrder,
            itemStyle: { color },
            emphasis: { itemStyle: { opacity: 1 } },
        };
    }

    return {
        name: date,
        type: 'line',
        step: metric.chartType === 'step' ? 'end' : undefined,
        smooth: false,
        showSymbol: false,
        connectNulls: false,
        data,
        z: zOrder,
        lineStyle: { color, width: seriesWidth(index, total) },
        itemStyle: { color },
        emphasis: { lineStyle: { width: 3 } },
    };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DailyOverlayChartProps {
    /** Map of trade_date (YYYY-MM-DD) → 48-slot value array */
    seriesData: Map<string, (number | null)[]>;
    /** Dates sorted newest-first */
    sortedDates: string[];
    metric: MetricConfig;
    isLoading: boolean;
    /** Optional area label shown as panel title */
    areaLabel?: string;
    /** ECharts group ID for crosshair sync across panels */
    groupId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DailyOverlayChart: React.FC<DailyOverlayChartProps> = ({
    seriesData,
    sortedDates,
    metric,
    isLoading,
    areaLabel,
    groupId,
}) => {
    const total = sortedDates.length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const option = useMemo<any>(() => {
        return {
            backgroundColor: 'transparent',
            animation: false,
            grid: {
                left: 16,
                right: 20,
                top: areaLabel ? 8 : 16,
                bottom: 56,
                containLabel: true,
            },
            xAxis: {
                type: 'category',
                data: SLOT_LABELS,
                axisLabel: {
                    fontSize: 10,
                    interval: 3,
                    rotate: 0,
                },
                axisLine: { show: true },
                splitLine: { show: false },
                name: 'コマ (30分)',
                nameLocation: 'middle',
                nameGap: 32,
                nameTextStyle: { fontSize: 11 },
            },
            yAxis: {
                type: 'value',
                name: metric.unit,
                nameLocation: 'end',
                nameTextStyle: { fontSize: 11, padding: [0, 0, 0, -10] },
                axisLabel: { fontSize: 11 },
                splitLine: { lineStyle: { type: 'dashed' } },
                axisLine: { show: true },
            },
            legend: {
                data: sortedDates,
                type: 'scroll',
                bottom: 4,
                itemWidth: metric.chartType === 'bar' ? 12 : 20,
                itemHeight: metric.chartType === 'bar' ? 12 : 2,
                textStyle: { fontSize: 10 },
                pageTextStyle: { fontSize: 10 },
            },
            tooltip: {
                trigger: 'axis',
                borderWidth: 1,
                axisPointer: {
                    type: 'line',
                    lineStyle: { type: 'dashed' },
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter: (params: any) => {
                    if (!Array.isArray(params) || params.length === 0) return '';
                    const slotLabel = params[0]?.axisValueLabel ?? '';
                    const slotIndex = SLOT_LABELS.indexOf(slotLabel);
                    const timeCode = slotIndex + 1;
                    const unit = metric.unit;

                    const lines = (params as any[])
                        .filter((p: any) => p.value != null)
                        .map((p: any) => {
                            const isBar = metric.chartType === 'bar';
                            const dot = isBar
                                ? `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${p.color};margin-right:5px;vertical-align:middle;"></span>`
                                : `<span style="display:inline-block;width:10px;height:3px;border-radius:2px;background:${p.color};margin-right:5px;vertical-align:middle;"></span>`;
                            return `${dot}<b>${p.seriesName}</b>: ${Number(p.value).toFixed(2)} ${unit}`;
                        })
                        .join('<br/>');

                    return `<div style="font-size:12px;"><b>コマ ${timeCode} (${slotLabel})</b><br/>${lines}</div>`;
                },
            },
            series: sortedDates.map((date, index) =>
                buildSeries(metric, date, seriesData.get(date) ?? new Array(48).fill(null), index, total)
            ),
        };
    }, [sortedDates, seriesData, metric, total, areaLabel]);

    // Connect this chart instance to the ECharts group for crosshair sync
    const handleChartReady = useCallback((instance: any) => {
        if (!groupId) return;
        instance.group = groupId;
        echarts.connect(groupId);
    }, [groupId]);

    if (!isLoading && total === 0) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Alert severity="info" sx={{ maxWidth: 400 }}>
                    <Typography variant="body2">
                        選擇地區與指標後，圖表將顯示多日疊加比較。
                    </Typography>
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {areaLabel && (
                <Box sx={{ px: 1.5, pt: 0.75, pb: 0.25, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                        label={areaLabel}
                        size="small"
                        sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            backgroundColor: `${metric.baseColor}22`,
                            color: metric.baseColor,
                            border: `1px solid ${metric.baseColor}55`,
                        }}
                    />
                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                        {metric.label} · {metric.unit}
                    </Typography>
                </Box>
            )}
            <BaseChart
                option={option}
                height="100%"
                showLoading={isLoading}
                onChartReady={handleChartReady}
                sx={{ flex: 1, minHeight: 0 }}
            />
        </Box>
    );
};
