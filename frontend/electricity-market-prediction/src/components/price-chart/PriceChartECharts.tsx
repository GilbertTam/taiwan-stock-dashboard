import React, { useMemo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Box } from '@mui/material';
import { EChartsOption } from 'echarts';
import { startOfDay } from 'date-fns';
import { usePriceChart } from './context/PriceChartContext';
import { occtoFields, occtoStackedFields } from './constants';
import { ModelPrediction } from '@/utils/chartUtils';

export const PriceChartECharts: React.FC = () => {
    const chartRef = useRef<ReactECharts>(null);
    const {
        processedChartData,
        priceRange,
        imbalanceRange,
        occtoRange,
        colors,
        darkMode,
        selectedModels,
        modelColorMap,
        showPredictionRange,
        showImbalance,
        showIntraday,
        showInterconnection,
        showOcctoArea,
        occtoChartType,
        selectedOcctoFields,
        setHoveredData,
        chartType,
    } = usePriceChart();

    // 1. 使用 Ref 確保 Event Listener 永遠拿到最新資料
    const latestDataRef = useRef(processedChartData);

    useEffect(() => {
        latestDataRef.current = processedChartData;
    }, [processedChartData]);

    const option = useMemo<EChartsOption>(() => {
        if (!processedChartData || processedChartData.length === 0) return {};

        const timestamps = processedChartData.map(d => d.timestamp);
        const dataMinTime = timestamps[0];
        const dataMaxTime = timestamps[timestamps.length - 1];

        // --- Grid ---
        let rightMargin = 40;
        if (showImbalance) rightMargin += 40;
        if (showInterconnection) rightMargin += 40;
        if (showOcctoArea) rightMargin += 40;

        const grid = {
            left: 50,
            right: rightMargin,
            top: 40,
            bottom: 60,
            containLabel: true
        };

        // --- X Axis ---
        const xAxis = {
            type: 'time' as const,
            axisLabel: {
                formatter: {
                    year: '{yyyy}', month: '{MMM}', day: '{d}',
                    hour: '{HH}:{mm}', minute: '{HH}:{mm}', none: '{d} {HH}:{mm}'
                },
                color: colors.text,
                hideOverlap: true
            },
            axisPointer: {
                show: true,
                type: 'line' as const,
                label: {
                    show: true,
                    backgroundColor: colors.tooltipHeaderBg,
                    color: colors.text
                },
                // 讓 axisPointer 更靈敏
                snap: true, 
            },
            axisLine: { lineStyle: { color: colors.text } },
            splitLine: { show: false },
            min: dataMinTime,
            max: dataMaxTime
        };

        // --- Y Axes (保持原樣) ---
        const yAxis = [
            {
                type: 'value' as const,
                name: '¥/KWh',
                nameTextStyle: { color: colors.text, padding: [0, 0, 0, 20] },
                position: 'left' as const,
                axisLabel: { color: colors.text },
                splitLine: { lineStyle: { color: colors.grid, type: 'dashed' as const } },
                min: priceRange.min,
                max: priceRange.max
            }
        ];
        // ... (省略 Y軸 build 邏輯，保持您的原程式碼即可) ...
        let nextYIndex = 1;
        let imbalanceIndex = -1;
        let interconnectionIndex = -1;
        let occtoIndex = -1;

        if (showImbalance) {
             yAxis.push({ type: 'value', name: 'Imbalance', position: 'right', offset: (nextYIndex - 1) * 50, axisLabel: { color: colors.imbalance }, axisLine: { lineStyle: { color: colors.imbalance } }, splitLine: { show: false }, min: imbalanceRange.min, max: imbalanceRange.max } as any);
             imbalanceIndex = nextYIndex++;
        }
        if (showInterconnection) {
             yAxis.push({ type: 'value', name: 'MW', position: 'right', offset: (nextYIndex - 1) * 50, axisLabel: { color: colors.interconnection }, axisLine: { lineStyle: { color: colors.interconnection } }, splitLine: { show: false } } as any);
             interconnectionIndex = nextYIndex++;
        }
        if (showOcctoArea) {
             yAxis.push({ type: 'value', name: 'Quantity', position: 'right', offset: (nextYIndex - 1) * 50, axisLabel: { color: colors.occtoArea }, axisLine: { lineStyle: { color: colors.occtoArea } }, splitLine: { show: false }, min: occtoRange.min, max: occtoRange.max } as any);
             occtoIndex = nextYIndex++;
        }

        // --- Series ---
        const series: any[] = [];
        
        // MarkArea logic
        const markAreaData: any[] = [];
        const currentStart = timestamps[0];
        const endTimestamp = timestamps[timestamps.length - 1];
        let iterTime = startOfDay(new Date(currentStart)).getTime();
        const dayMillis = 24 * 60 * 60 * 1000;
        let dayIndex = 0;
        while (iterTime < endTimestamp) {
            if (dayIndex % 2 !== 0) {
                markAreaData.push([{ xAxis: Math.max(iterTime, currentStart) }, { xAxis: Math.min(iterTime + dayMillis, endTimestamp) }]);
            }
            iterTime += dayMillis; dayIndex++;
        }

        // Ghost Series
        series.push({
            name: 'Ghost', type: 'line',
            data: processedChartData.map(d => [d.timestamp, priceRange.min]),
            itemStyle: { opacity: 0 }, lineStyle: { opacity: 0 }, showSymbol: false, silent: true, z: 0, animation: false
        });

        // Actual Price
        series.push({
            name: 'Observation', type: 'line', step: chartType === 'stepLine' ? 'end' : false,
            data: processedChartData.map(d => [d.timestamp, d.actualPrice]),
            itemStyle: { color: colors.actual }, showSymbol: false, lineStyle: { width: 1.5 }, z: 10,
            markArea: { silent: true, itemStyle: { color: darkMode ? "#444444" : "#e0e0e0", opacity: 0.4 }, data: markAreaData }
        });

        // Models ... (省略 Models, Range, Imbalance 等 Series 邏輯，保持原樣)
        selectedModels.forEach((model) => {
            const modelKey = `${model.id}|${model.name}`;
            const modelColor = modelColorMap[modelKey];
            series.push({
                name: model.name, type: 'line', step: chartType === 'stepLine' ? 'end' : false,
                data: processedChartData.map(d => {
                    const pred = d.modelPredictions.find((mp: ModelPrediction) => `${mp.modelId}|${mp.modelName}` === modelKey);
                    return [d.timestamp, pred?.predictedPrice];
                }),
                itemStyle: { color: modelColor }, showSymbol: false, lineStyle: { width: 1.5 }, z: 9
            });

            if (showPredictionRange) {
                const lowerData: (number | null)[][] = [];
                const diffData: (number | null)[][] = [];
                processedChartData.forEach(d => {
                    const pred = d.modelPredictions.find((mp: ModelPrediction) => `${mp.modelId}|${mp.modelName}` === modelKey);
                    const bottom = pred?.predictedPrice5 ?? pred?.predictedPrice;
                    const top = pred?.predictedPrice95 ?? pred?.predictedPrice;
                    if (bottom != null && top != null) { lowerData.push([d.timestamp, bottom]); diffData.push([d.timestamp, top - bottom]); } 
                    else { lowerData.push([d.timestamp, null]); diffData.push([d.timestamp, null]); }
                });
                series.push({ name: `${model.name} Band Base`, type: 'line', step: chartType === 'stepLine' ? 'end' : false, data: lowerData, lineStyle: { opacity: 0 }, stack: `band-${modelKey}`, showSymbol: false, silent: true, z: 5 });
                series.push({ name: `${model.name} Band Width`, type: 'line', step: chartType === 'stepLine' ? 'end' : false, data: diffData, lineStyle: { opacity: 0 }, areaStyle: { color: modelColor, opacity: 0.2 }, stack: `band-${modelKey}`, showSymbol: false, silent: true, z: 5 });
            }
        });

        if (showImbalance && imbalanceIndex >= 0) {
            series.push({ name: 'Imbalance Quantity', type: 'line', yAxisIndex: imbalanceIndex, data: processedChartData.map(d => [d.timestamp, d.imbalance]), itemStyle: { color: colors.imbalance }, lineStyle: { type: 'dashed' }, showSymbol: false });
        }
        if (showInterconnection && interconnectionIndex >= 0) {
            series.push({ name: '連系線流量差異 (MW)', type: 'line', yAxisIndex: interconnectionIndex, data: processedChartData.map(d => [d.timestamp, d.interconnection_flow_diff]), itemStyle: { color: colors.interconnection }, lineStyle: { width: 3 }, showSymbol: false });
        }
        if (showOcctoArea && occtoIndex >= 0) {
             const fields = Array.from(selectedOcctoFields);
             const isStacked = occtoChartType === 'stacked';
             fields.forEach(fieldKey => {
                 const fieldDef = occtoFields.find(f => f.value === fieldKey);
                 const stackedDef = occtoStackedFields.find(sf => sf.key === fieldKey);
                 const color = stackedDef?.color ?? colors.occtoArea;
                 const data = processedChartData.map(d => [d.timestamp, isStacked ? d.occto_data?.[fieldKey] : d.occto_values?.[fieldKey]]);
                 series.push({ name: fieldDef?.label || fieldKey, type: isStacked ? 'bar' : 'line', stack: isStacked ? 'occto-stack' : undefined, yAxisIndex: occtoIndex, data: data, itemStyle: { color: color, opacity: isStacked ? 0.6 : 1 }, showSymbol: false, lineStyle: isStacked ? undefined : { width: 2 } });
             });
        }
        if (showIntraday) {
            series.push({ name: 'Intraday', type: 'candlestick', data: processedChartData.map(d => [d.timestamp, d.intraday_open, d.intraday_close, d.intraday_low, d.intraday_high]), itemStyle: { color: colors.intraday, color0: 'transparent', borderColor: colors.intraday, borderColor0: colors.intraday }, barWidth: '60%' });
            series.push({ name: 'All Star Average', type: 'line', data: processedChartData.map(d => [d.timestamp, d.intraday_average]), itemStyle: { color: colors.intraday }, lineStyle: { width: 2 }, showSymbol: false });
        }

        return {
            backgroundColor: 'transparent',
            tooltip: {
                show: true,
                trigger: 'axis',
                axisPointer: { type: 'cross', show: true, label: { show: true }, animation: false },
                formatter: () => '', // 空內容
                backgroundColor: 'transparent',
                borderWidth: 0,
                textStyle: { fontSize: 0 },
                triggerOn: 'mousemove',
                // 【關鍵修正 1】防止 Tooltip 阻擋滑鼠事件
                extraCssText: 'pointer-events: none;'
            },
            grid,
            xAxis,
            yAxis,
            series,
            dataZoom: [
                { type: 'slider', show: true, xAxisIndex: 0, start: 0, end: 100, height: 25, bottom: 10, borderColor: colors.grid, textStyle: { color: colors.text } },
                { type: 'inside', xAxisIndex: 0, start: 0, end: 100 }
            ],
            animation: false
        };
    }, [processedChartData, priceRange, imbalanceRange, occtoRange, colors, darkMode, selectedModels, showPredictionRange, showImbalance, showIntraday, showInterconnection, showOcctoArea, occtoChartType, selectedOcctoFields, chartType, modelColorMap]);

    // Helper functions for finding nearest data point and processing timestamp
    const findNearestDataPoint = React.useCallback((targetTimestamp: number) => {
        const data = latestDataRef.current;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e4915982-d3b9-498e-9d28-1526983920b7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PriceChartECharts.tsx:233',message:'findNearestDataPoint called',data:{hasData:!!data,dataLength:data?.length,targetTimestamp},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        if (!data || data.length === 0) return null;

        let left = 0;
        let right = data.length - 1;
        let nearest = data[0];
        let minDiff = Math.abs(data[0].timestamp - targetTimestamp);

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const currentTimestamp = data[mid].timestamp;
            const diff = Math.abs(currentTimestamp - targetTimestamp);
            if (diff < minDiff) { minDiff = diff; nearest = data[mid]; }
            if (currentTimestamp < targetTimestamp) { left = mid + 1; } else { right = mid - 1; }
        }
        return nearest;
    }, []);

    const processTimestamp = React.useCallback((timestamp: number | null, chart: any) => {
        const data = latestDataRef.current;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e4915982-d3b9-498e-9d28-1526983920b7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PriceChartECharts.tsx:252',message:'processTimestamp called',data:{hasData:!!data,dataLength:data?.length,timestamp,isValid:timestamp!=null&&!isNaN(timestamp)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        if (!data || data.length === 0 || timestamp == null || isNaN(timestamp)) return;
        
        // 檢查 timestamp 是否在資料的有效時間範圍內 (寬鬆判定)
        // 這樣可以避免 containPixel 判定太嚴格的問題
        const minTime = data[0].timestamp;
        const maxTime = data[data.length - 1].timestamp;

        if (timestamp >= minTime && timestamp <= maxTime) {
            const nearest = findNearestDataPoint(timestamp);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e4915982-d3b9-498e-9d28-1526983920b7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PriceChartECharts.tsx:264',message:'About to call setHoveredData',data:{hasNearest:!!nearest,nearestTimestamp:nearest?.timestamp},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            if (nearest) {
                setHoveredData(nearest);
            }
        } else {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e4915982-d3b9-498e-9d28-1526983920b7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PriceChartECharts.tsx:267',message:'Timestamp out of range, setting null',data:{timestamp,minTime,maxTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            setHoveredData(null);
        }
    }, [findNearestDataPoint, setHoveredData]);

    // Use onEvents prop for reliable event handling
    const onEvents = useMemo(() => {
        return {
            mousemove: (params: any) => {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/e4915982-d3b9-498e-9d28-1526983920b7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PriceChartECharts.tsx:271',message:'onEvents mousemove called',data:{hasParams:!!params,hasEvent:!!params.event},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                const chart = chartRef.current?.getEchartsInstance();
                if (!chart) return;

                const event = params.event?.event || params.event;
                if (!event) return;

                // Get mouse coordinates
                let pointInPixel: [number, number] | null = null;
                if (event.zrX != null && event.zrY != null) {
                    pointInPixel = [event.zrX, event.zrY];
                } else if (event.offsetX != null && event.offsetY != null) {
                    pointInPixel = [event.offsetX, event.offsetY];
                }

                if (!pointInPixel) {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/e4915982-d3b9-498e-9d28-1526983920b7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PriceChartECharts.tsx:280',message:'No pointInPixel, returning early',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                    return;
                }

                // Convert pixel to grid coordinates
                const pointInGrid = chart.convertFromPixel({ xAxisIndex: 0 }, pointInPixel);
                const xValue = Array.isArray(pointInGrid) ? pointInGrid[0] : pointInGrid;
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/e4915982-d3b9-498e-9d28-1526983920b7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PriceChartECharts.tsx:285',message:'Coordinate conversion result',data:{pointInPixel,xValue,hasXValue:xValue!=null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                
                if (xValue != null) {
                    const timestamp = typeof xValue === 'number' ? xValue : new Date(xValue).getTime();
                    processTimestamp(timestamp, chart);
                }
            },
            globalout: () => {
                setHoveredData(null);
            },
            updateAxisPointer: (params: any) => {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/e4915982-d3b9-498e-9d28-1526983920b7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PriceChartECharts.tsx:295',message:'onEvents updateAxisPointer called',data:{hasAxesInfo:!!params.axesInfo,hasFirstAxis:!!(params.axesInfo&&params.axesInfo[0])},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                if (params.axesInfo && params.axesInfo[0]) {
                    const xValue = params.axesInfo[0].value;
                    const timestamp = typeof xValue === 'number' ? xValue : new Date(xValue).getTime();
                    const chart = chartRef.current?.getEchartsInstance();
                    if (chart) {
                        processTimestamp(timestamp, chart);
                    }
                }
            }
        };
    }, [processTimestamp, setHoveredData]); 

    return (
        <Box sx={{ width: '100%', height: 450 }}>
            <ReactECharts
                ref={chartRef}
                option={option}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                onEvents={onEvents}
            />
        </Box>
    );
};