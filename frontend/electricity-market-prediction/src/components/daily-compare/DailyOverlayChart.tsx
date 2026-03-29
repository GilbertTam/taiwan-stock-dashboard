'use client';

import React, { useMemo } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { BaseChart } from '@/components/charts/BaseChart';
import { MetricConfig } from './DailyCompareControls';

// ─── Constants ────────────────────────────────────────────────────────────────

// X-axis: 48 labels, one per 30-min コマ
const SLOT_LABELS = Array.from({ length: 48 }, (_, i) => {
    const h = String(Math.floor(i / 2)).padStart(2, '0');
    const m = i % 2 === 0 ? '00' : '30';
    return `${h}:${m}`;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

/** index 0 = newest (opacity 1.0), index total-1 = oldest (opacity 0.25) */
function seriesColor(baseHex: string, index: number, total: number): string {
    if (total <= 1) return hexToRgba(baseHex, 1.0);
    const opacity = 1.0 - (index / (total - 1)) * 0.75;
    return hexToRgba(baseHex, opacity);
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
            barGap: '-100%',       // overlay all dates' bars
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
    /** Map of trade_date (YYYY-MM-DD) → 48-slot value array (index = コマ - 1) */
    seriesData: Map<string, (number | null)[]>;
    /** Dates sorted newest-first */
    sortedDates: string[];
    metric: MetricConfig;
    isLoading: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DailyOverlayChart: React.FC<DailyOverlayChartProps> = ({
    seriesData,
    sortedDates,
    metric,
    isLoading,
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
                top: 16,
                bottom: 56,
                containLabel: true,
            },
            xAxis: {
                type: 'category',
                data: SLOT_LABELS,
                axisLabel: {
                    fontSize: 10,
                    interval: 3, // every 4th label = every 2 hours
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
                splitLine: {
                    lineStyle: { type: 'dashed' },
                },
                axisLine: { show: true },
            },
            legend: {
                data: sortedDates,
                type: 'scroll',
                bottom: 4,
                itemWidth: metric.chartType === 'bar' ? 12 : 20,
                itemHeight: metric.chartType === 'bar' ? 12 : 2,
                textStyle: { fontSize: 11 },
                pageTextStyle: { fontSize: 11 },
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
    }, [sortedDates, seriesData, metric, total]);

    // Empty state after load
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
            {/* Chart title */}
            <Box sx={{ px: 1, py: 0.5, flexShrink: 0 }}>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {metric.label} — 多日疊圖比較（最新日期顏色最亮）
                </Typography>
            </Box>

            <BaseChart
                option={option}
                height="100%"
                showLoading={isLoading}
                sx={{ flex: 1, minHeight: 0 }}
            />
        </Box>
    );
};
