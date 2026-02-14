'use client';

import React, { useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import ReactECharts from 'echarts-for-react';
import { GanttOperation, GanttChartData } from '@/types/revenueAnalysis';
import { useTheme } from '@/app/ThemeProvider';
import { Box, Typography } from '@mui/material';
import { createMarkAreaForCategoryAxis } from '@/utils/echartsHelpers';

export interface ScheduleItem {
    id: string;
    name: string;
    color: string;
    data: GanttOperation[];
}

export interface PriceOperationChartRef { getInstance: () => any }

interface PriceOperationChartProps {
    /** Single-schedule mode (legacy): pass data directly */
    data?: GanttOperation[];
    /** Multi-schedule mode: pass full ganttData + selectedModels */
    ganttData?: GanttChartData | null;
    selectedModels?: { id: string | number; name: string; color: string }[];
    colors?: { actual?: string };
    /** Precomputed time categories (for X-axis sync); if not provided, derived from data */
    timeCategories?: string[];
    title?: string;
    height?: number;
    /** ECharts group id for axis linking */
    groupId?: string;
}

export const PriceOperationChart = forwardRef<PriceOperationChartRef, PriceOperationChartProps>(({
    data: legacyData,
    ganttData,
    selectedModels = [],
    colors = {},
    timeCategories: externalTimes,
    title = 'Price & Operation Analysis',
    height = 350,
    groupId = 'revenue-time-group'
}, ref) => {
    const { darkMode } = useTheme();
    const chartRef = useRef<ReactECharts>(null);
    useImperativeHandle(ref, () => ({
        getInstance: () => chartRef.current?.getEchartsInstance?.()
    }), []);

    const { schedules, times, markAreaSource } = useMemo(() => {
        const result: { schedules: ScheduleItem[]; times: string[]; markAreaSource: GanttOperation[] } = {
            schedules: [],
            times: [],
            markAreaSource: []
        };

        const sortByDatetime = (a: GanttOperation, b: GanttOperation) => (a.datetime || '').localeCompare(b.datetime || '');

        if (legacyData && legacyData.length > 0) {
            const sorted = [...legacyData].sort(sortByDatetime);
            result.times = externalTimes ?? sorted.map(d => (d.datetime ? d.datetime.substring(5, 16).replace('T', ' ') : ''));
            result.schedules = [{
                id: 'single',
                name: 'Current',
                color: colors.actual || '#2196f3',
                data: sorted
            }];
            result.markAreaSource = sorted;
            return result;
        }

        if (!ganttData) return result;

        const optimal = ganttData.optimal || [];
        const optimalSorted = [...optimal].sort(sortByDatetime);
        const timesArr = externalTimes ?? (optimalSorted.length > 0
            ? optimalSorted.map(d => (d.datetime ? d.datetime.substring(5, 16).replace('T', ' ') : ''))
            : (() => {
                const firstKey = Object.keys(ganttData.models)[0];
                const first = firstKey ? ganttData.models[firstKey] : [];
                return [...first].sort(sortByDatetime).map(d => (d.datetime ? d.datetime.substring(5, 16).replace('T', ' ') : ''));
            })());

        result.times = timesArr;
        result.markAreaSource = optimalSorted.length > 0 ? optimalSorted : (() => {
            const firstKey = Object.keys(ganttData.models)[0];
            return firstKey ? [...ganttData.models[firstKey]].sort(sortByDatetime) : [];
        })();

        if (optimal.length > 0) {
            result.schedules.push({
                id: 'optimal',
                name: 'Optimal',
                color: colors.actual || '#ff4d4f',
                data: optimalSorted
            });
        }

        selectedModels.forEach(model => {
            const key = `${model.id}|${model.name}`;
            const ops = ganttData.models[key];
            if (ops && ops.length > 0) {
                result.schedules.push({
                    id: key,
                    name: model.name,
                    color: model.color,
                    data: [...ops].sort(sortByDatetime)
                });
            }
        });

        return result;
    }, [legacyData, ganttData, selectedModels, colors.actual, externalTimes]);

    const actualColor = colors.actual || '#2196f3';

    const chartOption = useMemo(() => {
        if (times.length === 0) return {};

        const actualPrices = schedules[0] ? schedules[0].data.map(d => d.priceActual) : [];

        const optimalName = schedules[0]?.id === 'optimal' ? 'Optimal' : 'Actual Price';
        const legendData: string[] = [optimalName];
        const priceSeries: any[] = [
            {
                name: optimalName,
                type: 'line',
                data: actualPrices,
                itemStyle: { color: actualColor },
                lineStyle: { width: 2 },
                areaStyle: schedules.length > 1 ? { opacity: 0.08, color: actualColor } : undefined,
                showSymbol: false
            }
        ];

        schedules.forEach((s, idx) => {
            if (s.id === 'optimal') return;
            const predData = s.data.map(d => d.pricePredicted ?? d.price);
            const seriesName = `Pred: ${s.name}`;
            legendData.push(seriesName);
            priceSeries.push({
                name: seriesName,
                type: 'line',
                data: predData,
                itemStyle: { color: s.color },
                lineStyle: { type: 'dashed', width: 2 },
                showSymbol: false,
                z: 10 + idx
            });
        });

        const dataZoom = groupId ? [
            { type: 'inside' as const, xAxisIndex: 0, group: groupId },
            { type: 'slider' as const, xAxisIndex: 0, group: groupId }
        ] : undefined;

        return {
            tooltip: {
                trigger: 'axis',
                backgroundColor: darkMode ? 'rgba(40,40,40,0.96)' : 'rgba(255,255,255,0.98)',
                borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                borderWidth: 1,
                padding: [12, 14],
                textStyle: { color: darkMode ? '#e0e0e0' : '#1a1a1a', fontSize: 13 },
                formatter: (params: any[]) => {
                    const idx = params[0].dataIndex;
                    const item = schedules[0]?.data[idx] ?? markAreaSource[idx];
                    if (!item) return '';
                    const sep = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
                    let html = `<div style="font-weight:600;font-size:13px;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid ${sep}">${times[idx]}</div>`;
                    const firstLabel = schedules[0]?.id === 'optimal' ? 'Optimal' : 'Actual Price';
                    const firstVal = item.priceActual != null ? item.priceActual.toFixed(2) : '-';
                    html += `<div style="display:flex;justify-content:space-between;gap:16px;padding:3px 0"><span style="color:${darkMode ? '#aaa' : '#666'}">${firstLabel}</span><b>${firstVal} JPY</b></div>`;
                    schedules.forEach(s => {
                        if (s.id === 'optimal') return;
                        const d = s.data[idx];
                        const pred = d?.pricePredicted != null ? d.pricePredicted.toFixed(2) : (d?.price != null ? d.price.toFixed(2) : '-');
                        html += `<div style="display:flex;justify-content:space-between;gap:16px;padding:3px 0"><span style="color:${darkMode ? '#aaa' : '#666'}">Pred ${s.name}</span><b>${pred} JPY</b></div>`;
                    });
                    return html;
                }
            },
            legend: {
                type: 'scroll',
                data: legendData,
                top: 8,
                left: 'center',
                orient: 'horizontal',
                textStyle: { color: darkMode ? '#fff' : '#000' }
            },
            grid: {
                left: '3%',
                right: '4%',
                top: 64,
                bottom: groupId ? 48 : '12%',
                containLabel: true
            },
            dataZoom,
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: times,
                axisLabel: { color: darkMode ? '#ccc' : '#666' }
            },
            yAxis: {
                type: 'value',
                name: 'Price (JPY/kWh)',
                nameLocation: 'middle',
                nameGap: 40,
                boundaryGap: ['0%', '8%'],
                axisLabel: { color: darkMode ? '#ccc' : '#666' },
                splitLine: {
                    lineStyle: { color: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                }
            },
            series: (() => {
                const { markAreaData, itemStyle } = createMarkAreaForCategoryAxis(times, darkMode);
                const dayBgSeries = {
                    name: '__dayBg',
                    type: 'line' as const,
                    data: times.map(() => 0),
                    showSymbol: false,
                    lineStyle: { opacity: 0 },
                    itemStyle: { opacity: 0 },
                    silent: true,
                    z: 0,
                    animation: false,
                    showInLegend: false,
                    markArea: { silent: true, data: markAreaData, itemStyle }
                };
                return [dayBgSeries, ...priceSeries];
            })()
        };
    }, [schedules, times, markAreaSource, darkMode, groupId, actualColor]);

    if (times.length === 0 && !legacyData?.length) {
        return (
            <Box sx={{ width: '100%', mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 1, color: darkMode ? '#fff' : '#000' }}>
                    {title}
                </Typography>
                <Box sx={{ height: height - 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                    <Typography variant="body2">No data to display</Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', mt: 2 }}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 0.5, color: darkMode ? '#fff' : '#000' }}>
                {title}
            </Typography>
            <Box sx={{ height: height - 40, width: '100%', overflow: 'visible' }}>
                <ReactECharts
                    ref={chartRef}
                    option={chartOption}
                    style={{ height: '100%', width: '100%' }}
                    theme={darkMode ? 'dark' : undefined}
                />
            </Box>
        </Box>
    );
});
