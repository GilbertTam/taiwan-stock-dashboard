'use client';

import React, { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactECharts from 'echarts-for-react';
import { GanttChartData, GanttOperation } from '@/types/revenueAnalysis';
import { useTheme } from '@/app/ThemeProvider';
import { Box } from '@mui/material';
import { createMarkAreaForCategoryAxis } from '@/utils/echartsHelpers';

export interface OperationScheduleChartRef { getInstance: () => any }

interface OperationScheduleChartProps {
    data: GanttChartData;
    selectedModels: { id: string | number; name: string; color: string }[];
    timeCategories: string[];
    height?: number;
    groupId?: string;
}

export const OperationScheduleChart = forwardRef<OperationScheduleChartRef, OperationScheduleChartProps>(({
    data,
    selectedModels,
    timeCategories,
    height = 280,
    groupId = 'revenue-time-group'
}, ref) => {
    const { darkMode } = useTheme();
    const chartRef = useRef<ReactECharts>(null);
    useImperativeHandle(ref, () => ({
        getInstance: () => chartRef.current?.getEchartsInstance?.()
    }), []);

    const { rowNames, heatmapData } = useMemo(() => {
        const names: string[] = [];
        const heatData: [number, number, number][] = [];

        const getActionCode = (action: string) => {
            switch (action) {
                case 'Charge': return 1;
                case 'Spot': return 2;
                case 'Balance': return 3;
                default: return 0;
            }
        };

        let rowIdx = 0;

        const sortByDatetime = (a: { datetime?: string }, b: { datetime?: string }) => (a.datetime || '').localeCompare(b.datetime || '');

        if (data.optimal && data.optimal.length > 0) {
            names.push('Optimal');
            const sorted = [...data.optimal].sort(sortByDatetime);
            sorted.forEach((op, t) => {
                heatData.push([t, rowIdx, getActionCode(op.action)]);
            });
            rowIdx++;
        }

        selectedModels.forEach((model) => {
            const key = `${model.id}|${model.name}`;
            const ops = data.models?.[key];
            if (ops && ops.length > 0) {
                names.push(model.name);
                const sorted = [...ops].sort(sortByDatetime);
                sorted.forEach((op, t) => {
                    heatData.push([t, rowIdx, getActionCode(op.action)]);
                });
                rowIdx++;
            }
        });

        return { rowNames: names, heatmapData: heatData };
    }, [data, selectedModels]);

    const chartOption = useMemo(() => {
        if (rowNames.length === 0 || timeCategories.length === 0) return {};

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
                formatter: (params: any) => {
                    let dataIndex = params?.[0]?.dataIndex;
                    if (dataIndex == null || dataIndex < 0) {
                        const axisVal = params?.[0]?.axisValue;
                        dataIndex = typeof axisVal === 'string' ? timeCategories.indexOf(axisVal) : 0;
                    }
                    if (dataIndex < 0) dataIndex = 0;
                    const timeStr = timeCategories[dataIndex] ?? '';
                    const sep = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
                    let html = `<div style="font-weight:600;font-size:13px;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid ${sep}">${timeStr}</div>`;
                    const atTime = heatmapData.filter((d) => d[0] === dataIndex);
                    atTime.forEach((d) => {
                        const rowIdx = d[1];
                        const rowName = rowNames[rowIdx] ?? '';
                        const actionCode = d[2];
                        const action = actionCode === 1 ? 'Charge' : actionCode === 2 ? 'Spot' : actionCode === 3 ? 'Balance' : 'Idle';
                        html += `<div style="display:flex;justify-content:space-between;gap:16px;padding:3px 0"><span style="color:${darkMode ? '#aaa' : '#666'}">${rowName}</span><b>${action}</b></div>`;
                    });
                    return html;
                }
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
                data: timeCategories,
                splitArea: { show: false },
                axisLabel: { color: darkMode ? '#ccc' : '#666' }
            },
            yAxis: {
                type: 'category',
                data: rowNames,
                inverse: true,
                splitArea: { show: false },
                splitLine: {
                    show: true,
                    lineStyle: { color: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)', width: 1 }
                },
                axisLabel: { color: darkMode ? '#ccc' : '#666' }
            },
            visualMap: {
                type: 'piecewise',
                show: false,
                pieces: [
                    { min: 0, max: 0.5, color: darkMode ? 'rgba(128,128,128,0.2)' : 'rgba(128,128,128,0.15)' },
                    { min: 0.5, max: 1.5, color: darkMode ? 'rgba(46, 125, 50, 0.75)' : 'rgba(46, 125, 50, 0.6)' },
                    { min: 1.5, max: 2.5, color: darkMode ? 'rgba(198, 40, 40, 0.75)' : 'rgba(198, 40, 40, 0.6)' },
                    { min: 2.5, max: 4, color: darkMode ? 'rgba(230, 81, 0, 0.75)' : 'rgba(230, 81, 0, 0.6)' }
                ]
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
                return [
                    dayBgSeries,
                    { type: 'heatmap' as const, data: heatmapData, emphasis: { itemStyle: { borderColor: darkMode ? '#fff' : '#333', borderWidth: 2 } } }
                ];
            })(),
            dataZoom
        };
    }, [rowNames, heatmapData, timeCategories, darkMode, groupId]);

    if (rowNames.length === 0) {
        return (
            <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                No schedule data
            </Box>
        );
    }

    return (
        <Box sx={{ height, width: '100%' }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: 'rgba(46, 125, 50, 0.7)', borderRadius: 0.5 }} />
                    <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Charge</Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: 'rgba(198, 40, 40, 0.7)', borderRadius: 0.5 }} />
                    <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Spot</Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: 'rgba(230, 81, 0, 0.7)', borderRadius: 0.5 }} />
                    <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Balance</Box>
                </Box>
            </Box>
            <ReactECharts
                ref={chartRef}
                option={chartOption}
                style={{ height: height - 36, width: '100%' }}
                theme={darkMode ? 'dark' : undefined}
            />
        </Box>
    );
});
