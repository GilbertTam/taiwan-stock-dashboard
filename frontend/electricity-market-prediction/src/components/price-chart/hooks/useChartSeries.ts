import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    IChartApi,
    ISeriesApi,
    LineSeries,
    AreaSeries,
    CandlestickSeries,
    HistogramSeries,
    Time,
    LineStyle,
    LineType,
    createSeriesMarkers,
    ISeriesMarkersPluginApi,
} from 'lightweight-charts';
import {
    convertToLineSeriesData,
    toChartTime,
    dateToJstTimestamp,
    ProcessedDataPoint,
} from '@/utils/lightweightChartsHelpers';
import { buildTopBottomMarkers } from '@/utils/chart/topBottomMarkers';
import { StackedBarSeries } from '../plugins/StackedBarSeries';
import { StackedAreaSeries } from '../plugins/StackedAreaSeries';
import { RangeBandSeries } from '../plugins/RangeBandSeries';
import { BatteryStackedFlowSeries } from '../plugins/BatteryStackedFlowSeries';
import { DayBackgroundPrimitive } from '@/components/charts';
import { hexToRgba } from '../utils';
// import { weatherFields } from '../constants'; // Pass this as prop or import? Import is fine.
import {
    weatherFields,
    BID_PLAN_VOLUME_PADDING_FACTOR,
    BID_PLAN_PRICE_RANGE_FACTOR,
    BID_PLAN_MIN_VISUAL_RANGE,
} from '../constants';
import { DAILY_CATEGORIES, WEATHER_FIELD_DISPLAY } from '@/constants/weatherCategories';

const WEATHER_FIELD_COLORS = weatherFields.reduce((acc, curr) => {
    acc[curr.value] = curr.color;
    return acc;
}, {} as Record<string, string>);

interface UseChartSeriesParams {
    chartRef: React.MutableRefObject<IChartApi | null>;
    processedChartData: ProcessedDataPoint[];
    transformedData: any; // Output of useChartDataTransformers
    colors: any;
    darkMode: boolean;
    timezone: string;

    // Model Props
    selectedModels: any[];
    highlightedModelId: string | null;
    modelColorMap: Record<string, string>;

    // Feature Flags & Configs
    showImbalance: boolean;
    showIntraday: boolean;
    showIntradayAverage: boolean;
    showOcctoArea: boolean;
    occtoChartType?: 'area' | 'stacked';
    showWeather: boolean;
    showWeatherActual: boolean;
    showWeatherForecast: boolean;
    selectedWeatherFieldsActual: Set<string>;
    selectedWeatherFieldsForecast: Set<string>;
    showActualPrice: boolean;
    showTopBottomLabels: boolean;

    // Display Options
    showRightAxisLabels: boolean;

    // Series Axis Configuration
    seriesAxisConfig?: Record<string, { axis?: 'Y1' | 'Y2'; scale?: { min?: number; max?: number }; lineType?: 'line' | 'steps' }>;
    hideObsAndPriceRow?: boolean;

    // Range params
    startDate: Date | null;
    endDate: Date | null;

    subchartLayout?: 'split' | 'overlay';
}

