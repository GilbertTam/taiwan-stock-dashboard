'use client';

import React, { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactECharts from 'echarts-for-react';
import { GanttChartData } from '@/types/revenueAnalysis';
import { useTheme } from '@/app/ThemeProvider';
import { Box, Typography } from '@mui/material';
import { createMarkAreaForCategoryAxis } from '@/utils/echartsHelpers';

export interface SocLineChartRef { getInstance: () => any }

interface SocLineChartProps {
    data: GanttChartData;
    selectedModels: { id: string | number; name: string; color: string }[];
    timeCategories: string[];
    colors?: { actual?: string };
    height?: number;
    groupId?: string;
}

export const SocLineChart = forwardRef<SocLineChartRef, SocLineChartProps>(({
    data,
    selectedModels,
    timeCategories,
    colors = {},
    height = 220,
    groupId = 'revenue-time-group'
}, ref) => {
    const { darkMode } = useTheme();
    const chartRef = useRef<ReactECharts>(null);
    useImperativeHandle(ref, () => ({
        getInstance: () => chartRef.current?.getEchartsInstance?.()
    }), []);

    const { series } = useMemo(() => {
        const result: { name: string; color: string; data: number[] }[] = [];

        const sortByDatetime = (a: { datetime?: string }, b: { datetime?: string }) => (a.datetime || '').localeCompare(b.datetime || '');

        if (data.optimal && data.optimal.length > 0) {
            const sorted = [...data.optimal].sort(sortByDatetime);
            result.push({
                name: 'Optimal',
                color: colors.actual || '#2196f3',
                data: sorted.map(op => op.soc == null ? (null as any) : op.soc * 100)
            });
        }

        selectedModels.forEach(model => {
            const key = `${model.id}|${model.name}`;
            const ops = data.models[key];
            if (!ops || ops.length === 0) return;
            const hasAnyPrediction = ops.some(op => op.pricePredicted != null);
            if (!hasAnyPrediction) return;
            const sorted = [...ops].sort(sortByDatetime);
            result.push({
                name: model.name,
                color: model.color,
                data: sorted.map(op => op.soc == null ? (null as any) : op.soc * 100)
            });
        });

        return { series: result };
    }, [data, selectedModels, colors.actual]);

    const chartOption = useMemo(() => {
        if (series.length === 0 || timeCategories.length === 0) return {};

        const dataZoom = [
            { type: 'inside' as const, xAxisIndex: 0, group: groupId },
            { type: 'slider' as const, xAxisIndex: 0, group: groupId }
        ];

        return {
            tooltip: {
                trigger: 'axis',
                backgroundColor: darkMode ? 'rgba(40,40,40,0.96)' : 'rgba(255,255,255,0.98)',
                borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                borderWidth: 1,
                padding: [12, 14],
                textStyle: { color: darkMode ? '#e0e0e0' : '#1a1a1a', fontSize: 13 },
                formatter: (params: any[]) => {
                    const sep = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
                    let html = params[0] ? `<div style="font-weight:600;font-size:13px;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid ${sep}">${params[0].axisValue}</div>` : '';
                    params.forEach(p => {
                        const val = p.value != null ? Number(p.value).toFixed(1) : '-';
                        html += `<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:3px 0"><span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:${p.color}"></span><span style="color:${darkMode ? '#aaa' : '#666'}">${p.seriesName}</span></span><b>${val}%</b></div>`;
                    });
                    return html;
                }
            },
            legend: {
                type: 'scroll',
                top: 0,
                left: 'center',
                orient: 'horizontal',
                textStyle: { color: darkMode ? '#fff' : '#000' },
                data: series.map((s) => s.name)
            },
            grid: {
                left: '3%',
                right: '4%',
                top: 40,
                bottom: 48,
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: timeCategories,
                axisLabel: { color: darkMode ? '#ccc' : '#666' }
            },
            yAxis: {
                type: 'value',
                name: 'SoC (%)',
                min: 0,
                max: 100,
                axisLabel: { color: darkMode ? '#ccc' : '#666' },
                splitLine: { lineStyle: { color: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' } }
            },
            series: (() => {
                const { markAreaData, itemStyle } = createMarkAreaForCategoryAxis(timeCategories, darkMode);
                const dayBgSeries = {
                    name: '__dayBg',
                    type: 'line' as const,
                    data: timeCategories.map(() => 0),
                    showSymbol: false,
                    lineStyle: { opacity: 0 },
                    itemStyle: { opacity: 0 },
                    silent: true,
                    z: 0,
                    animation: false,
                    showInLegend: false,
                    tooltip: { show: false },
                    markArea: { silent: true, data: markAreaData, itemStyle }
                };
                const lineSeries = series.map(s => ({
                    name: s.name,
                    type: 'line' as const,
                    data: s.data,
                    itemStyle: { color: s.color },
                    lineStyle: { color: s.color, width: 2 },
                    showSymbol: false
                }));
                return [dayBgSeries, ...lineSeries];
            })(),
            dataZoom
        };
    }, [series, timeCategories, darkMode, groupId]);

    if (series.length === 0) {
        return (
            <Box
                sx={{
                    height,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary'
                }}
                aria-label="Battery State of Charge empty"
            >
                <Typography variant="body2">No data to display</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ height, width: '100%' }}>
            <ReactECharts
                ref={chartRef}
                option={chartOption}
                style={{ height: '100%', width: '100%' }}
                theme={darkMode ? 'dark' : undefined}
            />
        </Box>
    );
});
