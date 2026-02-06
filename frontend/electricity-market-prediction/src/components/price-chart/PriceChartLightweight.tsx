import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { ChartInfoPanel } from './ChartInfoPanel';
import { ChartLegend } from './ChartLegend';
import {
    createChart,
    IChartApi,
    ISeriesApi,
    LineSeries,
    AreaSeries,
    CandlestickSeries,
    HistogramSeries,
    Time,
    LineStyle,
    ColorType,
    CrosshairMode,
} from 'lightweight-charts';
import { usePriceChart } from './context/PriceChartContext';
import { formatInTimezone } from '@/utils/chartUtils';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { occtoStackedFields, weatherFields } from './constants';
import { format as formatDate } from 'date-fns';
import {
    convertToLineSeriesData,
    convertToCandlestickData,
    createChartLayout,
    createCrosshairOptions,
    toChartTime,
    fromChartTime,
    ProcessedDataPoint,
} from '@/utils/lightweightChartsHelpers';
import { DayBackgroundPrimitive } from './plugins/DayBackgroundPrimitive';
// Plugins (Dynamically imported or assumed available)
import { StackedBarSeries } from './plugins/StackedBarSeries';
import { StackedAreaSeries } from './plugins/StackedAreaSeries';

const WEATHER_FIELD_COLORS = weatherFields.reduce((acc, curr) => {
    acc[curr.value] = curr.color;
    return acc;
}, {} as Record<string, string>);

