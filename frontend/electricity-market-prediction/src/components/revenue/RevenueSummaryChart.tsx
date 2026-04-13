import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
    Box, useTheme, FormControl, InputLabel, Select, MenuItem,
    Tabs, Tab, Typography, Divider,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Chip,
} from '@mui/material';
import type { EChartsOption } from 'echarts';
import { BaseChart } from '@/components/charts/BaseChart';
import { OptimizationResult, GanttChartData, GanttOperation } from '@/types/revenueAnalysis';
import { RevenueGanttChart } from './RevenueGanttChart';
import { SocLineChart } from './SocLineChart';
import { OperationScheduleTable } from './OperationScheduleTable';
import { PriceOperationChart } from './PriceOperationChart';
import RevenueKpiHeader from './RevenueKpiHeader';
import { RevenueEmptyState } from './RevenueEmptyState';
import { useTranslation } from 'react-i18next';

/** Resolve revenue for an operation based on the current price basis (own-model only). */
function resolveRevenue(op: GanttOperation, basis: string): number {
    if (basis === 'actual') return op.revenueRealized ?? op.revenue ?? 0;
    return op.revenueEstimated ?? op.revenueRealized ?? op.revenue ?? 0;
}

/**
 * Compute a model operation's revenue at the basis model's predicted prices.
 * Used when model Y's schedule is evaluated at model X's assumed prices.
 * Degradation cost is omitted (Cost_cycle defaults to 0).
 */
function computeRevAtBasisPrices(op: GanttOperation, basisMap: Map<string, number>, dt: number): number {
    if (op.action == null || op.power == null || op.action === 'Idle') return 0;
    const price = basisMap.get(op.datetime) ?? 0;
    if (op.action === 'Charge') return -(op.power * 1000 * price * dt);
    return op.power * 1000 * price * dt; // Spot / Balance / Discharge
}

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
    manualResult?: { optimization: OptimizationResult; realizedRevenue: number } | null;
    batteryECap?: number;
    cycleLimit?: number;
    /** Controlled: the active price basis ('actual' | modelKey). Falls back to internal state if omitted. */
    priceBasis?: string;
    onPriceBasisChange?: (basis: string) => void;
}

