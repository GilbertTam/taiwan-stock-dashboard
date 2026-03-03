import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Box, Typography, useTheme, Card, CardContent, Grid, Divider, Paper, FormControl, InputLabel, Select, MenuItem, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { EChartsOption } from 'echarts';
import { BaseChart } from '@/components/charts/BaseChart';
import { OptimizationResult, GanttChartData } from '@/types/revenueAnalysis';
import { RevenueGanttChart } from './RevenueGanttChart';
import { OperationScheduleTable } from './OperationScheduleTable';
import { PriceOperationChart } from './PriceOperationChart';

/** Scale factor for revenue display (backend returns in different unit). */
const REVENUE_DISPLAY_SCALE = 1;

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
}

export const RevenueSummaryChart: React.FC<RevenueSummaryChartProps> = ({
    actualResult,
    modelResults,
    ganttData,
    selectedModels,
    colors,
    dt = 0.5
}) => {
    const theme = useTheme();
    const darkMode = theme.palette.mode === 'dark';
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('optimal');
    const priceChartRef = useRef<{ getInstance: () => any }>(null);
    const opChartRef = useRef<{ getInstance: () => any }>(null);
    const socChartRef = useRef<{ getInstance: () => any }>(null);

    // Metrics: computed only from Detailed Operation Schedule (ganttData), no separate API data
    const metrics = useMemo(() => {
        if (!ganttData) return null;
        const hasOptimal = (ganttData.optimal?.length ?? 0) > 0;
        const modelKeys = Object.keys(ganttData.models || {});
        if (!hasOptimal && modelKeys.length === 0) return null;

        const sumRevenue = (ops: { revenueRealized?: number | null; revenue?: number | null }[]) =>
            ops.reduce((sum, op) => sum + (op.revenueRealized ?? op.revenue ?? 0), 0);

        const optimalRev = hasOptimal
            ? sumRevenue(ganttData.optimal!)
            : 0;

        let bestModelRev = -Infinity;
        let bestModelName = '-';

        selectedModels.forEach((model) => {
            const key = `${model.id}|${model.name}`;
            const ops = ganttData.models?.[key];
            if (ops?.length) {
                const rev = sumRevenue(ops);
                if (rev > bestModelRev) {
                    bestModelRev = rev;
                    bestModelName = model.name;
                }
            }
        });

        if (bestModelRev === -Infinity) bestModelRev = 0;
        // Efficiency only meaningful when both same sign (both positive or both negative)
        const sameSign = (optimalRev > 0 && bestModelRev > 0) || (optimalRev < 0 && bestModelRev < 0);
        const efficiency: number | null =
            optimalRev !== 0 && sameSign ? (bestModelRev / optimalRev) * 100 : null;

        return {
            optimalRev,
            bestModelRev,
            bestModelName,
            efficiency
        };
    }, [ganttData, selectedModels]);



    // 2. Consolidated Daily Analysis (Net Revenue vs Cumulative)
    const dailyAnalysisOption = useMemo(() => {
        if (!actualResult && selectedModels.length === 0) return {};

        const dates = Object.keys(ganttData?.optimal ?
            ganttData.optimal.reduce((acc: any, op: any) => ({ ...acc, [op.datetime.substring(0, 10)]: 1 }), {}) :
            {}
        ).sort();

        // Helper to get Daily Net and Cumulative. When useZeroForPredicted (model has no prediction data), show predicted revenue as 0.
        const getSeriesData = (ops: any[], name: string, color: string, isOptimal: boolean, useZeroForPredicted = false) => {
            const dailyNet: Record<string, number> = {};
            const cumulative: number[] = [];
            let sum = 0;

            if (useZeroForPredicted) {
                const netData = dates.map(() => 0);
                const cumData = dates.map(() => 0);
                return {
                    net: {
                        name: `${name} (Net)`,
                        type: 'bar',
                        data: netData,
                        itemStyle: { color: color, opacity: 0.7 },
                        barGap: 0,
                        yAxisIndex: 0
                    },
                    cum: {
                        name: `${name} (Cum)`,
                        type: 'line',
                        yAxisIndex: 0,
                        data: cumData,
                        itemStyle: { color: color },
                        lineStyle: { color: color, width: 3, type: 'dashed' as const },
                        showSymbol: false
                    }
                };
            }

            // Map ops to days for net
            ops.forEach(op => {
                const d = op.datetime.substring(0, 10);
                dailyNet[d] = (dailyNet[d] || 0) + (op.revenueRealized ?? op.revenue ?? 0);
            });

            // Build arrays aligned with 'dates'
            const netData = dates.map(d => dailyNet[d] || 0);

            // Build Cumulative (continuously summing sorted ops, but we need to match 'dates' points?)
            // Actually, Cumulative Line should probably be per TimeStep (detailed) or per Day (summary)?
            // User request usually implies "Daily Cumulative" if combined with Daily Net.
            // Let's do Daily Cumulative (End of Day).

            dates.forEach(d => {
                sum += dailyNet[d] || 0;
                cumulative.push(sum);
            });

            return {
                net: {
                    name: isOptimal ? 'Optimal (Net)' : `${name} (Net)`,
                    type: 'bar',
                    data: netData,
                    itemStyle: { color: color, opacity: 0.7 },
                    barGap: 0,
                    yAxisIndex: 0
                },
                cum: {
                    name: isOptimal ? 'Optimal (Cum)' : `${name} (Cum)`,
                    type: 'line',
                    yAxisIndex: 0,
                    data: cumulative,
                    itemStyle: { color: color },
                    lineStyle: { color: color, width: 3, type: isOptimal ? 'solid' : 'dashed' },
                    showSymbol: false
                }
            };
        };

        const series: any[] = [];
        const noDataSeriesNames = new Set<string>();

        // Optimal
        if (ganttData?.optimal) {
            const d = getSeriesData(ganttData.optimal, 'Optimal', colors.actual || '#ff4d4f', true);
            series.push(d.net, d.cum);
        }

        // Models
        selectedModels.forEach(model => {
            const key = `${model.id}|${model.name}`;
            const ops = ganttData?.models?.[key];
            if (ops && ops.length > 0) {
                const hasNoPrediction = ops.every((op: any) => op.pricePredicted == null);
                const d = getSeriesData(ops, model.name, model.color, false, hasNoPrediction);
                series.push(d.net, d.cum);
                if (hasNoPrediction) {
                    noDataSeriesNames.add(`${model.name} (Net)`);
                    noDataSeriesNames.add(`${model.name} (Cum)`);
                }
            }
        });

        return {
            tooltip: {
                trigger: 'axis' as const,
                axisPointer: { type: 'cross' as const },
                backgroundColor: darkMode ? 'rgba(40,40,40,0.96)' : 'rgba(255,255,255,0.98)',
                borderColor: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                borderWidth: 1,
                padding: [12, 14],
                textStyle: { color: darkMode ? '#e0e0e0' : '#1a1a1a', fontSize: 13 },
                formatter: (params: any[]) => {
                    const sep = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
                    let html = `<div style="font-weight:600;font-size:13px;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid ${sep}">${params[0].name}</div>`;
                    params.forEach(p => {
                        const isNoDataZero = noDataSeriesNames.has(p.seriesName) && Number(p.value) === 0;
                        const valueStr = isNoDataZero ? '-' : `¥${Number(p.value).toLocaleString()}`;
                        html += `<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:3px 0"><span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:2px;background:${p.color}"></span><span style="color:${darkMode ? '#aaa' : '#666'}">${p.seriesName}</span></span><b>${valueStr}</b></div>`;
                    });
                    return html;
                }
            },
            legend: {
                type: 'scroll' as const,
                orient: 'horizontal' as const,
                left: 'center',
                bottom: 8,
                textStyle: { color: colors.text },
                data: series.map((s) => s.name)
            },
            grid: { left: '3%', right: '3%', bottom: 56, top: 48, containLabel: true },
            xAxis: {
                type: 'category' as const,
                data: dates.map(d => d.substring(5)), // MM-DD
                axisLabel: { color: colors.text },
                splitArea: {
                    show: true,
                    areaStyle: {
                        color: dates.map((_, i) =>
                            i % 2 === 1
                                ? (darkMode ? 'rgba(68,68,68,0.35)' : 'rgba(224,224,224,0.5)')
                                : 'transparent'
                        )
                    }
                }
            },
            yAxis: [
                {
                    type: 'value' as const,
                    name: 'JPY',
                    position: 'right' as const,
                    boundaryGap: ['0%', '8%'] as [string, string],
                    axisLabel: { color: colors.text },
                    axisLine: { show: true, lineStyle: { color: colors.text, opacity: 0.5 } },
                    splitLine: { lineStyle: { type: 'dashed' as const, opacity: 0.3 } },
                    axisTick: { show: true }
                }
            ],
            series: (() => {
                const zeroLineStyle = { type: 'solid' as const, width: 2, color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' };
                let addedBarZero = false, addedLineZero = false;
                return series.map((s) => {
                    if (s.type === 'bar' && !addedBarZero) {
                        addedBarZero = true;
                        return { ...s, markLine: { silent: true, symbol: 'none', lineStyle: zeroLineStyle, data: [{ yAxis: 0 }] } };
                    }
                    if (s.type === 'line' && !addedLineZero) {
                        addedLineZero = true;
                        return { ...s, markLine: { silent: true, symbol: 'none', lineStyle: zeroLineStyle, data: [{ yAxis: 0 }] } };
                    }
                    return s;
                });
            })()
        };
    }, [ganttData, selectedModels, colors, actualResult, darkMode]);


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
        if (!ganttData?.models) return options;
        selectedModels.forEach(m => {
            const key = `${m.id}|${m.name}`;
            const ops = ganttData.models[key];
            const hasAnyPrediction = ops?.length && ops.some((op: { pricePredicted?: number | null }) => op.pricePredicted != null);
            if (hasAnyPrediction) options.push({ id: key, name: `Predicted: ${m.name}` });
        });
        return options;
    }, [selectedModels, ganttData]);

    // When selected schedule is a no-data model, switch to optimal so dropdown and table stay in sync
    useEffect(() => {
        if (!ganttData || selectedScheduleId === 'optimal') return;
        const validIds = new Set(availableSchedules.map(o => o.id));
        if (!validIds.has(selectedScheduleId)) setSelectedScheduleId('optimal');
    }, [ganttData, selectedScheduleId, availableSchedules]);

    const timeCategories = useMemo(() => {
        if (!ganttData) return [];
        const src = ganttData.optimal?.length ? ganttData.optimal : (() => {
            const firstKey = Object.keys(ganttData.models)[0];
            return firstKey ? ganttData.models[firstKey] : [];
        })();
        return [...src]
            .sort((a, b) => (a.datetime || '').localeCompare(b.datetime || ''))
            .map(d => (d.datetime ? d.datetime.substring(5, 16).replace('T', ' ') : ''));
    }, [ganttData]);

    const connectGroupIdRef = useRef<string | null>(null);
    const axisPointerCleanupsRef = useRef<(() => void)[]>([]);
    const bindListenersTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!ganttData || timeCategories.length === 0) return;
        const attemptConnect = () => {
            const p = priceChartRef.current?.getInstance?.();
            const o = opChartRef.current?.getInstance?.();
            const s = socChartRef.current?.getInstance?.();
            if (p && o && s) {
                import('echarts').then((echarts) => {
                    const groupId = echarts.connect([p, o, s]);
                    connectGroupIdRef.current = groupId;

                    const charts = [p, o, s];
                    const len = timeCategories.length;
                    const syncAxisPointer = (sourceChart: any, dataIndex: number) => {
                        const idx = Math.min(Math.max(0, dataIndex), len - 1);
                        charts.forEach((ch) => {
                            if (ch === sourceChart) return;
                            try {
                                ch.dispatchAction({
                                    type: 'updateAxisPointer',
                                    currTrigger: 'axis',
                                    xAxisIndex: 0,
                                    dataIndex: idx
                                });
                                ch.dispatchAction({ type: 'showTip', dataIndex: idx });
                            } catch (_) { }
                        });
                    };
                    const clearAxisPointer = () => {
                        charts.forEach((ch) => {
                            try { ch.dispatchAction({ type: 'hideTip' }); } catch (_) { }
                        });
                    };

                    const offFns: (() => void)[] = [];
                    const bindListeners = () => {
                        if (!connectGroupIdRef.current) return;
                        charts.forEach((ch) => {
                            const zr = ch.getZr();
                            if (!zr) {
                                offFns.push(() => { });
                                return;
                            }
                            const onMove = (e: any) => {
                                const point = [e.offsetX, e.offsetY];
                                try {
                                    const result = ch.convertFromPixel(
                                        { gridIndex: 0 },
                                        point
                                    );
                                    const rawIdx = result != null && Array.isArray(result) ? result[0] : null;
                                    if (typeof rawIdx === 'number' && !Number.isNaN(rawIdx)) {
                                        const dataIndex = Math.round(rawIdx);
                                        if (dataIndex >= 0 && dataIndex < len) syncAxisPointer(ch, dataIndex);
                                    }
                                } catch (_) { }
                            };
                            const onOut = () => clearAxisPointer();
                            zr.on('mousemove', onMove);
                            zr.on('globalout', onOut);
                            offFns.push(() => {
                                zr.off('mousemove', onMove);
                                zr.off('globalout', onOut);
                            });
                        });
                        axisPointerCleanupsRef.current = offFns;
                    };
                    bindListenersTimeoutRef.current = setTimeout(bindListeners, 0);
                });
                return true;
            }
            return false;
        };
        let t: ReturnType<typeof setTimeout> | undefined;
        if (!attemptConnect()) {
            t = setTimeout(attemptConnect, 150);
        }
        return () => {
            if (t) clearTimeout(t);
            if (bindListenersTimeoutRef.current != null) {
                clearTimeout(bindListenersTimeoutRef.current);
                bindListenersTimeoutRef.current = null;
            }
            axisPointerCleanupsRef.current.forEach((fn) => fn());
            axisPointerCleanupsRef.current = [];
            const gid = connectGroupIdRef.current;
            if (gid) {
                connectGroupIdRef.current = null;
                import('echarts').then((echarts) => { try { echarts.disconnect(gid); } catch (_) { } });
            }
        };
    }, [ganttData, timeCategories.length]);


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
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="overline" color="primary.main" fontWeight="600">Optimal (Realized)</Typography>
                                <Tooltip title="以區間內實際價格回算：若完全依照最優排程（事後最優）執行，可獲得的總收益。" placement="top" arrow enterDelay={300}>
                                    <Box component="span" onClick={(e) => e.stopPropagation()} sx={{ display: 'inline-flex' }}>
                                        <InfoOutlinedIcon sx={{ fontSize: '1rem', color: 'text.secondary', cursor: 'help' }} />
                                    </Box>
                                </Tooltip>
                            </Box>
                            <Typography variant="h4" fontWeight="bold" color="text.primary">
                                ¥{((metrics.optimalRev ?? 0) * REVENUE_DISPLAY_SCALE).toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="overline" sx={{ color: '#9c27b0', fontWeight: 600 }}>Best Model (Realized)</Typography>
                                <Tooltip title="在已選擇的預測模型中，依其建議排程並以實際價格結算後，實現收益最高的模型；下方為該模型名稱與其實現收益。" placement="top" arrow enterDelay={300}>
                                    <Box component="span" onClick={(e) => e.stopPropagation()} sx={{ display: 'inline-flex' }}>
                                        <InfoOutlinedIcon sx={{ fontSize: '1rem', color: 'text.secondary', cursor: 'help' }} />
                                    </Box>
                                </Tooltip>
                            </Box>
                            <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary' }}>{metrics.bestModelName}</Typography>
                            <Typography variant="h4" fontWeight="bold" color="text.primary">
                                ¥{((metrics.bestModelRev ?? 0) * REVENUE_DISPLAY_SCALE).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                bgcolor: typeof metrics.efficiency === 'number' && metrics.efficiency > 90
                                    ? (darkMode ? 'rgba(76, 175, 80, 0.1)' : '#e8f5e9')
                                    : (darkMode ? 'rgba(255, 152, 0, 0.1)' : '#fff3e0'),
                                border: '1px solid',
                                borderColor: typeof metrics.efficiency === 'number' && metrics.efficiency > 90
                                    ? (darkMode ? 'rgba(76, 175, 80, 0.3)' : '#a5d6a7')
                                    : (darkMode ? 'rgba(255, 152, 0, 0.3)' : '#ffcc80'),
                                borderRadius: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}
                        >
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="overline" sx={{ color: typeof metrics.efficiency === 'number' && metrics.efficiency > 90 ? 'success.main' : 'warning.main', fontWeight: 600 }}>
                                    Strategy Efficiency
                                </Typography>
                                <Tooltip title="最佳模型之實現收益占最優實現收益的百分比。100% 表示該模型策略與最優結果一致；愈低表示與最優差距愈大。" placement="top" arrow enterDelay={300}>
                                    <Box component="span" onClick={(e) => e.stopPropagation()} sx={{ display: 'inline-flex' }}>
                                        <InfoOutlinedIcon sx={{ fontSize: '1rem', color: 'text.secondary', cursor: 'help' }} />
                                    </Box>
                                </Tooltip>
                            </Box>
                            <Typography variant="h4" fontWeight="bold" color="text.primary">
                                {typeof metrics.efficiency === 'number' && Number.isFinite(metrics.efficiency) ? `${metrics.efficiency.toFixed(1)}%` : '—'}
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Price vs Operation Chart */}
            <Box sx={{ mt: 1 }}>
                <PriceOperationChart
                    ref={priceChartRef}
                    ganttData={ganttData ?? undefined}
                    selectedModels={selectedModels}
                    colors={colors}
                    timeCategories={timeCategories}
                    height={320}
                    title="Price & Operation Analysis"
                    groupId="revenue-time-group"
                />
            </Box>

            {/* Gantt Chart Section */}
            <Box sx={{ mt: 2 }}>
                {ganttData ? (
                    <Box>
                        <Typography variant="subtitle1" fontWeight="600" gutterBottom>Operating Schedule</Typography>
                        <RevenueGanttChart data={ganttData} selectedModels={selectedModels} timeCategories={timeCategories} colors={colors} opChartRef={opChartRef} socChartRef={socChartRef} />
                    </Box>
                ) : (
                    <Box sx={{ p: 4, textAlign: 'center', border: `1px dashed ${colors.border}`, borderRadius: 2 }}>
                        <Typography color="text.secondary">Run simulation to view Gantt chart</Typography>
                    </Box>
                )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Daily Revenue Analysis */}
            <Box sx={{ minHeight: 420, mt: 1 }}>
                {actualResult && (
                    <>
                        <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                            Daily Revenue Analysis
                        </Typography>
                        <BaseChart option={dailyAnalysisOption as EChartsOption} height={400} />
                    </>
                )}
            </Box>

            <Divider sx={{ my: 2 }} />

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