const hexToRgba = (hex: string, alpha: number): string => {
    const h = hex.replace(/^#/, '');
    if (h.length !== 6) return hex;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
};

export const PriceChartLightweight: React.FC = () => {
    // --- 2. Refs & Context ---
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const mainChartRef = useRef<IChartApi | null>(null);
    const seriesRefs = useRef<Map<string, ISeriesApi<any>>>(new Map());
    const dayBackgroundRef = useRef<DayBackgroundPrimitive | null>(null);
    const seriesWithBackgroundRef = useRef(new WeakSet<ISeriesApi<any>>());
    const occtoChartTypeRef = useRef<'area' | 'stacked' | undefined>(undefined);

    const {
        processedChartData, colors, darkMode, selectedModels, modelColorMap,
        showImbalance, showIntraday, showIntradayAverage, showInterconnection,
        showOcctoArea, occtoChartType, selectedOcctoFields,
        showWeather, showWeatherActual, showWeatherForecast,
        selectedWeatherFieldsActual, selectedWeatherFieldsForecast,
        hoveredData, setHoveredData, areaName, timezone, setTimezone,
    } = usePriceChart();

    const {
        highlightedModelId, startDate, endDate, showActualPrice,
    } = useMarketDataContext();

    // 解決閉包問題的 Refs
    const latestDataRef = useRef(processedChartData);
    useEffect(() => { latestDataRef.current = processedChartData; }, [processedChartData]);

    // --- 3. Data Memoization (效能優化關鍵) ---
    // 將昂貴的數據轉換移出 Effect，並加上緩存

    const candleData = useMemo(() =>
        showIntraday ? convertToCandlestickData(processedChartData, timezone) : [],
        [processedChartData, showIntraday, timezone]);

    const intradayAvgData = useMemo(() =>
        (showIntraday && showIntradayAverage) ? convertToLineSeriesData(processedChartData, p => p.intraday_average ?? null, timezone) : [],
        [processedChartData, showIntraday, showIntradayAverage, timezone]);

    const actualData = useMemo(() =>
        convertToLineSeriesData(processedChartData, p => p.actualPrice, timezone),
        [processedChartData, timezone]);

    const imbalanceData = useMemo(() =>
        showImbalance ? convertToLineSeriesData(processedChartData, p => p.imbalance ?? null, timezone) : [],
        [processedChartData, showImbalance, timezone]);

    const interconnectionData = useMemo(() =>
        showInterconnection ? convertToLineSeriesData(processedChartData, p => p.interconnection_flow_diff ?? null, timezone) : [],
        [processedChartData, showInterconnection, timezone]);

    // OCCTO Data Preparation
    const occtoData = useMemo(() => {
        if (!showOcctoArea) return [];
        const occtoFieldColors: Record<string, string> = {};
        occtoStackedFields.forEach(f => { occtoFieldColors[f.key] = f.color; });

        return processedChartData
            .filter(d => d.occto_values)
            .map(d => {
                const items: Array<{ value: number; color: string }> = [];
                // Sort fields to ensure consistent stacking order
                const sortedFields = Array.from(selectedOcctoFields).sort((a, b) => {
                    const idxA = occtoStackedFields.findIndex(f => f.key === a);
                    const idxB = occtoStackedFields.findIndex(f => f.key === b);
                    return idxA - idxB;
                });
                sortedFields.forEach(field => {
                    const val = d.occto_values?.[field];
                    if (typeof val === 'number') {
                        const base = occtoFieldColors[field] || '#6b7280';
                        items.push({ value: val, color: hexToRgba(base, 0.75) });
                    }
                });
                return { time: toChartTime(d.timestamp, timezone), items };
            })
            .filter(d => d.items.length > 0);
    }, [processedChartData, showOcctoArea, selectedOcctoFields, timezone]);

    // --- 4. Chart Initialization ---
    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Clean up previous instance
        if (mainChartRef.current) {
            mainChartRef.current.remove();
            seriesRefs.current.clear();
        }

        const chart = createChart(chartContainerRef.current, {
            layout: createChartLayout(colors, darkMode),
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            rightPriceScale: {
                visible: true,
                borderColor: colors.grid,
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            leftPriceScale: { visible: false },
            timeScale: {
                visible: true,
                borderColor: colors.grid,
                timeVisible: true,
                secondsVisible: true,
                tickMarkFormatter: (time: number) => {
                    return formatInTimezone(time, 'UTC', {
                        month: 'numeric', day: 'numeric',
                        hour: 'numeric', minute: 'numeric', hour12: false
                    }).replace(',', '');
                },
            },
            crosshair: createCrosshairOptions(colors),
            grid: {
                vertLines: { color: colors.grid, style: LineStyle.Dotted },
                horzLines: { color: colors.grid, style: LineStyle.Dotted },
            },
        });
        mainChartRef.current = chart;

        // Crosshair Handler (Binary Search)
        const findNearest = (targetTimestamp: number) => {
            const data = latestDataRef.current;
            if (!data || data.length === 0) return null;
            let left = 0, right = data.length - 1;
            let nearest = data[0];
            let minDiff = Math.abs(data[0].timestamp - targetTimestamp);

            while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                const currentTimestamp = data[mid].timestamp;
                const diff = Math.abs(currentTimestamp - targetTimestamp);
                if (diff < minDiff) { minDiff = diff; nearest = data[mid]; }
                if (currentTimestamp < targetTimestamp) left = mid + 1;
                else right = mid - 1;
            }
            return nearest;
        };

        chart.subscribeCrosshairMove(param => {
            if (param.time) {
                const actualMs = fromChartTime(param.time as number, timezone);
                const nearest = findNearest(actualMs);
                if (nearest) setHoveredData(nearest);
            } else {
                setHoveredData(null);
            }
        });

        // Resize Observer
        const resizeObserver = new ResizeObserver(() => {
            if (chartContainerRef.current && mainChartRef.current) {
                mainChartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        });
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            mainChartRef.current?.remove();
            mainChartRef.current = null;
            seriesRefs.current.clear();
        };
    }, [colors, darkMode, timezone]); // Re-create only on essential config changes

    // --- 5. Main Series Update Effect ---
    useEffect(() => {
        if (!mainChartRef.current || !processedChartData || processedChartData.length === 0) return;

        const chart = mainChartRef.current;
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
            // Use try-catch for data updates to prevent crashing on invalid data
            try { if (data.length > 0) s.setData(data); }
            catch (e) { console.warn(`SetData failed for ${key}`, e); }
            return s;
        };

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
            const finalData = occtoChartType === 'area'
                ? occtoData.map(d => ({ ...d, items: d.items.map(i => ({ value: i.value, lineColor: i.color, areaColor: i.color })) }))
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
            // Reduce opacity if average line is shown
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

            // Calculating specific model data here (fast enough)
            const lineData = convertToLineSeriesData(processedChartData, p => {
                const pred = p.modelPredictions.find(mp => `${mp.modelId}|${mp.modelName}` === modelKey);
                return pred?.predictedPrice ?? null;
            }, timezone);

            if (lineData.length > 0) {
                updateOrAdd(`model-${modelKey}`, LineSeries, lineData, {
                    color: color,
                    lineWidth: isHighlighted ? 3 : 1,
                    priceScaleId: 'right',
                    visible: true // Ensure visibility
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

            // Attach Day Background to the actual price series (or the first available series)
            // This logic is simplified: always try to attach to 'actual', if not present, loop others.
            if (dayBackgroundRef.current && s && !seriesWithBackgroundRef.current.has(s)) {
                s.attachPrimitive(dayBackgroundRef.current);
                seriesWithBackgroundRef.current.add(s);
            }
        } else if (activeKeys.size > 0 && dayBackgroundRef.current) {
            // Fallback: attach background to the first available series if actual price is hidden
            const firstSeriesKey = activeKeys.values().next().value as string | undefined;
            const s = firstSeriesKey != null ? seriesMap.get(firstSeriesKey) : undefined;
            if (s && !seriesWithBackgroundRef.current.has(s)) {
                s.attachPrimitive(dayBackgroundRef.current);
                seriesWithBackgroundRef.current.add(s);
            }
        }

        // --- 6. Cleanup Unused Series ---
        const toRemove: string[] = [];
        seriesMap.forEach((_, k) => { if (!activeKeys.has(k)) toRemove.push(k); });
        toRemove.forEach(k => {
            const s = seriesMap.get(k);
            if (s) { chart.removeSeries(s); seriesMap.delete(k); }
        });

        // --- 7. Layout Configuration (SubCharts) ---
        const activeSubCharts = ['imbalance', 'interconnection', 'occto', 'weather'].filter(k => usedSubCharts.has(k));
        const subHeight = 0.15; // 15% height per subchart
        const gap = 0.02;
        let currentTop = 1.0;

        // Configure Sub-chart panes from bottom up
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

        // Configure Main Chart Pane
        const mainBottom = Math.max(0.1, activeSubCharts.length > 0 ? (activeSubCharts.length * (subHeight + gap)) : 0.08);
        chart.priceScale('right').applyOptions({
            scaleMargins: { top: 0.05, bottom: mainBottom },
            visible: true, borderVisible: true, borderColor: colors.grid,
        });

        // --- 8. Set Visible Range (Only on data/date change) ---
        if (startDate && endDate && processedChartData.length > 0) {
            try {
                const fromTime = toChartTime(startDate.getTime(), timezone) as Time;
                const toTime = toChartTime(endDate.getTime() + 86400000 - 1, timezone) as Time;
                chart.timeScale().setVisibleRange({ from: fromTime, to: toTime });
            } catch (e) {
                // If range is invalid (e.g. no data in range), fit content
                chart.timeScale().fitContent();
            }
        }

    }, [
        // Dependencies: Only re-run if data structures or display flags change
        processedChartData,
        actualData, candleData, imbalanceData, interconnectionData, occtoData, // Memoized Data
        intradayAvgData,
        colors, darkMode, timezone,
        selectedModels, highlightedModelId, modelColorMap,
        showImbalance, showInterconnection, showOcctoArea, occtoChartType,
        showWeather, showWeatherActual, showWeatherForecast, selectedWeatherFieldsActual, selectedWeatherFieldsForecast,
        startDate, endDate, showActualPrice
    ]);

    // --- 9. Handlers (Download / Fullscreen) ---
    const handleDownload = useCallback((fileFormat: 'csv' | 'jpg' | 'png') => {
        if (fileFormat === 'csv') {
            if (!processedChartData?.length) return;
            const headers = ['timestamp', 'actualPrice', 'intraday_average', 'imbalance'];
            const rows = processedChartData.map(d => [
                formatDate(new Date(d.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                d.actualPrice ?? '', d.intraday_average ?? '', d.imbalance ?? ''
            ].join(','));
            const csv = [headers.join(','), ...rows].join('\n');
            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
            const link = document.createElement('a');
            link.download = `chart-data-${formatDate(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        } else {
            const chart = mainChartRef.current;
            if (!chart) return;

            const chartCanvas = chart.takeScreenshot();
            const fontSize = 11;
            const font = `${fontSize}px sans-serif`;
            const padding = 20;
            const itemGap = 16;
            const rowGap = 8;
            const symbolSize = 12;

            // 1. Prepare Render Ops (Flatten the structure)
            type RenderOp = {
                type: 'item' | 'separator';
                label: string;
                color?: string;
                symbolType?: 'line' | 'dashed' | 'box' | 'circle' | 'candlestick';
                opacity?: number;
            };
            const ops: RenderOp[] = [];

            // Price Section
            if (showActualPrice && actualData.length > 0) {
                ops.push({ type: 'item', label: '實際價格', color: colors.actual, symbolType: 'line' });
            }
            selectedModels.forEach(model => {
                const modelKey = `${model.id}|${model.name}`;
                ops.push({ type: 'item', label: model.name, color: modelColorMap[modelKey] || model.color, symbolType: 'line' });
            });

            // Market Section
            if (showIntraday || showIntradayAverage || showImbalance || showInterconnection) {
                if (ops.length > 0) ops.push({ type: 'separator', label: '市場' });
                if (showIntraday) ops.push({ type: 'item', label: '即時', color: colors.intraday, symbolType: 'candlestick' });
                if (showIntradayAverage) ops.push({ type: 'item', label: '即時(平均)', color: '#ffa726', symbolType: 'dashed' });
                if (showImbalance) ops.push({ type: 'item', label: '不平衡值', color: colors.imbalance, symbolType: 'line' });
                if (showInterconnection) ops.push({ type: 'item', label: '互連流量', color: colors.interconnection, symbolType: 'line' });
            }

            // OCCTO Section
            if (showOcctoArea && selectedOcctoFields.size > 0) {
                ops.push({ type: 'separator', label: 'OCCTO' });
                occtoStackedFields.filter(f => selectedOcctoFields.has(f.key)).forEach(f => {
                    ops.push({ type: 'item', label: f.label, color: f.color, symbolType: 'box' });
                });
            }

            // Weather Section
            if (showWeather || showWeatherActual || showWeatherForecast) {
                const weatherOps: RenderOp[] = [];
                weatherFields.forEach(f => {
                    const hasActual = showWeatherActual && selectedWeatherFieldsActual.has(f.value);
                    const hasForecast = showWeatherForecast && selectedWeatherFieldsForecast.has(f.value);
                    if (hasActual) weatherOps.push({ type: 'item', label: f.label, color: f.color, symbolType: 'line' });
                    if (hasForecast) weatherOps.push({ type: 'item', label: `${f.label} (預)`, color: f.color, symbolType: 'dashed', opacity: 0.7 });
                });

                if (weatherOps.length > 0) {
                    ops.push({ type: 'separator', label: '天氣' });
                    ops.push(...weatherOps);
                }
            }

            // 2. Measure & Layout
            const tempCtx = document.createElement('canvas').getContext('2d');
            if (!tempCtx) return;
            tempCtx.font = font;

            let currentLineW = 0;
            let lines = 1;
            const maxW = chartCanvas.width - (padding * 2);

            const layoutOps = ops.map(op => {
                let w = 0;
                if (op.type === 'separator') {
                    // 1px line + 8px gap + text + 8px gap
                    w = 1 + 8 + tempCtx.measureText(op.label).width + 8;
                } else {
                    // symbol + 5px gap + text
                    w = symbolSize + 5 + tempCtx.measureText(op.label).width;
                }

                // Wrap logic
                if (currentLineW + w > maxW && currentLineW > 0) {
                    lines++;
                    currentLineW = 0;
                }

                const posX = padding + currentLineW;
                currentLineW += w + itemGap;

                return { ...op, width: w, newLine: currentLineW === w + itemGap }; // newLine if it was reset
            });

            // 3. Draw
            const legendHeight = (lines * (fontSize + rowGap + 10)) + padding; // Extra vertical padding
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = chartCanvas.width;
            combinedCanvas.height = chartCanvas.height + legendHeight;
            const ctx = combinedCanvas.getContext('2d');
            if (!ctx) return;

            // Background
            ctx.fillStyle = darkMode ? '#1e293b' : '#ffffff';
            ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
            ctx.drawImage(chartCanvas, 0, 0);

            // Legend Draw Loop
            ctx.font = font;
            ctx.textBaseline = 'middle';

            let drawX = padding;
            let drawY = chartCanvas.height + padding + (fontSize / 2);

            const drawSymbol = (type: 'line' | 'dashed' | 'box' | 'circle' | 'candlestick' | 'split-line', color: string, x: number, y: number) => {
                ctx.fillStyle = color;
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;

                if (type === 'line') {
                    ctx.fillRect(x, y - 1, symbolSize, 2);
                } else if (type === 'dashed') {
                    ctx.setLineDash([4, 2]);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + symbolSize, y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                } else if (type === 'split-line') {
                    // Left half solid
                    ctx.fillRect(x, y - 1, symbolSize / 2, 2);
                    // Right half dashed
                    ctx.setLineDash([2, 2]);
                    ctx.beginPath();
                    ctx.moveTo(x + (symbolSize / 2), y);
                    ctx.lineTo(x + symbolSize, y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                } else if (type === 'box') {
                    ctx.fillRect(x, y - 5, 10, 10);
                } else if (type === 'circle') {
                    ctx.beginPath();
                    ctx.arc(x + 4, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                } else if (type === 'candlestick') {
                    // wick
                    ctx.beginPath();
                    ctx.moveTo(x + 6, y - 6);
                    ctx.lineTo(x + 6, y + 6);
                    ctx.stroke();
                    // body
                    ctx.fillRect(x + 3, y - 4, 6, 8);
                }
            };

            layoutOps.forEach((op, i) => {
                // If this op started a new line (detected during layout or manually recalculated?)
                // Actually, simplistic layout above didn't save Coordinates. Let's re-run layout logic during draw.
                // Or better, just re-run the wrapping check interactively.

                // Re-measure for wrapping check
                const isSeparator = op.type === 'separator';
                const w = op.width;

                if (drawX + w > maxW) {
                    drawX = padding;
                    drawY += (fontSize + rowGap + 10);
                }

                if (isSeparator) {
                    ctx.fillStyle = darkMode ? '#334155' : '#e2e8f0';
                    ctx.fillRect(drawX, drawY - 6, 1, 12); // Vertical divider

                    ctx.fillStyle = darkMode ? '#94a3b8' : '#64748b';
                    ctx.font = `10px sans-serif`; // Smaller font for separator
                    ctx.fillText(op.label, drawX + 9, drawY); // 1 + 8 offset
                    ctx.font = font; // Restore
                } else {
                    const color = op.color || '#000';
                    const opacity = op.opacity ?? 1;
                    ctx.globalAlpha = opacity;

                    // Draw Symbol
                    const sx = drawX;
                    const sy = drawY;

                    drawSymbol(op.symbolType || 'line', color, sx, sy); // Default to 'line' if not specified

                    ctx.globalAlpha = 1.0;
                    ctx.fillStyle = darkMode ? '#e2e8f0' : '#0f172a';
                    ctx.fillText(op.label, sx + symbolSize + 5, sy);
                }

                drawX += w + itemGap;
            });

            const link = document.createElement('a');
            link.download = `chart-${formatDate(new Date(), 'yyyyMMdd-HHmmss')}.${fileFormat}`;
            link.href = combinedCanvas.toDataURL(fileFormat === 'png' ? 'image/png' : 'image/jpeg');
            link.click();
        }
    }, [processedChartData, colors, darkMode, selectedModels, modelColorMap, showActualPrice, showIntraday, showIntradayAverage, showImbalance, showInterconnection, showOcctoArea, selectedOcctoFields, showWeather, showWeatherActual, showWeatherForecast, selectedWeatherFieldsActual, selectedWeatherFieldsForecast, actualData]);

    const handleFullscreen = useCallback(() => {
        if (!chartContainerRef.current) return;
        if (!document.fullscreenElement) chartContainerRef.current.requestFullscreen().catch(console.error);
        else document.exitFullscreen();
    }, []);

    // --- 10. Render ---
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
            {/* InfoPanel: 負責顯示 Header, Price, Weather 等資訊，固定高度 */}
            <ChartInfoPanel
                hoveredData={hoveredData}
                selectedModels={selectedModels}
                modelColorMap={modelColorMap}
                colors={colors}
                areaName={areaName}
                showImbalance={showImbalance}
                showIntraday={showIntraday}
                showInterconnection={showInterconnection}
                showOcctoArea={showOcctoArea}
                showWeather={showWeather}
                showWeatherActual={showWeatherActual}
                showWeatherForecast={showWeatherForecast}
                selectedOcctoFields={selectedOcctoFields}
                selectedWeatherFieldsActual={selectedWeatherFieldsActual}
                selectedWeatherFieldsForecast={selectedWeatherFieldsForecast}
                onDownload={handleDownload}
                onFullscreen={handleFullscreen}
                timezone={timezone}
                setTimezone={setTimezone}
            />
            {/* Chart Container: 填滿剩餘空間 */}
            <div
                ref={chartContainerRef}
                className="price-chart-container"
                style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0 }}
            />
            {/* Legend: Shown below chart */}
            <ChartLegend />
        </div>
    );
};