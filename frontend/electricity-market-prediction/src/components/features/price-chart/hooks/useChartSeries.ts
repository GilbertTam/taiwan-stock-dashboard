import { useEffect, useRef } from 'react';
import {
    IChartApi,
    ISeriesApi,
    LineSeries,
    AreaSeries,
    CandlestickSeries,
    HistogramSeries,
    Time,
    LineStyle,
} from 'lightweight-charts';
import {
    convertToLineSeriesData,
    toChartTime,
    ProcessedDataPoint,
} from '@/utils/lightweightChartsHelpers';
import { StackedBarSeries } from '../plugins/StackedBarSeries';
import { StackedAreaSeries } from '../plugins/StackedAreaSeries';
import { DayBackgroundPrimitive } from '@/shared/components/charts/plugins';
import { hexToRgba } from '../utils';
// import { weatherFields } from '../constants'; // Pass this as prop or import? Import is fine.
import { weatherFields } from '../constants';

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
    showInterconnection: boolean;
    showOcctoArea: boolean;
    occtoChartType?: 'area' | 'stacked';
    showWeather: boolean;
    showWeatherActual: boolean;
    showWeatherForecast: boolean;
    selectedWeatherFieldsActual: Set<string>;
    selectedWeatherFieldsForecast: Set<string>;
    showActualPrice: boolean;

    // Range params
    startDate: Date | null;
    endDate: Date | null;
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
    showInterconnection,
    showOcctoArea,
    occtoChartType,
    showWeather,
    showWeatherActual,
    showWeatherForecast,
    selectedWeatherFieldsActual,
    selectedWeatherFieldsForecast,
    showActualPrice,
    startDate,
    endDate,
}: UseChartSeriesParams) => {

    const seriesRefs = useRef<Map<string, ISeriesApi<any>>>(new Map());
    const dayBackgroundRef = useRef<DayBackgroundPrimitive | null>(null);
    const seriesWithBackgroundRef = useRef(new WeakSet<ISeriesApi<any>>());
    const occtoChartTypeRef = useRef<'area' | 'stacked' | undefined>(undefined);
    // Track previous chart instance to detect changes
    const prevChartRef = useRef<IChartApi | null>(null);
    // Track if initial visible range was set for current chart instance
    const hasSetInitialRangeRef = useRef(false);

    // Effect to clean up series refs when chart instance changes
    useEffect(() => {
        const currentChart = chartRef.current;
        if (prevChartRef.current !== currentChart) {
            // Chart instance changed - clear all series refs as they are now stale
            seriesRefs.current.clear();
            seriesWithBackgroundRef.current = new WeakSet();
            dayBackgroundRef.current = null;
            occtoChartTypeRef.current = undefined;
            hasSetInitialRangeRef.current = false; // Reset range flag for new chart
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

        const {
            candleData,
            intradayAvgData,
            actualData,
            imbalanceData,
            interconnectionData,
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
        if (interconnectionData.length > 0) {
            updateOrAdd('interconnection', AreaSeries, interconnectionData, {
                lineColor: colors.interconnection,
                topColor: `${colors.interconnection}80`,
                bottomColor: `${colors.interconnection}10`,
                lineWidth: 1,
                priceScaleId: 'interconnection'
            });
            usedSubCharts.add('interconnection');
        }

        // --- B. Bars & Histograms (Middle Layer) ---

        // Weather Data
        if (showWeather) {
            const processWeather = (fields: Set<string>, dataObjKey: 'weather_data_actual' | 'weather_data_forecast', prefix: string) => {
                fields.forEach(field => {
                    const isBar = field === 'rainfall' || field === 'snowfall';
                    const seriesType = isBar ? HistogramSeries : LineSeries;
                    // Note: Calculating line data here inside loop as it varies by field
                    const data = convertToLineSeriesData(processedChartData, p => (p as any)[dataObjKey]?.[field] ?? null, timezone);

                    if (data.length > 0) {
                        updateOrAdd(`${prefix}_${field}`, seriesType, data, {
                            color: WEATHER_FIELD_COLORS[field] || '#888',
                            priceScaleId: 'weather',
                            lineWidth: 2,
                            lineStyle: prefix.includes('forecast') && !isBar ? LineStyle.Dashed : LineStyle.Solid,
                        });
                        usedSubCharts.add('weather');
                    }
                });
            };
            if (showWeatherActual) processWeather(selectedWeatherFieldsActual, 'weather_data_actual', 'weather_actual');
            if (showWeatherForecast) processWeather(selectedWeatherFieldsForecast, 'weather_data_forecast', 'weather_forecast');
        }

        // --- C. Lines & Main Data (Top Layer) ---

        // Imbalance
        if (imbalanceData.length > 0) {
            updateOrAdd('imbalance', LineSeries, imbalanceData, { color: colors.imbalance, priceScaleId: 'imbalance', lineWidth: 1 });
            usedSubCharts.add('imbalance');
        }

        // Intraday Candlesticks
        if (candleData.length > 0) {
            const alpha = showIntradayAverage ? 0.5 : 1;
            updateOrAdd('intraday', CandlestickSeries, candleData, {
                upColor: `rgba(239, 83, 80, ${alpha})`,
                downColor: `rgba(38, 166, 154, ${alpha})`,
                wickUpColor: `rgba(239, 83, 80, ${alpha})`,
                wickDownColor: `rgba(38, 166, 154, ${alpha})`,
                priceScaleId: 'right',
            });
        }
        if (intradayAvgData.length > 0) {
            updateOrAdd('intraday_avg', LineSeries, intradayAvgData, {
                color: '#ffa726', lineWidth: 2, lineStyle: LineStyle.Dashed, priceScaleId: 'right'
            });
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
                updateOrAdd(`model-${modelKey}`, LineSeries, lineData, {
                    color: color,
                    lineWidth: isHighlighted ? 3 : 1,
                    priceScaleId: 'right',
                    visible: true
                });
            }
        });

        // Actual Price (Top-most line)
        if (actualData.length > 0 && showActualPrice) {
            const s = updateOrAdd('actual', LineSeries, actualData, {
                color: colors.actual,
                lineWidth: 2,
                priceScaleId: 'right'
            });

            if (dayBackgroundRef.current && s && !seriesWithBackgroundRef.current.has(s)) {
                s.attachPrimitive(dayBackgroundRef.current);
                seriesWithBackgroundRef.current.add(s);
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
            }
        });

        // --- Layout Configuration (SubCharts) ---
        try {
            const activeSubCharts = ['imbalance', 'interconnection', 'occto', 'weather'].filter(k => usedSubCharts.has(k));
            const subHeight = 0.15;
            const gap = 0.02;
            let currentTop = 1.0;

            activeSubCharts.reverse().forEach(key => {
                const bottom = currentTop;
                const top = Math.max(0, currentTop - subHeight);
                currentTop = top - gap;

                chart.priceScale(key).applyOptions({
                    visible: true, autoScale: true,
                    scaleMargins: { top: 1 - bottom, bottom: 1 - top },
                    borderVisible: true, borderColor: colors.grid,
                });
            });

            const mainBottom = Math.max(0.1, activeSubCharts.length > 0 ? (activeSubCharts.length * (subHeight + gap)) : 0.08);
            chart.priceScale('right').applyOptions({
                scaleMargins: { top: 0.05, bottom: mainBottom },
                visible: true, borderVisible: true, borderColor: colors.grid,
            });

            // --- Set Visible Range (only on initial load for this chart instance) ---
            if (!hasSetInitialRangeRef.current && startDate && endDate && processedChartData.length > 0) {
                try {
                    const fromTime = toChartTime(startDate.getTime(), timezone) as Time;
                    const toTime = toChartTime(endDate.getTime() + 86400000 - 1, timezone) as Time;
                    chart.timeScale().setVisibleRange({ from: fromTime, to: toTime });
                    hasSetInitialRangeRef.current = true; // Mark as set
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
        showImbalance, showInterconnection, showOcctoArea, occtoChartType,
        showWeather, showWeatherActual, showWeatherForecast, selectedWeatherFieldsActual, selectedWeatherFieldsForecast,
        startDate, endDate, showActualPrice
    ]);
};