export const RevenueSummaryChart: React.FC<RevenueSummaryChartProps> = ({
    actualResult,
    modelResults,
    ganttData,
    selectedModels,
    colors,
    dt = 0.5,
    manualResult,
    batteryECap,
    cycleLimit,
    priceBasis: priceBasisProp,
    onPriceBasisChange,
}) => {
    const theme = useTheme();
    const darkMode = theme.palette.mode === 'dark';
    const { t } = useTranslation('siteRevenue');
    const [activeTab, setActiveTab] = useState(0);
    const [selectedScheduleId, setSelectedScheduleId] = useState<string>('optimal');
    // Internal fallback when not controlled from outside
    const [priceBasisInternal, setPriceBasisInternal] = useState<string>('actual');
    const priceBasis = priceBasisProp ?? priceBasisInternal;
    const setPriceBasis = (v: string) => {
        setPriceBasisInternal(v);
        onPriceBasisChange?.(v);
    };
    const priceChartRef = useRef<{ getInstance: () => any }>(null);
    const opChartRef = useRef<{ getInstance: () => any }>(null);
    const socChartRef = useRef<{ getInstance: () => any }>(null);

    const manualColor = useMemo(() => {
        if (typeof window === 'undefined') return '#29b6f6';
        return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#29b6f6';
    }, []);

    // datetime → pricePredicted map for the selected basis model (null when basis = 'actual')
    const basisPriceMap = useMemo((): Map<string, number> | null => {
        if (priceBasis === 'actual' || !ganttData?.models?.[priceBasis]) return null;
        const map = new Map<string, number>();
        ganttData.models[priceBasis].forEach(op => {
            if (op.pricePredicted != null) map.set(op.datetime, op.pricePredicted);
        });
        return map.size > 0 ? map : null;
    }, [ganttData, priceBasis]);

    // Price basis options: 'actual' + each model that has predictions
    const priceBasisOptions = useMemo(() => {
        const options: { id: string; label: string }[] = [{ id: 'actual', label: t('summary.priceBasisActual') }];
        if (ganttData?.models) {
            selectedModels.forEach(m => {
                const key = `${m.id}|${m.name}`;
                const ops = ganttData.models[key];
                if (ops?.some(op => op.pricePredicted != null)) {
                    options.push({ id: key, label: m.name });
                }
            });
        }
        return options;
    }, [ganttData, selectedModels, t]);

    // When ganttData changes, reset priceBasis to 'actual' if current basis is no longer available
    useEffect(() => {
        if (priceBasis === 'actual') return;
        const validIds = new Set(priceBasisOptions.map(o => o.id));
        if (!validIds.has(priceBasis)) setPriceBasis('actual');
    }, [priceBasisOptions, priceBasis]);

    // KPI Metrics — handles three modes:
    //   1. priceBasis='actual'         → standard: actual optimal vs model realized revenues
    //   2. priceBasis=model, has actual → hybrid:  actual optimal, models evaluated at basis prices
    //   3. priceBasis=model, no actual  → reference mode: basis model is the 100% reference
    const metrics = useMemo(() => {
        if (!ganttData) return null;
        const hasOptimal = (ganttData.optimal?.length ?? 0) > 0;
        const modelKeys = Object.keys(ganttData.models || {});
        if (!hasOptimal && modelKeys.length === 0) return null;

        const isBasisMode = priceBasis !== 'actual' && basisPriceMap !== null;
        const isReferenceMode = isBasisMode && !hasOptimal; // no actual prices

        // ── Optimal / Reference revenue ─────────────────────────────────────────
        let optimalRev: number;
        let referenceName: string | undefined;

        if (isReferenceMode) {
            // No actual data → basis model's own estimated revenue is the reference (= 100%)
            const basisOps = ganttData.models[priceBasis] ?? [];
            optimalRev = basisOps.reduce((s, op) => s + (op.revenueEstimated ?? 0), 0);
            referenceName = selectedModels.find(m => `${m.id}|${m.name}` === priceBasis)?.name;
        } else {
            optimalRev = hasOptimal
                ? (ganttData.optimal!).reduce((s, op) => s + (op.revenueRealized ?? op.revenue ?? 0), 0)
                : 0;
        }

        // Helper: revenue for an op of modelKey evaluated at current priceBasis
        const revOfOp = (op: GanttOperation, modelKey: string): number => {
            if (priceBasis === 'actual') return op.revenueRealized ?? op.revenue ?? 0;
            if (modelKey === priceBasis) return op.revenueEstimated ?? op.revenueRealized ?? op.revenue ?? 0;
            if (basisPriceMap) return computeRevAtBasisPrices(op, basisPriceMap, dt);
            return op.revenueEstimated ?? op.revenueRealized ?? op.revenue ?? 0;
        };

        // ── Best Model ──────────────────────────────────────────────────────────
        // In reference mode: exclude the basis model itself (it IS the reference)
        const candidates = isReferenceMode && selectedModels.length > 1
            ? selectedModels.filter(m => `${m.id}|${m.name}` !== priceBasis)
            : selectedModels;

        let bestModelKey: string | null = null;
        let bestModelRev = -Infinity;
        let bestModelName = '-';
        candidates.forEach(model => {
            const key = `${model.id}|${model.name}`;
            const ops = ganttData.models?.[key];
            if (ops?.length) {
                const rev = ops.reduce((s, op) => s + revOfOp(op, key), 0);
                if (rev > bestModelRev) { bestModelRev = rev; bestModelName = model.name; bestModelKey = key; }
            }
        });
        if (bestModelRev === -Infinity) bestModelRev = 0;

        // ── Dual values: actual realized + estimated (shown when both exist) ────
        const bestOps = bestModelKey ? (ganttData.models?.[bestModelKey] ?? null) : null;

        const bestModelRevActual: number | null = (bestOps?.length && hasOptimal)
            ? bestOps.reduce((s, op) => s + (op.revenueRealized ?? op.revenue ?? 0), 0)
            : null;

        const hasEst = bestOps?.some(op => op.revenueEstimated != null) ?? false;
        const bestModelRevEstimated: number | null = (bestOps?.length && hasEst)
            ? bestOps.reduce((s, op) => s + (op.revenueEstimated ?? 0), 0)
            : null;

        // ── Efficiencies ────────────────────────────────────────────────────────
        const calcEff = (rev: number, ref: number): number | null => {
            if (ref === 0) return null;
            if (!((ref > 0 && rev > 0) || (ref < 0 && rev < 0))) return null;
            return (rev / ref) * 100;
        };

        const actualOptRev = hasOptimal
            ? (ganttData.optimal!).reduce((s, op) => s + (op.revenueRealized ?? op.revenue ?? 0), 0)
            : 0;

        const efficiency = calcEff(bestModelRev, optimalRev);
        const efficiencyActual = bestModelRevActual !== null ? calcEff(bestModelRevActual, actualOptRev) : null;
        const efficiencyEstimated = bestModelRevEstimated !== null ? calcEff(bestModelRevEstimated, actualOptRev) : null;

        const manualRevActual: number | null = ganttData.manual?.length
            ? ganttData.manual.reduce((s, op) => s + (op.revenueRealized ?? op.revenue ?? 0), 0)
            : (manualResult?.realizedRevenue ?? null);

        const manualRevEstimated: number | null = (basisPriceMap !== null && (ganttData.manual?.length ?? 0) > 0)
            ? ganttData.manual!.reduce((s, op) => s + computeRevAtBasisPrices(op, basisPriceMap, dt), 0)
            : null;

        const manualRev = (priceBasis !== 'actual' && manualRevEstimated !== null)
            ? manualRevEstimated
            : manualRevActual;

        // Effective cycles: total discharge energy / E_cap from manual gantt data
        const manualEffectiveCycles: number | null = (ganttData.manual?.length && batteryECap && batteryECap > 0)
            ? ganttData.manual.reduce((s, op) => {
                if (op.action !== 'Discharge' && op.action !== 'Spot') return s;
                return s + ((op.power ?? 0) * dt / batteryECap);
            }, 0)
            : null;

        return {
            optimalRev, bestModelRev, bestModelName, efficiency, manualRev, referenceName,
            bestModelRevActual, bestModelRevEstimated, efficiencyActual, efficiencyEstimated,
            manualRevActual, manualRevEstimated, manualEffectiveCycles,
        };
    }, [ganttData, selectedModels, manualResult, priceBasis, basisPriceMap, dt]);

    // Whether any data is available to render Analysis/Details
    const hasData = useMemo(() => {
        if (!ganttData) return false;
        return (ganttData.optimal?.length ?? 0) > 0 || Object.keys(ganttData.models ?? {}).length > 0;
    }, [ganttData]);

    // Daily Revenue chart option — uses priceBasis for revenue values
    const dailyAnalysisOption = useMemo(() => {
        if (!ganttData) return {};
        if (!hasData) return {};

        const allOps: GanttOperation[] = [
            ...(ganttData.optimal ?? []),
            ...Object.values(ganttData.models ?? {}).flat(),
            ...(ganttData.manual ?? []),
        ];
        const dateSet = new Set(allOps.map(op => op.datetime.substring(0, 10)));
        const dates = Array.from(dateSet).sort();

        // Revenue resolver for chart series: cross-model aware
        const revForSeries = (op: GanttOperation, modelKey: string): number => {
            if (modelKey === 'optimal') {
                return op.revenueRealized ?? op.revenue ?? 0;
            }
            if (modelKey === 'manual') {
                if (basisPriceMap) return computeRevAtBasisPrices(op, basisPriceMap, dt);
                return op.revenueRealized ?? op.revenue ?? 0;
            }
            if (priceBasis === 'actual') return op.revenueRealized ?? op.revenue ?? 0;
            if (modelKey === priceBasis) return op.revenueEstimated ?? op.revenueRealized ?? op.revenue ?? 0;
            if (basisPriceMap) return computeRevAtBasisPrices(op, basisPriceMap, dt);
            return op.revenueEstimated ?? op.revenueRealized ?? op.revenue ?? 0;
        };

        const getSeriesData = (ops: GanttOperation[], name: string, color: string, isOptimal: boolean, modelKey: string) => {
            const dailyNet: Record<string, number> = {};
            const cumulative: number[] = [];
            let sum = 0;

            ops.forEach(op => {
                const d = op.datetime.substring(0, 10);
                dailyNet[d] = (dailyNet[d] || 0) + revForSeries(op, modelKey);
            });
            const netData = dates.map(d => dailyNet[d] || 0);
            dates.forEach(d => { sum += dailyNet[d] || 0; cumulative.push(sum); });

            return {
                net: {
                    name: isOptimal ? 'Optimal (Net)' : `${name} (Net)`,
                    type: 'bar', data: netData,
                    itemStyle: { color, opacity: 0.7 }, barGap: 0, yAxisIndex: 0,
                },
                cum: {
                    name: isOptimal ? 'Optimal (Cum)' : `${name} (Cum)`,
                    type: 'line', yAxisIndex: 0, data: cumulative,
                    itemStyle: { color },
                    lineStyle: { color, width: 3, type: isOptimal ? 'solid' : 'dashed' },
                    showSymbol: false,
                }
            };
        };

        const series: any[] = [];

        if (ganttData.optimal?.length) {
            const d = getSeriesData(ganttData.optimal, 'Optimal', colors.actual || '#ff4d4f', true, 'optimal');
            series.push(d.net, d.cum);
        }

        selectedModels.forEach(model => {
            const key = `${model.id}|${model.name}`;
            const ops = ganttData.models?.[key];
            if (ops?.length) {
                const d = getSeriesData(ops, model.name, model.color, false, key);
                series.push(d.net, d.cum);
            }
        });

        if (ganttData.manual?.length) {
            const d = getSeriesData(ganttData.manual, 'Manual', manualColor, false, 'manual');
            series.push(d.net, { ...d.cum, lineStyle: { ...d.cum.lineStyle, type: 'solid' as const } });
        }

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
                        html += `<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:3px 0"><span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:2px;background:${p.color}"></span><span style="color:${darkMode ? '#aaa' : '#666'}">${p.seriesName}</span></span><b>¥${Number(p.value).toLocaleString()}</b></div>`;
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
                data: dates.map(d => d.substring(5)),
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
            yAxis: [{
                type: 'value' as const,
                name: 'JPY',
                position: 'right' as const,
                boundaryGap: ['0%', '8%'] as [string, string],
                axisLabel: { color: colors.text },
                axisLine: { show: true, lineStyle: { color: colors.text, opacity: 0.5 } },
                splitLine: { lineStyle: { type: 'dashed' as const, opacity: 0.3 } },
                axisTick: { show: true }
            }],
            series: (() => {
                const zeroLineStyle = { type: 'solid' as const, width: 2, color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' };
                let addedBarZero = false, addedLineZero = false;
                return series.map((s) => {
                    if (s.type === 'bar' && !addedBarZero) { addedBarZero = true; return { ...s, markLine: { silent: true, symbol: 'none', lineStyle: zeroLineStyle, data: [{ yAxis: 0 }] } }; }
                    if (s.type === 'line' && !addedLineZero) { addedLineZero = true; return { ...s, markLine: { silent: true, symbol: 'none', lineStyle: zeroLineStyle, data: [{ yAxis: 0 }] } }; }
                    return s;
                });
            })()
        };
    }, [ganttData, selectedModels, colors, darkMode, manualResult, manualColor, hasData, priceBasis, basisPriceMap, dt]);

    // Daily revenue table — all series (optimal + each model + manual), cross-model aware
    const allModelDailyData = useMemo(() => {
        if (!ganttData || !hasData) return null;

        // Revenue resolver — same logic as in dailyAnalysisOption
        const revForSeries = (op: GanttOperation, modelKey: string): number => {
            if (modelKey === 'optimal') return op.revenueRealized ?? op.revenue ?? 0;
            if (modelKey === 'manual') {
                if (basisPriceMap) return computeRevAtBasisPrices(op, basisPriceMap, dt);
                return op.revenueRealized ?? op.revenue ?? 0;
            }
            if (priceBasis === 'actual') return op.revenueRealized ?? op.revenue ?? 0;
            if (modelKey === priceBasis) return op.revenueEstimated ?? op.revenueRealized ?? op.revenue ?? 0;
            if (basisPriceMap) return computeRevAtBasisPrices(op, basisPriceMap, dt);
            return op.revenueEstimated ?? op.revenueRealized ?? op.revenue ?? 0;
        };

        // Collect all dates across all series
        const allOps = [
            ...(ganttData.optimal ?? []),
            ...Object.values(ganttData.models ?? {}).flat(),
            ...(ganttData.manual ?? []),
        ];
        const dates = Array.from(new Set(allOps.map(op => op.datetime.substring(0, 10)))).sort();

        const buildSeries = (ops: GanttOperation[], id: string, name: string, color: string) => {
            const dailyNet: Record<string, number> = {};
            ops.forEach(op => {
                const d = op.datetime.substring(0, 10);
                dailyNet[d] = (dailyNet[d] || 0) + revForSeries(op, id);
            });
            let cum = 0;
            const rows = dates.map(date => {
                const daily = dailyNet[date] ?? 0;
                cum += daily;
                return { daily, cumulative: cum };
            });
            return { id, name, color, rows };
        };

        const series = [];
        if (ganttData.optimal?.length) {
            series.push(buildSeries(ganttData.optimal, 'optimal', 'Optimal', colors.actual || '#ff4d4f'));
        }
        selectedModels.forEach(m => {
            const key = `${m.id}|${m.name}`;
            const ops = ganttData.models?.[key];
            if (ops?.length) series.push(buildSeries(ops, key, m.name, m.color));
        });
        if (ganttData.manual?.length) {
            series.push(buildSeries(ganttData.manual, 'manual', 'Manual', manualColor));
        }

        return series.length > 0 ? { dates, series } : null;
    }, [ganttData, hasData, selectedModels, priceBasis, basisPriceMap, dt, colors, manualColor]);

    // Displayed schedule for the Details tab
    const displayedSchedule = useMemo(() => {
        if (!ganttData) return [];
        if (selectedScheduleId === 'optimal') return ganttData.optimal || [];
        if (selectedScheduleId === 'manual') return ganttData.manual || [];
        return ganttData.models[selectedScheduleId] || [];
    }, [ganttData, selectedScheduleId]);

    const availableSchedules = useMemo(() => {
        const options: { id: string; name: string }[] = [];
        // Only show Optimal if actual data was computed
        if (ganttData?.optimal?.length) {
            options.push({ id: 'optimal', name: 'Optimal Plan' });
        }
        if (ganttData?.models) {
            selectedModels.forEach(m => {
                const key = `${m.id}|${m.name}`;
                const ops = ganttData.models[key];
                // Include if has any prediction OR any valid action (covers no-actual-price scenario)
                if (ops?.length) options.push({ id: key, name: `Predicted: ${m.name}` });
            });
        }
        if (ganttData?.manual && ganttData.manual.length > 0) {
            options.push({ id: 'manual', name: 'Manual Plan' });
        }
        return options;
    }, [selectedModels, ganttData]);

    useEffect(() => {
        if (!ganttData) return;
        const validIds = new Set(availableSchedules.map(o => o.id));
        if (!validIds.has(selectedScheduleId)) {
            // Fall back to first available schedule
            setSelectedScheduleId(availableSchedules[0]?.id ?? 'optimal');
        }
    }, [ganttData, selectedScheduleId, availableSchedules]);

    // Per-row revenue overrides for the operation table (cross-model, keyed by datetime)
    const displayedScheduleRevenueAtBasis = useMemo((): Record<string, number> | null => {
        if (displayedSchedule.length === 0) return null;
        if (priceBasis === 'actual') return null; // table uses revenueRealized directly
        // Viewing the basis model's own schedule: revenueEstimated is already on each op
        if (selectedScheduleId === priceBasis) return null;
        // Cross-model: compute revenue at basis prices, keyed by datetime
        if (basisPriceMap) {
            const result: Record<string, number> = {};
            displayedSchedule.forEach(op => {
                result[op.datetime] = computeRevAtBasisPrices(op, basisPriceMap, dt);
            });
            return result;
        }
        return null;
    }, [displayedSchedule, priceBasis, selectedScheduleId, basisPriceMap, dt]);

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

    // ECharts cross-chart axis pointer sync
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
                                ch.dispatchAction({ type: 'updateAxisPointer', currTrigger: 'axis', xAxisIndex: 0, dataIndex: idx });
                                ch.dispatchAction({ type: 'showTip', dataIndex: idx });
                            } catch (_) { }
                        });
                    };
                    const clearAxisPointer = () => {
                        charts.forEach((ch) => { try { ch.dispatchAction({ type: 'hideTip' }); } catch (_) { } });
                    };
                    const offFns: (() => void)[] = [];
                    const bindListeners = () => {
                        if (!connectGroupIdRef.current) return;
                        charts.forEach((ch) => {
                            const zr = ch.getZr();
                            if (!zr) { offFns.push(() => { }); return; }
                            const onMove = (e: any) => {
                                const point = [e.offsetX, e.offsetY];
                                try {
                                    const result = ch.convertFromPixel({ gridIndex: 0 }, point);
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
                            offFns.push(() => { zr.off('mousemove', onMove); zr.off('globalout', onOut); });
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
        if (!attemptConnect()) { t = setTimeout(attemptConnect, 150); }
        return () => {
            if (t) clearTimeout(t);
            if (bindListenersTimeoutRef.current != null) { clearTimeout(bindListenersTimeoutRef.current); bindListenersTimeoutRef.current = null; }
            axisPointerCleanupsRef.current.forEach((fn) => fn());
            axisPointerCleanupsRef.current = [];
            const gid = connectGroupIdRef.current;
            if (gid) {
                connectGroupIdRef.current = null;
                import('echarts').then((echarts) => { try { echarts.disconnect(gid); } catch (_) { } });
            }
        };
    }, [ganttData, timeCategories.length]);

    const borderColor = colors.border || 'var(--card-border)';

    /** Price basis selector — rendered above the tab bar */
    const PriceBasisSelector = () => (
        priceBasisOptions.length > 1 ? (
            <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="price-basis-label" sx={{ fontSize: '0.8rem' }}>{t('summary.priceBasisLabel')}</InputLabel>
                <Select
                    labelId="price-basis-label"
                    value={priceBasis}
                    label={t('summary.priceBasisLabel')}
                    onChange={(e) => setPriceBasis(e.target.value)}
                    sx={{ fontSize: '0.8rem' }}
                >
                    {priceBasisOptions.map(opt => (
                        <MenuItem key={opt.id} value={opt.id} sx={{ fontSize: '0.8rem' }}>
                            {opt.id === 'actual'
                                ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Chip label={t('summary.chipActual')} size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: '#1976d244', color: '#42a5f5' }} />
                                    {opt.label}
                                </Box>
                                : <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Chip label={t('summary.chipForecast')} size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: '#ed6c0222', color: '#ff9800' }} />
                                    {opt.label}
                                </Box>
                            }
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        ) : null
    );

    return (
        <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* KPI Header Band */}
            <RevenueKpiHeader
                optimalRev={metrics?.optimalRev ?? null}
                bestModelRev={metrics?.bestModelRev ?? null}
                bestModelName={metrics?.bestModelName ?? ''}
                efficiency={metrics?.efficiency ?? null}
                manualRev={metrics?.manualRev ?? null}
                priceBasis={priceBasis}
                referenceName={metrics?.referenceName}
                bestModelRevActual={metrics?.bestModelRevActual ?? null}
                bestModelRevEstimated={metrics?.bestModelRevEstimated ?? null}
                efficiencyActual={metrics?.efficiencyActual ?? null}
                efficiencyEstimated={metrics?.efficiencyEstimated ?? null}
                manualRevActual={metrics?.manualRevActual ?? null}
                manualRevEstimated={metrics?.manualRevEstimated ?? null}
                manualEffectiveCycles={metrics?.manualEffectiveCycles ?? null}
                cycleLimit={cycleLimit}
            />

            {/* 價格參考來源 — 全域，影響所有 Tab 的收益計算 */}
            {priceBasisOptions.length > 1 && (
                <Box sx={{
                    px: 1.5, py: 0.75,
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    borderBottom: '1px solid', borderColor: 'divider',
                    bgcolor: 'var(--card-bg)', flexShrink: 0,
                }}>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                        {(ganttData?.optimal?.length ?? 0) > 0 ? t('summary.revenueBasis') : t('summary.assumedActual')}
                    </Typography>
                    <PriceBasisSelector />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', opacity: 0.7 }}>
                        {priceBasis === 'actual'
                            ? t('summary.basisDescActual')
                            : t('summary.basisDescModel', { model: priceBasisOptions.find(o => o.id === priceBasis)?.label })
                        }
                    </Typography>
                </Box>
            )}

            {/* Tab bar */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0, bgcolor: 'var(--card-bg)' }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    sx={{
                        minHeight: 40,
                        '& .MuiTab-root': { minHeight: 40, fontSize: '0.78rem', fontWeight: 600, textTransform: 'none', py: 0 },
                        '& .Mui-selected': { color: 'var(--primary) !important' },
                        '& .MuiTabs-indicator': { bgcolor: 'var(--primary)' },
                    }}
                >
                    <Tab label={t('summary.tabOverview')} />
                    <Tab label={t('summary.tabAnalysis')} />
                    <Tab label={t('summary.tabDetails')} />
                    <Tab label={t('summary.tabInfo')} />
                </Tabs>
            </Box>

            {/* Tab 0: Overview — 3 synchronized charts in CSS Grid */}
            {activeTab === 0 && (
                <Box sx={{
                    flex: 1,
                    overflow: 'hidden',
                    display: 'grid',
                    gridTemplateRows: '300px 240px 200px',
                    gap: '4px',
                    p: 1,
                    overflowY: 'auto',
                }}>
                    <Box sx={{ minHeight: 0, overflow: 'hidden' }}>
                        <PriceOperationChart
                            ref={priceChartRef}
                            ganttData={ganttData ?? undefined}
                            selectedModels={selectedModels}
                            colors={colors}
                            timeCategories={timeCategories}
                            height={294}
                            title={t('summary.priceOperationTitle')}
                            tooltipLabels={{ action: t('chart.tooltipAction') }}
                            groupId="revenue-time-group"
                        />
                    </Box>
                    {ganttData ? (
                        <Box sx={{ minHeight: 0, overflow: 'hidden' }}>
                            <RevenueGanttChart
                                data={ganttData}
                                selectedModels={selectedModels}
                                timeCategories={timeCategories}
                                colors={colors}
                                opChartRef={opChartRef}
                            />
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px dashed ${borderColor}`, borderRadius: 1 }}>
                            <Typography color="text.secondary" variant="caption">{t('summary.ganttPlaceholder')}</Typography>
                        </Box>
                    )}
                    {ganttData ? (
                        <Box sx={{ minHeight: 0, overflow: 'hidden' }}>
                            <SocLineChart
                                ref={socChartRef}
                                data={ganttData}
                                selectedModels={selectedModels}
                                timeCategories={timeCategories}
                                colors={colors}
                                height={194}
                                groupId="revenue-time-group"
                            />
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px dashed ${borderColor}`, borderRadius: 1 }}>
                            <Typography color="text.secondary" variant="caption">{t('summary.socPlaceholder')}</Typography>
                        </Box>
                    )}
                </Box>
            )}

            {/* Tab 1: Analysis — daily revenue chart + daily revenue table */}
            {activeTab === 1 && (
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5 }}>
                    {hasData ? (
                        <>
                            {/* Header row: title */}
                            <Box sx={{ flexShrink: 0 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {t('summary.dailyRevenueAnalysis')}
                                </Typography>
                            </Box>

                            {/* Bar + cumulative chart */}
                            <Box sx={{ flex: 1, minHeight: 180 }}>
                                <BaseChart option={dailyAnalysisOption as EChartsOption} height='100%' />
                            </Box>

                            {/* Daily revenue summary table */}
                            {allModelDailyData && (
                                <>
                                    <Divider sx={{ flexShrink: 0, borderColor: 'var(--card-border)' }} />
                                    <Box sx={{ flexShrink: 0 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {t('summary.dailyRevenueDetails')}
                                            {priceBasis !== 'actual' && (
                                                <Chip label={t('summary.chipEstimated')} size="small" sx={{ ml: 1, height: 16, fontSize: '0.62rem', bgcolor: '#ed6c0222', color: '#ff9800' }} />
                                            )}
                                        </Typography>
                                        <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 260, border: `1px solid ${borderColor}`, borderRadius: 1, overflowX: 'auto' }}>
                                            <Table size="small" stickyHeader sx={{ minWidth: allModelDailyData.series.length > 2 ? allModelDailyData.series.length * 200 + 80 : 'auto' }}>
                                                <TableHead>
                                                    {/* Row 1: series name headers (colspan 2 each) */}
                                                    <TableRow>
                                                        <TableCell rowSpan={2} sx={{ fontWeight: 700, fontSize: '0.72rem', py: 0.75, bgcolor: 'var(--card-bg)', verticalAlign: 'bottom' }}>{t('summary.dateColumn')}</TableCell>
                                                        {allModelDailyData.series.map(s => (
                                                            <TableCell key={s.id} colSpan={2} align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', py: 0.5, bgcolor: 'var(--card-bg)', borderLeft: `3px solid ${s.color}`, color: s.color, whiteSpace: 'nowrap' }}>
                                                                {s.name}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                    {/* Row 2: 日收益 / 累積 sub-headers */}
                                                    <TableRow>
                                                        {allModelDailyData.series.map(s => (
                                                            <React.Fragment key={s.id}>
                                                                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.68rem', py: 0.5, bgcolor: 'var(--card-bg)', borderLeft: `3px solid ${s.color}`, whiteSpace: 'nowrap' }}>{t('summary.dailyRevenue')}</TableCell>
                                                                <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.68rem', py: 0.5, bgcolor: 'var(--card-bg)', whiteSpace: 'nowrap' }}>{t('summary.cumulativeRevenue')}</TableCell>
                                                            </React.Fragment>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {allModelDailyData.dates.map((date, i) => (
                                                        <TableRow key={date} sx={{ '&:last-child td': { border: 0 } }}>
                                                            <TableCell sx={{ fontSize: '0.75rem', py: 0.5, whiteSpace: 'nowrap' }}>{date}</TableCell>
                                                            {allModelDailyData.series.map(s => {
                                                                const row = s.rows[i];
                                                                return (
                                                                    <React.Fragment key={s.id}>
                                                                        <TableCell align="right" sx={{ fontSize: '0.75rem', py: 0.5, borderLeft: `3px solid ${s.color}`, color: row.daily >= 0 ? 'success.main' : 'error.main', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                                            ¥{row.daily.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}
                                                                        </TableCell>
                                                                        <TableCell align="right" sx={{ fontSize: '0.75rem', py: 0.5, color: row.cumulative >= 0 ? 'text.primary' : 'error.main', whiteSpace: 'nowrap' }}>
                                                                            ¥{row.cumulative.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}
                                                                        </TableCell>
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                </>
                            )}
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, border: `1px dashed ${borderColor}`, borderRadius: 1 }}>
                            <Typography color="text.secondary" variant="caption">{t('summary.analysisPlaceholder')}</Typography>
                        </Box>
                    )}
                </Box>
            )}

            {/* Tab 2: Operation Details — schedule selector + operation table */}
            {activeTab === 2 && (
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5 }}>
                    {ganttData && displayedSchedule.length > 0 ? (
                        <>
                            <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {t('summary.operationDetailsTable')}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <FormControl size="small" sx={{ minWidth: 180 }}>
                                        <InputLabel id="schedule-select-label" sx={{ fontSize: '0.8rem' }}>{t('summary.scheduleTypeLabel')}</InputLabel>
                                        <Select
                                            labelId="schedule-select-label"
                                            value={selectedScheduleId}
                                            label={t('summary.scheduleTypeLabel')}
                                            onChange={(e) => setSelectedScheduleId(e.target.value)}
                                            sx={{ fontSize: '0.8rem' }}
                                        >
                                            {availableSchedules.map(opt => (
                                                <MenuItem key={opt.id} value={opt.id} sx={{ fontSize: '0.8rem' }}>{opt.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>
                            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                <OperationScheduleTable
                                    data={displayedSchedule}
                                    isManualSchedule={selectedScheduleId === 'manual'}
                                    isOptimalSchedule={selectedScheduleId === 'optimal'}
                                    priceBasis={priceBasis}
                                    revenueOverrides={displayedScheduleRevenueAtBasis}
                                />
                            </Box>
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, border: `1px dashed ${borderColor}`, borderRadius: 1 }}>
                            <Typography color="text.secondary" variant="caption">{t('summary.detailsPlaceholder')}</Typography>
                        </Box>
                    )}
                </Box>
            )}

            {/* Tab 3: Info — usage instructions */}
            {activeTab === 3 && (
                <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
                    <RevenueEmptyState />
                </Box>
            )}
        </Box>
    );
};