export const useChartSeries = ({
    chartRef,
    processedChartData,
    transformedData,
    colors,
    darkMode,
    timezone,
    selectedModels,
    highlightedModelId,
    modelColorMap,
    showImbalance,
    showIntraday,
    showIntradayAverage,
    showOcctoArea,
    occtoChartType,
    showWeather,
    showWeatherActual,
    showWeatherForecast,
    selectedWeatherFieldsActual,
    selectedWeatherFieldsForecast,
    showActualPrice,
    showTopBottomLabels,
    showRightAxisLabels,
    seriesAxisConfig,
    hideObsAndPriceRow,
    startDate,
    endDate,
    subchartLayout,
}: UseChartSeriesParams) => {

    const { t } = useTranslation('forecast');
    const seriesRefs = useRef<Map<string, ISeriesApi<any>>>(new Map());
    const markersRefs = useRef<Map<string, ISeriesMarkersPluginApi<Time>>>(new Map());
    const dayBackgroundRef = useRef<DayBackgroundPrimitive | null>(null);
    const seriesWithBackgroundRef = useRef(new WeakSet<ISeriesApi<any>>());
    const occtoChartTypeRef = useRef<'area' | 'stacked' | undefined>(undefined);
    // Track previous chart instance to detect changes
    const prevChartRef = useRef<IChartApi | null>(null);
    // Track if initial visible range was set for current chart instance
    const hasSetInitialRangeRef = useRef(false);
    const lastLayoutKeyRef = useRef<string | null>(null);

    // Effect to clean up series refs when chart instance changes
    useEffect(() => {
        const currentChart = chartRef.current;
        if (prevChartRef.current !== currentChart) {
            seriesRefs.current.clear();
            markersRefs.current.clear();
            seriesWithBackgroundRef.current = new WeakSet();
            dayBackgroundRef.current = null;
            occtoChartTypeRef.current = undefined;
            hasSetInitialRangeRef.current = false;
            lastLayoutKeyRef.current = null; // Force layout re-apply for new chart
            prevChartRef.current = currentChart;
        }
    });

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || !processedChartData || processedChartData.length === 0) return;

        // Check if chart is disposed by trying a safe operation
        try {
            chart.timeScale(); // Simple check - will throw if disposed
        } catch (e) {
            console.warn('Chart is disposed, skipping series update');
            return;
        }

        const seriesMap = seriesRefs.current;
        const activeKeys = new Set<string>();
        const usedSubCharts = new Set<string>();

        // Helper to Create/Update Series
        const updateOrAdd = (key: string, type: any, data: any[], opts: any) => {
            activeKeys.add(key);
            let s = seriesMap.get(key);
            if (!s) {
                if (type === 'Custom' && opts.customSeriesInstance) {
                    s = chart.addCustomSeries(opts.customSeriesInstance, opts);
                } else {
                    s = chart.addSeries(type, opts);
                }
                seriesMap.set(key, s);
            } else {
                s.applyOptions(opts);
            }
            try { if (data.length > 0) s.setData(data); }
            catch (e) { console.warn(`SetData failed for ${key}`, e); }
            return s;
        };

        // Per-series line type: default to step (matches 30-min market interval),
        // explicit 'line' choice → LineType.Simple. Must pass an enum value (not undefined)
        // so applyOptions on an existing series correctly switches back.
        const resolveLineType = (key: string) =>
            seriesAxisConfig?.[key]?.lineType === 'line' ? LineType.Simple : LineType.WithSteps;

        // Top-K / Bottom-K price-value label markers (series-level, transform layer).
        const applyMarkers = (key: string, series: ISeriesApi<any>, markers: any[]) => {
            let plugin = markersRefs.current.get(key);
            if (!plugin) {
                plugin = createSeriesMarkers(series, markers);
                markersRefs.current.set(key, plugin);
            } else {
                plugin.setMarkers(markers);
            }
        };
        const clearMarkers = (key: string) => {
            markersRefs.current.get(key)?.setMarkers([]);
        };

        const {
            candleData,
            intradayAvgData,
            actualData,
            imbalanceData,
            imbalanceSurplusData,
            imbalanceDeficitData,
            interconnectionSeries,
            batteryFlowData,
            batterySocSeries,
            tdgcSeries,
            bidPlanSeries,
            occtoData,
        } = transformedData;

        // --- A. Background & Stacked Areas (Bottom Layer) ---

        // Day Background Primitive
        if (!dayBackgroundRef.current) {
            dayBackgroundRef.current = new DayBackgroundPrimitive({ even: 'rgba(0,0,0,0)', odd: 'rgba(60, 70, 90, 0.3)' });
        }
        dayBackgroundRef.current.updateZones(processedChartData.map(p => p.timestamp), timezone);

        // OCCTO (Stacked)
        if (showOcctoArea && occtoData.length > 0) {
            const prevType = occtoChartTypeRef.current;
            const typeChanged = prevType !== undefined && prevType !== occtoChartType;
            if (typeChanged) {
                const existing = seriesMap.get('occto_custom');
                if (existing) {
                    chart.removeSeries(existing);
                    seriesMap.delete('occto_custom');
                }
            }
            occtoChartTypeRef.current = occtoChartType;

            const SeriesClass = occtoChartType === 'area' ? StackedAreaSeries : StackedBarSeries;
            const customInstance = new SeriesClass();

            // Map data items to include color properties required by StackedAreaSeries
            const finalData = occtoChartType === 'area'
                ? occtoData.map((d: any) => ({ ...d, items: d.items.map((i: any) => ({ value: i.value, lineColor: i.color, areaColor: i.color })) }))
                : occtoData;

            updateOrAdd('occto_custom', 'Custom', finalData, {
                customSeriesInstance: customInstance,
                priceScaleId: 'occto',
                priceFormat: { type: 'volume' },
            });
            usedSubCharts.add('occto');
        } else {
            occtoChartTypeRef.current = undefined;
        }

        // Interconnection (Area)
        interconnectionSeries.forEach(({ fieldKey, data, color }: { fieldKey: string; data: any[]; color: string }) => {
            if (data.length > 0) {
                updateOrAdd(`interconnection_${fieldKey}`, LineSeries, data, {
                    color,
                    lineWidth: 1,
                    priceScaleId: 'interconnection',
                    title: showRightAxisLabels ? fieldKey : '',
                });
                usedSubCharts.add('interconnection');
            }
        });

        // Battery flow (volumes from spot/intraday/primary) — single custom plugin series,
        // stacks positive/negative on its own scale so SoC doesn't dominate.
        if (batteryFlowData && batteryFlowData.length > 0) {
            updateOrAdd('battery_flow', 'Custom', batteryFlowData, {
                customSeriesInstance: new BatteryStackedFlowSeries(),
                priceScaleId: 'battery_flow',
                priceLineVisible: false,
                lastValueVisible: false,
            });
            usedSubCharts.add('battery_flow');
        }

        // Battery SoC: virtual SoC as gradient area, actual SoC as dashed line for comparison.
        // Separate priceScaleId ('battery_soc') keeps them off the flow scale.
        batterySocSeries.forEach(({ fieldKey, data, color, label }: { fieldKey: string; data: any[]; color: string; label: string }) => {
            if (data.length === 0) return;
            if (fieldKey === 'soc_kwh') {
                updateOrAdd(`battery_${fieldKey}`, AreaSeries, data, {
                    lineColor: color,
                    topColor: hexToRgba(color, 0.35),
                    bottomColor: hexToRgba(color, 0.02),
                    lineWidth: 2,
                    priceScaleId: 'battery_soc',
                    title: showRightAxisLabels ? label : '',
                });
            } else {
                updateOrAdd(`battery_${fieldKey}`, LineSeries, data, {
                    color,
                    lineStyle: LineStyle.Dashed,
                    lineWidth: 1,
                    priceScaleId: 'battery_soc',
                    title: showRightAxisLabels ? label : '',
                });
            }
            usedSubCharts.add('battery_soc');
        });

        // ── TDGC rendering ─────────────────────────────────────────────────
        // Pre-pass: bucket band trios, regular lines, individual histograms, stacked histograms.
        type TdgcItem = { fieldKey: string; data: any[]; color: string; label?: string;
                          seriesType?: string; lineStyle?: number; opacity?: number;
                          bandRole?: 'min'|'max'|'ave'; bandKey?: string; stackingKey?: string };
        const tdgcAll = tdgcSeries as TdgcItem[];

        const bandsByKey = new Map<string, { min?: any[]; max?: any[]; color: string; opacity: number }>();
        const tdgcLines: TdgcItem[] = [];
        const tdgcHistogramsByStack = new Map<string, TdgcItem[]>(); // stackingKey ('' if none) → items
        tdgcHistogramsByStack.set('', []);

        tdgcAll.forEach(s => {
            if (s.data.length === 0) return;
            if (s.bandRole === 'min' || s.bandRole === 'max') {
                if (!s.bandKey) return;
                const entry = bandsByKey.get(s.bandKey) ?? { color: s.color, opacity: s.opacity ?? 1 };
                if (s.bandRole === 'min') entry.min = s.data;
                else entry.max = s.data;
                entry.color = s.color;
                entry.opacity = s.opacity ?? 1;
                bandsByKey.set(s.bandKey, entry);
            } else if (s.seriesType === 'histogram') {
                const key = s.stackingKey ?? '';
                const arr = tdgcHistogramsByStack.get(key) ?? [];
                arr.push(s);
                tdgcHistogramsByStack.set(key, arr);
            } else {
                tdgcLines.push(s);
            }
        });

        // 1. Render bands (min↔max polygon, ave drawn separately as a LineSeries below).
        bandsByKey.forEach((band, bandKey) => {
            if (!band.min || !band.max) return;
            const minMap = new Map(band.min.map((p: any) => [p.time, p.value]));
            const maxMap = new Map(band.max.map((p: any) => [p.time, p.value]));
            const times = Array.from(new Set([...minMap.keys(), ...maxMap.keys()])).sort((a, b) => (a as number) - (b as number));
            const bandData = times
                .map(t => {
                    const mn = minMap.get(t);
                    const mx = maxMap.get(t);
                    if (mn == null || mx == null) return null;
                    return {
                        time: t,
                        min: Math.min(mn, mx),
                        max: Math.max(mn, mx),
                        lineColor: hexToRgba(band.color, 0.35 * band.opacity),
                        areaColor: hexToRgba(band.color, 0.18 * band.opacity),
                    };
                })
                .filter((d): d is NonNullable<typeof d> => d != null);

            if (bandData.length === 0) return;
            const configKey = `tdgc_band_${bandKey}`;
            const targetScale = seriesAxisConfig?.[configKey]?.axis === 'Y2' ? 'left' : 'right';
            updateOrAdd(configKey, 'Custom', bandData, {
                customSeriesInstance: new RangeBandSeries(),
                priceScaleId: targetScale,
                priceLineVisible: false,
                lastValueVisible: false,
            });
            usedSubCharts.add(targetScale);
        });

        // 2. Render lines (price ave + any non-band line).
        tdgcLines.forEach(s => {
            const configKey = `tdgc_${s.fieldKey}`;
            const targetScale = seriesAxisConfig?.[configKey]?.axis === 'Y2' ? 'left' : 'right';
            updateOrAdd(configKey, LineSeries, s.data, {
                color: s.color,
                lineWidth: 1,
                lineStyle: s.lineStyle ?? 0,
                lineType: resolveLineType(configKey),
                ...(s.opacity != null && s.opacity < 1 ? { crosshairMarkerVisible: true } : {}),
                priceScaleId: targetScale,
                title: showRightAxisLabels ? (s.label || s.fieldKey) : '',
            });
            usedSubCharts.add(targetScale);
        });

        // 3a. Render non-stacked histograms individually (existing behavior).
        (tdgcHistogramsByStack.get('') ?? []).forEach(s => {
            const effectiveColor = s.opacity != null && s.opacity < 1
                ? hexToRgba(s.color, s.opacity)
                : s.color;
            updateOrAdd(`tdgc_${s.fieldKey}`, HistogramSeries, s.data, {
                color: effectiveColor,
                priceScaleId: 'tdgc_qty',
                title: showRightAxisLabels ? (s.label || s.fieldKey) : '',
            });
            usedSubCharts.add('tdgc_qty');
        });

        // 3b. Render stacked histograms per stackingKey via StackedBarSeries.
        // Single-entry groups fall back to a normal HistogramSeries.
        tdgcHistogramsByStack.forEach((items, stackKey) => {
            if (stackKey === '' || items.length === 0) return;
            if (items.length === 1) {
                const s = items[0];
                const effectiveColor = s.opacity != null && s.opacity < 1
                    ? hexToRgba(s.color, s.opacity)
                    : s.color;
                updateOrAdd(`tdgc_${s.fieldKey}`, HistogramSeries, s.data, {
                    color: effectiveColor,
                    priceScaleId: 'tdgc_qty',
                    title: showRightAxisLabels ? (s.label || s.fieldKey) : '',
                });
                usedSubCharts.add('tdgc_qty');
                return;
            }
            // Multi-entry: zip by time into StackedBarSeries items.
            const allTimes = new Set<number>();
            const lookups = items.map(s => {
                const m = new Map<number, number>();
                s.data.forEach((p: any) => { allTimes.add(p.time); m.set(p.time, p.value); });
                return m;
            });
            const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);
            const stackData = sortedTimes.map(t => ({
                time: t as any,
                items: items.map((s, i) => {
                    const v = lookups[i].get(t);
                    const opa = s.opacity ?? 1;
                    return {
                        value: v ?? 0,
                        color: hexToRgba(s.color, 0.85 * opa),
                    };
                }),
            }));
            updateOrAdd(`tdgc_stack_${stackKey}`, 'Custom', stackData, {
                customSeriesInstance: new StackedBarSeries(),
                priceScaleId: 'tdgc_qty',
                priceFormat: { type: 'volume' },
            });
            usedSubCharts.add('tdgc_qty');
        });

        // 投標電量使用左 Y 軸（買賣電共用），投標價格使用右側 overlay
        const bidPlanVolumeMaxByScale = new Map<string, number>();
        bidPlanSeries.forEach(({ fieldKey, data }: { fieldKey: string; data: any[] }) => {
            if (!fieldKey.includes('volume') || data.length === 0) return;
            const scaleId = 'left';
            let currentMax = bidPlanVolumeMaxByScale.get(scaleId) ?? 0;
            data.forEach((point: any) => {
                const v = typeof point.value === 'number' ? Math.abs(point.value) : null;
                if (v != null && !Number.isNaN(v) && v > currentMax) {
                    currentMax = v;
                }
            });
            if (currentMax > 0) {
                bidPlanVolumeMaxByScale.set(scaleId, currentMax);
            }
        });

        bidPlanSeries.forEach(({ fieldKey, data, label, color }: { fieldKey: string; data: any[]; label: string; color: string }) => {
            if (data.length > 0) {
                const isVolume = fieldKey.includes('volume');
                const scaleId = isVolume ? 'left' : 'bidPlan_price';
                const SeriesType = isVolume ? HistogramSeries : LineSeries;
                const commonOptions = {
                    color,
                    priceScaleId: scaleId,
                    title: showRightAxisLabels ? (isVolume ? t('chartPanel.bidPlanVolume') : t('chartPanel.bidPlanPrice')) : '',
                };

                // Add specific options based on series type
                const options = isVolume
                    ? {
                        ...commonOptions,
                        // Remove custom autoscale to let chart show full range
                    }
                    : {
                        ...commonOptions,
                        lineWidth: 2,
                        // Remove custom autoscale to let chart show full range
                    };

                updateOrAdd(`bidPlan_${fieldKey}`, SeriesType, data, options);
                usedSubCharts.add(scaleId);
            }
        });

        // --- B. Bars & Histograms (Middle Layer) ---

        // Weather Data
        if (showWeather) {
            const isWeatherOnly = hideObsAndPriceRow === true;
            const dailyFieldsSet = new Set(DAILY_CATEGORIES.flatMap(c => c.fields));

            // In split mode + weather only, we want to assign the first few fields to primary scales (right, left)
            // to ensure native axes are drawn and have labels.
            const uniqueWeatherFields = Array.from(new Set([
                ...(showWeatherActual ? Array.from(selectedWeatherFieldsActual) : []),
                ...(showWeatherForecast ? Array.from(selectedWeatherFieldsForecast) : [])
            ]));

            const weatherScaleMap: Record<string, string> = {};

            if (isWeatherOnly && subchartLayout === 'split') {
                // Determine available native axes
                const availableAxes = ['right', 'left'];
                let axisIndex = 0;

                uniqueWeatherFields.forEach(field => {
                    // 1. Check user preference first
                    const isActualActive = showWeatherActual && selectedWeatherFieldsActual.has(field);
                    const isForecastActive = showWeatherForecast && selectedWeatherFieldsForecast.has(field);

                    let userAxisChoice: string | undefined;

                    // Prioritize finding a user config (check actual then forecast if both active)
                    if (isActualActive) {
                        const freqStr = dailyFieldsSet.has(field) ? 'day' : 'hour';
                        const itemKey = `weather-actual-${freqStr}-${field}`;
                        userAxisChoice = seriesAxisConfig?.[itemKey]?.axis;
                    }
                    if (!userAxisChoice && isForecastActive) {
                        const freqStr = dailyFieldsSet.has(field) ? 'day' : 'hour';
                        const itemKey = `weather-forecast-${freqStr}-${field}`;
                        userAxisChoice = seriesAxisConfig?.[itemKey]?.axis;
                    }

                    if (userAxisChoice === 'Y2') {
                        weatherScaleMap[field] = 'left';
                    } else if (userAxisChoice === 'Y1') {
                        weatherScaleMap[field] = 'right';
                    } else {
                        // 2. Fallback to existing un-assigned axes for the first two variables
                        if (axisIndex < availableAxes.length) {
                            const target = availableAxes[axisIndex];
                            weatherScaleMap[field] = target;
                            axisIndex++;
                        }
                    }
                });
            }

            const processWeather = (fields: Set<string>, dataObjKey: 'weather_data_actual' | 'weather_data_forecast', prefix: string) => {
                fields.forEach(field => {
                    const isBar = field.includes('precipitation') || field.includes('rain') || field.includes('snowfall');
                    const isDaily = dailyFieldsSet.has(field);
                    const seriesType = isBar ? HistogramSeries : LineSeries;
                    const data = convertToLineSeriesData(processedChartData, p => (p as any)[dataObjKey]?.[field] ?? null, timezone);

                    if (data.length > 0) {
                        const weatherConfig = weatherFields.find(w => w.value === field);
                        const display = WEATHER_FIELD_DISPLAY[field];
                        const isDaily = dailyFieldsSet.has(field);
                        const typeStr = prefix.includes('forecast') ? '預測' : '實測';
                        const freqStr = isDaily ? 'day' : 'hour';
                        const itemKey = `${prefix.replace('_', '-')}-${freqStr}-${field}`;
                        const label = `[${typeStr}·${isDaily ? '日' : '時'}] ${display?.shortLabelKey ? t(display.shortLabelKey) : (weatherConfig?.labelKey ? t(weatherConfig.labelKey) : field)}`;
                        let targetScale = 'weather_overlay_' + field;

                        // Try to find a color: exact match, then prefix match
                        let color = WEATHER_FIELD_COLORS[field];
                        if (!color) {
                            const baseField = weatherFields.find(w => field.startsWith(w.value.split('_')[0]));
                            color = baseField?.color || '#888';
                        }

                        // Unify target scale logic: user config always wins
                        const assignedAxis = seriesAxisConfig?.[itemKey]?.axis;

                        if (isWeatherOnly) {
                            if (subchartLayout === 'split') {
                                // Use the unified map which respects user config, or fallback to a custom panel
                                targetScale = weatherScaleMap[field] || ('weather_overlay_' + field);
                            } else {
                                // Overlay mode: Y2 -> left, else default to right
                                if (assignedAxis === 'Y2') {
                                    targetScale = 'left';
                                } else {
                                    targetScale = 'right';
                                }
                            }
                        } else {
                            // Non-weather-only mode: Y2 -> left, else default to Y1 which for weather currently is grouped or specific, 
                            // but in this logic we'll default it to 'right' (primary data axis) if no specific weather overlay is set
                            // Note: earlier implementation defaulted to Y1? No, existing code was falling through.
                            if (assignedAxis === 'Y2') {
                                targetScale = 'left';
                            } else {
                                targetScale = 'right';
                            }
                        }

                        const isForecast = prefix.includes('forecast');
                        const finalColor = isForecast ? hexToRgba(color, 0.6) : color;

                        updateOrAdd(`${prefix}_${field}`, seriesType, data, {
                            color: finalColor,
                            priceScaleId: targetScale,
                            lineWidth: isDaily ? 4 : 2,
                            lineStyle: isForecast && !isBar ? LineStyle.Dashed : LineStyle.Solid,
                            lineType: isDaily && !isBar ? LineType.WithSteps : undefined,
                            title: showRightAxisLabels ? label : '',
                            autoscaleInfoProvider: (original: () => any) => {
                                const customRange = seriesAxisConfig?.[itemKey]?.scale;
                                const res = original();
                                if (customRange && (customRange.min !== undefined || customRange.max !== undefined)) {
                                    const finalRes = res || {
                                        priceRange: { minValue: 0, maxValue: 100 },
                                        margins: { above: 0.1, below: 0.1 }
                                    };
                                    if (customRange.min !== undefined) finalRes.priceRange.minValue = customRange.min;
                                    if (customRange.max !== undefined) finalRes.priceRange.maxValue = customRange.max;
                                    return finalRes;
                                }
                                return res;
                            }
                        });

                        if (targetScale === 'weather') {
                            usedSubCharts.add('weather');
                        } else if (targetScale === 'weather_secondary') {
                            usedSubCharts.add('weather_secondary');
                        } else if (targetScale === 'left') {
                            usedSubCharts.add('left');
                        } else if (targetScale === 'right') {
                            usedSubCharts.add('right');
                        } else if (targetScale.startsWith('weather_overlay_')) {
                            usedSubCharts.add(targetScale);
                        }
                    }
                });
            };
            if (showWeatherActual) processWeather(selectedWeatherFieldsActual, 'weather_data_actual', 'weather_actual');
            if (showWeatherForecast) processWeather(selectedWeatherFieldsForecast, 'weather_data_forecast', 'weather_forecast');
        }

        // --- C. Lines & Main Data (Top Layer) ---

        // Imbalance Quantity (Separate Axis)
        if (imbalanceData.length > 0) {
            updateOrAdd('imbalance', HistogramSeries, imbalanceData, {
                color: colors.imbalance,
                priceScaleId: 'imbalance',
                title: showRightAxisLabels ? t('chartPanel.seriesImbalanceQty') : '',
            });
            usedSubCharts.add('imbalance');
        }

        // Imbalance Rates (Main Axis)
        if (imbalanceSurplusData && imbalanceSurplusData.length > 0) {
            const targetScale = seriesAxisConfig?.['imbalance_surplus']?.axis === 'Y2' ? 'left' : 'right';
            updateOrAdd('imbalance_surplus', LineSeries, imbalanceSurplusData, {
                color: colors.imbalanceSurplus,
                priceScaleId: targetScale,
                lineWidth: 2,
                lineType: resolveLineType('imbalance_surplus'),
                // Use title on the right price scale to show the line name;
                // toggle it via showRightAxisLabels.
                title: showRightAxisLabels ? t('chartPanel.surplusRate') : '',
            });
            usedSubCharts.add(targetScale);
        }
        if (imbalanceDeficitData && imbalanceDeficitData.length > 0) {
            const targetScale = seriesAxisConfig?.['imbalance_deficit']?.axis === 'Y2' ? 'left' : 'right';
            updateOrAdd('imbalance_deficit', LineSeries, imbalanceDeficitData, {
                color: colors.imbalanceDeficit,
                priceScaleId: targetScale,
                lineWidth: 2,
                lineType: resolveLineType('imbalance_deficit'),
                title: showRightAxisLabels ? t('chartPanel.deficitRate') : '',
            });
            usedSubCharts.add(targetScale);
        }

        // Intraday Candlesticks
        if (candleData.length > 0) {
            const alpha = showIntradayAverage ? 0.5 : 1;
            const targetScale = seriesAxisConfig?.['intraday']?.axis === 'Y2' ? 'left' : 'right';
            updateOrAdd('intraday', CandlestickSeries, candleData, {
                upColor: `rgba(239, 83, 80, ${alpha})`,
                downColor: `rgba(38, 166, 154, ${alpha})`,
                wickUpColor: `rgba(239, 83, 80, ${alpha})`,
                wickDownColor: `rgba(38, 166, 154, ${alpha})`,
                priceScaleId: targetScale,
                title: showRightAxisLabels ? t('chartPanel.seriesIntraday') : '',
            });
            usedSubCharts.add(targetScale);
        }
        if (intradayAvgData.length > 0) {
            const targetScale = seriesAxisConfig?.['intraday_avg']?.axis === 'Y2' ? 'left' : 'right';
            updateOrAdd('intraday_avg', LineSeries, intradayAvgData, {
                color: '#ffa726',
                lineWidth: 2,
                lineStyle: LineStyle.Dashed,
                lineType: resolveLineType('intraday_avg'),
                priceScaleId: targetScale,
                title: showRightAxisLabels ? t('chartPanel.seriesIntradayAvg') : '',
            });
            usedSubCharts.add(targetScale);
        }

        // Models
        selectedModels.forEach(model => {
            const modelKey = `${model.id}|${model.name}`;
            const color = modelColorMap[modelKey];
            const isHighlighted = highlightedModelId === null || highlightedModelId === modelKey;

            const lineData = convertToLineSeriesData(processedChartData, p => {
                const pred = p.modelPredictions.find(mp => `${mp.modelId}|${mp.modelName}` === modelKey);
                return pred?.predictedPrice ?? null;
            }, timezone);

            if (lineData.length > 0) {
                const targetScale = seriesAxisConfig?.[`model-${modelKey}`]?.axis === 'Y2' ? 'left' : 'right';
                const ms = updateOrAdd(`model-${modelKey}`, LineSeries, lineData, {
                    color: color,
                    lineWidth: isHighlighted ? 3 : 1,
                    lineType: resolveLineType(`model-${modelKey}`),
                    priceScaleId: targetScale,
                    visible: true,
                    title: showRightAxisLabels ? model.name : '',
                    autoscaleInfoProvider: (original: () => any) => {
                        const customRange = seriesAxisConfig?.[`model-${modelKey}`]?.scale;
                        const res = original();
                        if (customRange && (customRange.min !== undefined || customRange.max !== undefined)) {
                            if (res) {
                                if (customRange.min !== undefined) res.priceRange.minValue = customRange.min;
                                if (customRange.max !== undefined) res.priceRange.maxValue = customRange.max;
                                return res;
                            }
                            return {
                                priceRange: {
                                    minValue: customRange.min ?? 0,
                                    maxValue: customRange.max ?? 100
                                },
                                margins: { above: 0.1, below: 0.1 }
                            };
                        }
                        return res;
                    }
                });
                usedSubCharts.add(targetScale);

                if (showTopBottomLabels) {
                    applyMarkers(`model-${modelKey}`, ms, buildTopBottomMarkers(
                        processedChartData,
                        p => p.modelPredictions.find(mp => `${mp.modelId}|${mp.modelName}` === modelKey)?.predictedPrice ?? null,
                        p => (p as any).markerInfo?.models?.[modelKey],
                        color,
                        timezone,
                    ));
                } else {
                    clearMarkers(`model-${modelKey}`);
                }
            }
        });

        // Actual Price (Top-most line)
        if (actualData.length > 0 && showActualPrice) {
            const targetScale = seriesAxisConfig?.['price']?.axis === 'Y2' ? 'left' : 'right';
            const s = updateOrAdd('actual', LineSeries, actualData, {
                color: colors.actual,
                lineWidth: 2,
                lineType: resolveLineType('price'),
                priceScaleId: targetScale,
                title: showRightAxisLabels ? t('chartPanel.seriesActual') : '',
                autoscaleInfoProvider: (original: () => any) => {
                    const customRange = seriesAxisConfig?.['price']?.scale;
                    const res = original();
                    if (customRange && (customRange.min !== undefined || customRange.max !== undefined)) {
                        if (res) {
                            if (customRange.min !== undefined) res.priceRange.minValue = customRange.min;
                            if (customRange.max !== undefined) res.priceRange.maxValue = customRange.max;
                            return res;
                        }
                        return {
                            priceRange: {
                                minValue: customRange.min ?? 0,
                                maxValue: customRange.max ?? 100
                            },
                            margins: { above: 0.1, below: 0.1 }
                        };
                    }
                    return res;
                }
            });
            usedSubCharts.add(targetScale);

            if (dayBackgroundRef.current && s && !seriesWithBackgroundRef.current.has(s)) {
                s.attachPrimitive(dayBackgroundRef.current);
                seriesWithBackgroundRef.current.add(s);
            }

            if (showTopBottomLabels) {
                applyMarkers('actual', s, buildTopBottomMarkers(
                    processedChartData,
                    p => p.actualPrice,
                    p => (p as any).markerInfo?.actualType,
                    colors.actual,
                    timezone,
                ));
            } else {
                clearMarkers('actual');
            }
        } else if (activeKeys.size > 0 && dayBackgroundRef.current) {
            const firstSeriesKey = activeKeys.values().next().value as string | undefined;
            const s = firstSeriesKey != null ? seriesMap.get(firstSeriesKey) : undefined;
            if (s && !seriesWithBackgroundRef.current.has(s)) {
                s.attachPrimitive(dayBackgroundRef.current);
                seriesWithBackgroundRef.current.add(s);
            }
        }

        // --- Cleanup Unused Series ---
        const toRemove: string[] = [];
        seriesMap.forEach((_, k) => { if (!activeKeys.has(k)) toRemove.push(k); });
        toRemove.forEach(k => {
            const s = seriesMap.get(k);
            if (s) {
                try { chart.removeSeries(s); } catch (e) { /* Chart may be disposed */ }
                seriesMap.delete(k);
                const mp = markersRefs.current.get(k);
                if (mp) {
                    try { mp.detach(); } catch (e) { /* plugin may already be detached */ }
                    markersRefs.current.delete(k);
                }
            }
        });

        // --- Layout Configuration (SubCharts) ---
        // 雙 Y 軸：投標電量用左軸 (left)、投標價格用右側 overlay (bidPlan_price)
        try {
            const knownSubCharts = ['imbalance', 'interconnection', 'battery_flow', 'battery_soc', 'tdgc_qty', 'occto', 'weather', 'weather_secondary', 'bidPlan_price'];
            const activeSubCharts = knownSubCharts.filter(k => usedSubCharts.has(k));

            // In split mode on weather-only page, also treat each weather_overlay scale as a subchart panel
            const isOverlay = subchartLayout === 'overlay';
            const hasPriceSeries = actualData.length > 0 || selectedModels.length > 0;
            // A more robust check for whether we are effectively in a weather-only view
            const isWeatherOnly = hideObsAndPriceRow === true || (!hasPriceSeries && usedSubCharts.size > 0 && Array.from(usedSubCharts).every(k => k.startsWith('weather') || k === 'right' || k === 'left'));

            if (!isOverlay) {
                // In split weather-only mode, if right/left were used for weather, add them to activeSubCharts
                if (isWeatherOnly) {
                    if (usedSubCharts.has('right') && !activeSubCharts.includes('right')) activeSubCharts.push('right');
                    if (usedSubCharts.has('left') && !activeSubCharts.includes('left')) activeSubCharts.push('left');
                }

                usedSubCharts.forEach(key => {
                    if (key.startsWith('weather_overlay_')) {
                        // Avoid duplicates in activeSubCharts
                        if (!activeSubCharts.includes(key)) {
                            activeSubCharts.push(key);
                        }
                    }
                });
            }

            const isSplitWeatherOnly = !isOverlay && isWeatherOnly;
            const topMargin = 0.25;
            const totalAvailableHeight = 1.0 - topMargin - 0.05; // Leave 5% at bottom

            const subHeight = isSplitWeatherOnly
                ? Math.min(0.32, totalAvailableHeight / Math.max(1, activeSubCharts.length))
                : (isWeatherOnly ? 0.32 : 0.12);

            const gap = isSplitWeatherOnly ? 0.01 : 0.02;
            const mainBottom = (!isOverlay && activeSubCharts.length > 0)
                ? Math.min(0.9, (activeSubCharts.length * (subHeight + gap)) + 0.02)
                : 0.08;

            // 1. Right Scale Configuration
            // In split weather-only mode, if 'right' is used as a sub-panel, it will be handled by the loop below.
            const isRightSubPanel = !isOverlay && isWeatherOnly && usedSubCharts.has('right');
            if (!isRightSubPanel) {
                chart.priceScale('right').applyOptions({
                    scaleMargins: { top: 0.25, bottom: isWeatherOnly ? 0.08 : mainBottom },
                    visible: true,
                    borderVisible: true,
                    borderColor: colors.grid,
                });
            } else {
                chart.priceScale('right').applyOptions({
                    // Minimum width to ensure the title and axis labels have space
                    minimumWidth: 64,
                });
            }

            // 2. Left Scale Configuration
            const isLeftSubPanel = !isOverlay && isWeatherOnly && usedSubCharts.has('left');
            if (usedSubCharts.has('left') && !isLeftSubPanel) {
                // Ensure left scale is visible if it's used
                chart.priceScale('left').applyOptions({
                    scaleMargins: { top: 0.25, bottom: isWeatherOnly ? 0.08 : mainBottom },
                    visible: true,
                    borderVisible: true,
                    borderColor: colors.grid,
                });
            } else if (!isLeftSubPanel) {
                chart.priceScale('left').applyOptions({ visible: false });
            } else if (isLeftSubPanel && isWeatherOnly) {
                chart.priceScale('left').applyOptions({
                    minimumWidth: 64,
                });
            }

            // Ensure any weather_overlay_ scales share the same margins as the main area.
            usedSubCharts.forEach(key => {
                if (key.startsWith('weather_overlay_')) {
                    // In overlay mode, these don't show labels on the side,
                    // but they must have correct margins to line up with the grid.
                    // In split mode, the loop below will override margins per panel.
                    chart.priceScale(key).applyOptions({
                        scaleMargins: { top: 0.25, bottom: isWeatherOnly ? 0.08 : mainBottom },
                        visible: false, // These are overlay scales, they don't have side labels anyway
                        autoScale: true,
                    });
                }
            });

            const layoutKey = activeSubCharts.slice().sort().join(',');
            if (lastLayoutKeyRef.current !== layoutKey) {
                lastLayoutKeyRef.current = layoutKey;
            }

            // 2. We apply subchart options on every tick to ensure weather axes appear correctly
            // (even if layoutKey hasn't changed, series initialization racing could hide it otherwise)
            let currentTop = 1.0;
            activeSubCharts.reverse().forEach(key => {
                let margins;
                let isVisible = true;
                const isWeatherAxis = key === 'weather' || key === 'weather_secondary' || key.startsWith('weather_overlay_');

                if (isOverlay) {
                    margins = { top: 0.22, bottom: mainBottom };
                    // For overlay mode, typically we don't show individual axes for sub-charts 
                    // if they are meant to be overlaid on the primary axis.
                    // But if it's a panel (like imbalance), it still needs visibility.
                    isVisible = true;
                } else {
                    const bottom = currentTop;
                    const top = Math.max(0, currentTop - subHeight);
                    currentTop = top - gap;
                    margins = { top, bottom: 1.0 - bottom };
                }

                chart.priceScale(key).applyOptions({
                    visible: true,
                    autoScale: true,
                    scaleMargins: margins,
                    borderVisible: true,
                    borderColor: colors.grid,
                    ...((isWeatherAxis && !isOverlay) ? { minimumWidth: 64, ensureEdgeTickMarksVisible: true } : {})
                });
            });

            // --- Set Weather Range directly ---
            // If scale overrides are defined for weather specifically used on Y1/Y2 weather axes
            if (usedSubCharts.has('weather')) {
                const dailyFieldsSet = new Set(DAILY_CATEGORIES.flatMap(c => c.fields));

                // Helper to get unique key for scaling lookup
                const getWKey = (f: string, isForecast: boolean) => {
                    const freqStr = dailyFieldsSet.has(f) ? 'day' : 'hour';
                    return `weather-${isForecast ? 'forecast' : 'actual'}-${freqStr}-${f}`;
                };

                // Find any field that is mapped to Y1 (or no axis specified, which defaults to Y1 for weather)
                const y1Fields = [
                    ...Array.from(selectedWeatherFieldsActual).map(f => ({ f, isForecast: false })),
                    ...Array.from(selectedWeatherFieldsForecast).map(f => ({ f, isForecast: true }))
                ].filter(({ f, isForecast }) => {
                    const itemKey = getWKey(f, isForecast);
                    return !seriesAxisConfig?.[itemKey]?.axis || seriesAxisConfig?.[itemKey]?.axis === 'Y1';
                });

                // Grab the first field with a custom scale to apply to the main weather axis
                const fieldWithScale = y1Fields.find(({ f, isForecast }) => {
                    const itemKey = getWKey(f, isForecast);
                    return seriesAxisConfig?.[itemKey]?.scale?.min !== undefined || seriesAxisConfig?.[itemKey]?.scale?.max !== undefined;
                });

                if (fieldWithScale) {
                    const itemKey = getWKey(fieldWithScale.f, fieldWithScale.isForecast);
                    const scaleCfg = seriesAxisConfig?.[itemKey]?.scale;
                    if (scaleCfg && (scaleCfg.min !== undefined || scaleCfg.max !== undefined)) {
                        chart.priceScale('weather').setAutoScale(false);
                        const currentRange = chart.priceScale('weather').getVisibleRange() || { from: 0, to: 100 };
                        chart.priceScale('weather').setVisibleRange({
                            from: scaleCfg.min ?? currentRange.from,
                            to: scaleCfg.max ?? currentRange.to
                        });
                    }
                } else {
                    chart.priceScale('weather').setAutoScale(true);
                }
            }

            if (usedSubCharts.has('weather_secondary')) {
                const dailyFieldsSet = new Set(DAILY_CATEGORIES.flatMap(c => c.fields));
                const getWKey = (f: string, isForecast: boolean) => {
                    const freqStr = dailyFieldsSet.has(f) ? 'day' : 'hour';
                    return `weather-${isForecast ? 'forecast' : 'actual'}-${freqStr}-${f}`;
                };

                const y2Fields = [
                    ...Array.from(selectedWeatherFieldsActual).map(f => ({ f, isForecast: false })),
                    ...Array.from(selectedWeatherFieldsForecast).map(f => ({ f, isForecast: true }))
                ].filter(({ f, isForecast }) => {
                    const itemKey = getWKey(f, isForecast);
                    return seriesAxisConfig?.[itemKey]?.axis === 'Y2';
                });

                const fieldWithScale = y2Fields.find(({ f, isForecast }) => {
                    const itemKey = getWKey(f, isForecast);
                    return seriesAxisConfig?.[itemKey]?.scale?.min !== undefined || seriesAxisConfig?.[itemKey]?.scale?.max !== undefined;
                });

                if (fieldWithScale) {
                    const itemKey = getWKey(fieldWithScale.f, fieldWithScale.isForecast);
                    const scaleCfg = seriesAxisConfig?.[itemKey]?.scale;
                    if (scaleCfg && (scaleCfg.min !== undefined || scaleCfg.max !== undefined)) {
                        chart.priceScale('weather_secondary').setAutoScale(false);
                        const currentRange = chart.priceScale('weather_secondary').getVisibleRange() || { from: 0, to: 100 };
                        chart.priceScale('weather_secondary').setVisibleRange({
                            from: scaleCfg.min ?? currentRange.from,
                            to: scaleCfg.max ?? currentRange.to
                        });
                    }
                } else {
                    chart.priceScale('weather_secondary').setAutoScale(true);
                }
            }

            // --- Set Visible Range (only on initial load for this chart instance) ---
            // Weather-only page: no price series; fit time axis to data so it doesn't overlap/cramp (same UX as forecast).
            // Forecast page: use startDate/endDate so the chart shows the selected date range.
            if (!hasSetInitialRangeRef.current && processedChartData.length > 0) {
                try {
                    const hasPriceSeries = actualData.length > 0 || selectedModels.length > 0;
                    if (hasPriceSeries && startDate && endDate) {
                        const startJst = dateToJstTimestamp(startDate);
                        const endOfDay = new Date(endDate); endOfDay.setHours(23, 59, 59, 999);
                        const endJst = dateToJstTimestamp(endOfDay);
                        if (startJst && endJst) {
                            const fromTime = toChartTime(startJst, timezone) as Time;
                            const toTime = toChartTime(endJst, timezone) as Time;
                            chart.timeScale().setVisibleRange({ from: fromTime, to: toTime });
                        } else {
                            chart.timeScale().fitContent();
                        }
                    } else {
                        // Weather-only or no date range: fit content so all data is visible without overlap
                        chart.timeScale().fitContent();
                    }
                    hasSetInitialRangeRef.current = true;
                } catch (e) {
                    try { chart.timeScale().fitContent(); } catch (e2) { /* disposed */ }
                }
            }
        } catch (e) {
            console.warn('Chart layout configuration failed (chart may be disposed)', e);
        }

    }, [
        processedChartData, transformedData, colors, darkMode, timezone,
        selectedModels, highlightedModelId, modelColorMap,
        showImbalance, showOcctoArea, occtoChartType,
        showWeather, showWeatherActual, showWeatherForecast, selectedWeatherFieldsActual, selectedWeatherFieldsForecast,
        seriesAxisConfig,
        startDate, endDate, showActualPrice, showTopBottomLabels, showRightAxisLabels, subchartLayout
    ]);
};
