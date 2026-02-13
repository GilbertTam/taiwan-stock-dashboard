import React, { useMemo, useState } from 'react';
import { Box, Typography, useTheme, Card, CardContent, Grid, Divider, Paper, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { BaseChart } from '@/shared/components/charts/BaseChart';
import { OptimizationResult, GanttChartData, ViewOptions } from '@/types/revenueAnalysis';
import { RevenueGanttChart } from './RevenueGanttChart';
import { OperationScheduleTable } from './OperationScheduleTable';

interface RevenueSummaryChartProps {
    actualResult: OptimizationResult | null;
    modelResults: Record<string, {
        optimization: OptimizationResult;
        realizedRevenue: number;
    } | null>;
    ganttData: GanttChartData | null;
    selectedModels: {
        id: string | number;
        name: string;
        color: string;
    }[];
    colors: any;
    dt?: number;
    viewOptions: ViewOptions;
}

export const RevenueSummaryChart: React.FC<RevenueSummaryChartProps> = ({
    actualResult,
    modelResults,
    ganttData,
    selectedModels,
    colors,
    dt = 0.5,
    viewOptions
}) => {
    const theme = useTheme();
    const darkMode = theme.palette.mode === 'dark';
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('optimal');

    // Metrics Calculation
    const metrics = useMemo(() => {
        if (!actualResult) return null;
        const optimalRev = actualResult.summary.total_revenue;

        // Find best model
        let bestModelRev = 0;
        let bestModelName = '-';

        Object.entries(modelResults).forEach(([key, val]) => {
            if (val && val.realizedRevenue > bestModelRev) {
                bestModelRev = val.realizedRevenue;
                const name = key.split('|')[1] || key;
                bestModelName = name;
            }
        });

        const efficiency = optimalRev > 0 ? (bestModelRev / optimalRev) * 100 : 0;

        return {
            optimalRev,
            bestModelRev,
            bestModelName,
            efficiency
        };
    }, [actualResult, modelResults]);

    // 1. Total Revenue Comparison
    const totalRevenueOption = useMemo(() => {
        const optimalRevenue = actualResult?.summary.total_revenue ?? 0;
        const xData = ['Optimal'];
        const yData = [optimalRevenue];
        const barColors = [colors.actual || '#ff4d4f'];

        selectedModels.forEach(model => {
            const key = `${model.id}|${model.name}`;
            const res = modelResults[key];
            xData.push(model.name);
            yData.push(res?.realizedRevenue ?? 0);
            barColors.push(model.color);
        });

        const percentages = yData.map(val => optimalRevenue ? (val / optimalRevenue) * 100 : 0);

        return {
            title: { text: 'Total Revenue Comparison', textStyle: { color: colors.text, fontSize: 14 } },
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis' as const,
                axisPointer: { type: 'shadow' as const },
                formatter: (params: any) => {
                    const p = params[0];
                    return `<div style="font-weight:bold">${p.name}</div>
                            <div>Revenue: ¥${p.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            <div>Perf: ${percentages[p.dataIndex].toFixed(1)}%</div>`;
                }
            },
            grid: { left: '3%', right: '4%', bottom: '3%', top: '30', containLabel: true },
            xAxis: { type: 'category' as const, data: xData, axisLabel: { color: colors.text } },
            yAxis: { type: 'value' as const, axisLabel: { color: colors.text }, splitLine: { lineStyle: { type: 'dashed' as const, opacity: 0.3 } } },
            series: [{
                type: 'bar' as const,
                data: yData.map((val, idx) => ({ value: val, itemStyle: { color: barColors[idx] } })),
                label: { show: true, position: 'top' as const, formatter: (p: any) => p.dataIndex === 0 ? 'Optimal' : `${percentages[p.dataIndex].toFixed(1)}%`, color: colors.text }
            }]
        };
    }, [actualResult, modelResults, selectedModels, colors]);

    // 2. Daily Net Revenue Comparison
    const dailyRevenueOption = useMemo(() => {
        if (!actualResult?.results && selectedModels.length === 0) return {};

        // Helper to aggregate daily net revenue
        const aggregateSplit = (results: any[]) => {
            const daily: Record<string, number> = {};
            results.forEach(r => {
                if (!r.time) return;
                const date = r.time.substring(0, 10);
                if (!daily[date]) daily[date] = 0;

                // Calculate Net: (SpotRevenue + BalRevenue) - ChargeCost
                const rev = ((r.power_spot || 0) * (r.price_spot || 0) + (r.power_bal || 0) * (r.price_bal || 0)) * dt;
                const cost = (r.power_ch || 0) * (r.price_spot || 0) * dt;
                daily[date] += (rev - cost);
            });
            return daily;
        };

        // 1. Process Optimal
        const optimalDailyMap = actualResult ? aggregateSplit(actualResult.results) : {};

        // 2. Process Models
        const modelDailyMaps: Record<string, Record<string, number>> = {};
        selectedModels.forEach(model => {
            const key = `${model.id}|${model.name}`;
            const res = modelResults[key];
            if (res?.optimization?.results) {
                modelDailyMaps[key] = aggregateSplit(res.optimization.results);
            }
        });

        // 3. Collect all unique dates
        const allDatesSet = new Set<string>();
        Object.keys(optimalDailyMap).forEach(d => allDatesSet.add(d));
        Object.values(modelDailyMaps).forEach(map => Object.keys(map).forEach(d => allDatesSet.add(d)));
        const sortedDates = Array.from(allDatesSet).sort();
        const xAxisLabels = sortedDates.map(d => d.substring(5)); // MM-DD

        // 4. Build Series
        const series: any[] = [];

        // Optimal Series
        if (actualResult) {
            series.push({
                name: 'Optimal',
                type: 'bar',
                data: sortedDates.map(d => optimalDailyMap[d] || 0),
                itemStyle: { color: colors.actual || '#ff4d4f' },
                barGap: 0
            });
        }

        // Model Series
        selectedModels.forEach(model => {
            const key = `${model.id}|${model.name}`;
            const map = modelDailyMaps[key];
            if (map) {
                series.push({
                    name: model.name,
                    type: 'bar',
                    data: sortedDates.map(d => map[d] || 0),
                    itemStyle: { color: model.color }
                });
            }
        });

        return {
            title: { text: 'Daily Net Revenue Comparison', textStyle: { color: colors.text, fontSize: 14 } },
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis' as const,
                axisPointer: { type: 'shadow' as const },
                formatter: (params: any) => {
                    let html = `<div style="margin-bottom:4px;font-weight:bold">${params[0]?.name}</div>`;
                    if (Array.isArray(params)) {
                        params.forEach((p: any) => {
                            html += `
                                <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
                                    <span style="display:flex;align-items:center;gap:4px">
                                        <span style="width:10px;height:10px;border-radius:2px;background-color:${p.color}"></span>
                                        ${p.seriesName}
                                    </span>
                                    <span style="font-weight:bold">¥${(p.value as number).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>`;
                        });
                    }
                    return html;
                }
            },
            legend: { top: 0, right: 0, textStyle: { color: colors.text } },
            grid: { left: '3%', right: '4%', bottom: '3%', top: '30', containLabel: true },
            xAxis: {
                type: 'category' as const,
                data: xAxisLabels,
                axisLabel: { color: colors.text }
            },
            yAxis: {
                type: 'value' as const,
                axisLabel: { color: colors.text },
                splitLine: { lineStyle: { type: 'dashed' as const, opacity: 0.3 } }
            },
            series: series.map(s => ({ ...s, type: 'bar' as const }))
        };
    }, [actualResult, modelResults, selectedModels, colors, dt]);

    // 3. Cumulative Revenue
    const cumulativeOption = useMemo(() => {
        if (!actualResult?.results) return {};
        const getCumulative = (results: any[]) => {
            let sum = 0;
            return results.map(r => {
                sum += (r.revenue || 0);
                return { time: r.time, val: sum };
            });
        };
        const optimalCum = getCumulative(actualResult.results);
        const times = optimalCum.map(d => d.time ? d.time.substring(5, 16).replace('T', ' ') : '');
        const series: any[] = [{
            name: 'Optimal',
            type: 'line' as const,
            data: optimalCum.map(d => d.val),
            itemStyle: { color: colors.actual || '#ff4d4f' },
            showSymbol: false
        }];
        selectedModels.forEach(model => {
            const key = `${model.id}|${model.name}`;
            const res = modelResults[key];
            if (res?.optimization?.results) {
                const modelCum = getCumulative(res.optimization.results);
                series.push({
                    name: `${model.name}`,
                    type: 'line' as const,
                    data: modelCum.map(d => d.val),
                    itemStyle: { color: model.color },
                    showSymbol: false,
                    lineStyle: { type: 'dashed' as const }
                });
            }
        });
        return {
            title: { text: 'Cumulative Revenue', textStyle: { color: colors.text, fontSize: 14 } },
            backgroundColor: 'transparent',
            tooltip: { trigger: 'axis' as const },
            legend: { top: 0, right: 0, textStyle: { color: colors.text } },
            grid: { left: '3%', right: '4%', bottom: '3%', top: '30', containLabel: true },
            xAxis: { type: 'category' as const, data: times, axisLabel: { color: colors.text } },
            yAxis: { type: 'value' as const, axisLabel: { color: colors.text }, splitLine: { lineStyle: { type: 'dashed' as const, opacity: 0.3 } } },
            series: series
        };
    }, [actualResult, modelResults, selectedModels, colors]);


    // Data for Table
    const displayedSchedule = useMemo(() => {
        if (!ganttData) return [];
        if (selectedScheduleId === 'optimal') {
            return ganttData.optimal || [];
        }
        return ganttData.models[selectedScheduleId] || [];
    }, [ganttData, selectedScheduleId]);

    const availableSchedules = useMemo(() => {
        const options = [{ id: 'optimal', name: 'Optimal Plan' }];
        selectedModels.forEach(m => {
            options.push({ id: `${m.id}|${m.name}`, name: `Predicted: ${m.name}` });
        });
        return options;
    }, [selectedModels]);


    return (
        <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', p: 1 }}>

            {/* Metrics Cards */}
            {metrics && (
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                bgcolor: darkMode ? 'rgba(33, 150, 243, 0.1)' : '#e3f2fd',
                                border: '1px solid',
                                borderColor: darkMode ? 'rgba(33, 150, 243, 0.3)' : '#90caf9',
                                borderRadius: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}
                        >
                            <Typography variant="overline" color="primary.main" fontWeight="600">Optimal Revenue</Typography>
                            <Typography variant="h4" fontWeight="bold" color="text.primary">
                                ¥{metrics.optimalRev.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                bgcolor: darkMode ? 'rgba(156, 39, 176, 0.1)' : '#f3e5f5',
                                border: '1px solid',
                                borderColor: darkMode ? 'rgba(156, 39, 176, 0.3)' : '#ce93d8',
                                borderRadius: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}
                        >
                            <Typography variant="overline" sx={{ color: '#9c27b0', fontWeight: 600 }}>Best Strategy</Typography>
                            <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary' }}>{metrics.bestModelName}</Typography>
                            <Typography variant="h4" fontWeight="bold" color="text.primary">
                                ¥{metrics.bestModelRev.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                bgcolor: metrics.efficiency > 90
                                    ? (darkMode ? 'rgba(76, 175, 80, 0.1)' : '#e8f5e9')
                                    : (darkMode ? 'rgba(255, 152, 0, 0.1)' : '#fff3e0'),
                                border: '1px solid',
                                borderColor: metrics.efficiency > 90
                                    ? (darkMode ? 'rgba(76, 175, 80, 0.3)' : '#a5d6a7')
                                    : (darkMode ? 'rgba(255, 152, 0, 0.3)' : '#ffcc80'),
                                borderRadius: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}
                        >
                            <Typography variant="overline" sx={{ color: metrics.efficiency > 90 ? 'success.main' : 'warning.main', fontWeight: 600 }}>
                                Efficiency
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="text.primary">
                                {metrics.efficiency.toFixed(1)}%
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Gantt Chart Section */}
            <Box>
                {ganttData ? (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="h6" gutterBottom>Operating Schedule</Typography>
                        <RevenueGanttChart data={ganttData} viewOptions={viewOptions} />
                    </Box>
                ) : (
                    <Box sx={{ p: 4, textAlign: 'center', border: `1px dashed ${colors.border}`, borderRadius: 2 }}>
                        <Typography color="text.secondary">Run simulation to view Gantt chart</Typography>
                    </Box>
                )}
            </Box>

            <Divider />

            {/* Analysis Charts */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, minHeight: 400 }}>
                <Box sx={{ flex: 1, minHeight: 300 }}>
                    {actualResult && <BaseChart option={totalRevenueOption} height={350} />}
                </Box>
                <Box sx={{ flex: 1, minHeight: 300 }}>
                    {actualResult && <BaseChart option={dailyRevenueOption} height={350} />}
                </Box>
            </Box>

            <Box sx={{ minHeight: 350 }}>
                {actualResult && <BaseChart option={cumulativeOption} height={350} />}
            </Box>

            <Divider />

            {/* Operation Details Table */}
            {ganttData && displayedSchedule.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">Operation Details Table</Typography>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel id="schedule-select-label">Select Schedule</InputLabel>
                            <Select
                                labelId="schedule-select-label"
                                value={selectedScheduleId}
                                label="Select Schedule"
                                onChange={(e) => setSelectedScheduleId(e.target.value)}
                            >
                                {availableSchedules.map(opt => (
                                    <MenuItem key={opt.id} value={opt.id}>{opt.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                    <OperationScheduleTable data={displayedSchedule} />
                </Box>
            )}
        </Box>
    );
};
