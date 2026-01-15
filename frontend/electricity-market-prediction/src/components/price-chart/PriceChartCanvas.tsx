import React, { useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea, Area, Line, Bar, ReferenceLine, Customized } from 'recharts';
import { format, startOfDay } from 'date-fns';
import { ModelPrediction } from '@/utils/chartUtils';
import { occtoFields, occtoStackedFields } from './constants';

// Context
import { usePriceChart } from './context/PriceChartContext';

// Local Components
import { CustomTooltip } from './CustomTooltip';

// --- Internal Components (formerly Layers) ---

const CandleStickLayer = (props: any) => {
    const { xAxisMap, yAxisMap, data, yAxisId, darkMode } = props;

    // 1. Get X Axis
    const xAxis = xAxisMap && (xAxisMap[0] || Object.values(xAxisMap)[0]);
    const xScale = xAxis?.scale;

    // 2. Get Y Axis (by ID)
    let yScale: any;
    if (yAxisMap) {
        if (yAxisMap[yAxisId]) {
            yScale = yAxisMap[yAxisId].scale;
        } else {
            const axisObj = Object.values(yAxisMap).find((axis: any) => axis.props?.yAxisId === yAxisId) as any;
            if (axisObj && typeof axisObj.scale === 'function') {
                yScale = axisObj.scale;
            }
        }
    }

    if (!xScale || !yScale || !data) return null;

    const range = xScale.range();
    const chartWidth = Math.abs(range[1] - range[0]);
    const dataLength = data.length;
    const candleWidth = Math.max(3, Math.min(12, (chartWidth / dataLength) * 0.6));

    return (
        <g className="recharts-candlestick-layer">
            {data.map((entry: any, index: number) => {
                const open = entry.intraday_opening;
                const close = entry.intraday_closing;
                const high = entry.intraday_high;
                const low = entry.intraday_low;
                const timestamp = entry.timestamp;

                if ([open, close, high, low, timestamp].some(v => v === null || v === undefined)) return null;

                const x = xScale(timestamp);
                const yOpen = yScale(open);
                const yClose = yScale(close);
                const yHigh = yScale(high);
                const yLow = yScale(low);

                if (isNaN(x) || isNaN(yOpen) || isNaN(yClose)) return null;

                const isRising = close >= open;
                const color = isRising
                    ? (darkMode ? '#ff4d4f' : '#cf1322')
                    : (darkMode ? '#52c41a' : '#389e0d');

                const bodyTop = Math.min(yOpen, yClose);
                const bodyHeight = Math.max(1, Math.abs(yOpen - yClose));

                return (
                    <g key={`candle-${index}`}>
                        <line
                            x1={x} x2={x} y1={yHigh} y2={yLow}
                            stroke={color}
                            strokeWidth={1.5}
                            strokeOpacity={0.2}
                        />
                        <rect
                            x={x - candleWidth / 2}
                            y={bodyTop}
                            width={candleWidth}
                            height={bodyHeight}
                            fill={color}
                            stroke="none"
                            fillOpacity={0.2}
                        />
                    </g>
                );
            })}
        </g>
    );
};

export const PriceChartCanvas: React.FC = () => {
    const {
        processedChartData,
        priceRange,
        imbalanceRange,
        occtoRange,

        // States
        showPredictionRange,
        showImbalance,
        showIntraday,
        showInterconnection,
        showOcctoArea,

        // Configs
        selectedModels,
        modelColorMap,
        chartType,
        occtoChartType,
        selectedOcctoField,
        adjacentPointsCount,

        // Theme
        colors,
        darkMode,
        areaName
    } = usePriceChart();

    // --- Helpers moved from PriceChart.tsx ---

    const CustomizedDot = (props: any) => {
        const { cx, cy, stroke, payload, dataKey, key } = props;
        if (!payload.markerInfo) return null;

        let type = null;
        if (dataKey === "actualPrice") {
            type = payload.markerInfo.actualType;
        }

        if (!type) return null;
        return (
            <svg key={key} x={cx - 5} y={cy - 5} width={10} height={10} viewBox="0 0 10 10">
                {type === 'top' ? (
                    <path d="M5 0 L10 10 L0 10 Z" fill={stroke} />
                ) : (
                    <path d="M0 0 L10 0 L5 10 Z" fill={stroke} />
                )}
            </svg>
        );
    };

    const getModelDot = (modelKey: string) => (props: any) => {
        const { cx, cy, stroke, payload, key } = props;
        if (!payload.markerInfo) return <g key={key} />;
        const type = payload.markerInfo.models[modelKey];
        if (!type) return <g key={key} />;
        return (
            <svg key={key} x={cx - 4} y={cy - 4} width={8} height={8} viewBox="0 0 10 10">
                {type === 'top' ? (
                    <path d="M5 0 L10 5 L5 10 L0 5 Z" fill={stroke} />
                ) : (
                    <circle cx="5" cy="5" r="4" fill={stroke} />
                )}
            </svg>
        );
    };

    // --- Axis Helpers ---

    const generateXAxisTicks = useCallback(() => {
        if (!processedChartData || processedChartData.length === 0) return [];

        const startTime = processedChartData[0].timestamp;
        const endTime = processedChartData[processedChartData.length - 1].timestamp;
        const duration = endTime - startTime;
        const hoursTotal = duration / (1000 * 60 * 60);

        let intervalHours = 3;
        if (hoursTotal > 48) intervalHours = 6;
        if (hoursTotal > 96) intervalHours = 12;
        if (hoursTotal > 168) intervalHours = 24;

        const ticks: number[] = [];
        let current = startOfDay(new Date(startTime)).getTime();

        // Adjust start
        while (current < startTime) {
            current += intervalHours * 60 * 60 * 1000;
        }

        while (current <= endTime) {
            ticks.push(current);
            current += intervalHours * 60 * 60 * 1000;
        }

        return ticks;
    }, [processedChartData]);

    const formatXAxis = useCallback((value: string | number) => {
        if (value === null || value === undefined) return '';
        let date: Date;
        if (typeof value === 'number') {
            date = new Date(value);
        } else {
            try {
                const isoString = value.includes('T') ? value : value.replace(' ', 'T');
                date = new Date(isoString);
            } catch (e) { return ''; }
        }
        if (isNaN(date.getTime())) return '';

        const hour = date.getHours();
        const minute = date.getMinutes();
        if (hour === 0 && minute === 0) {
            return format(date, 'MM/dd');
        }
        return format(date, 'HH:mm');
    }, []);

    // Safety check
    const chartData = processedChartData && processedChartData.length > 0 ? processedChartData : [];

    return (
        <Box sx={{ pb: 3 }}>
            <ResponsiveContainer width="100%" height={450}>
                <ComposedChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                    syncId="priceChart"
                >
                    {/* 1. Background Elements (Grid, Reference Areas) */}
                    {(() => {
                        if (!processedChartData || processedChartData.length === 0) return null;
                        const areas = [];
                        const currentStart = processedChartData[0].timestamp;
                        const endTimestamp = processedChartData[processedChartData.length - 1].timestamp;
                        let iterTime = startOfDay(new Date(currentStart)).getTime();
                        const dayMillis = 24 * 60 * 60 * 1000;
                        let dayIndex = 0;

                        while (iterTime < endTimestamp) {
                            if (dayIndex % 2 !== 0) {
                                areas.push(
                                    <ReferenceArea
                                        key={iterTime}
                                        x1={Math.max(iterTime, currentStart)}
                                        x2={Math.min(iterTime + dayMillis, endTimestamp)}
                                        yAxisId="price"
                                        fill={darkMode ? "#444444" : "#e0e0e0"}
                                        fillOpacity={0.4}
                                    />
                                );
                            }
                            iterTime += dayMillis;
                            dayIndex++;
                        }
                        return areas;
                    })()}

                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />

                    {/* 2. AXES DEFINITIONS (Grouped together for reliable layout calculation) */}
                    <XAxis
                        dataKey="timestamp"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={formatXAxis}
                        ticks={generateXAxisTicks()}
                        stroke={colors.text}
                        tick={{ fill: colors.text, fontSize: 11 }}
                        tickLine={{ stroke: colors.text }}
                        axisLine={{ stroke: colors.text }}
                        height={50}
                        allowDuplicatedCategory={false}
                    />

                    <YAxis
                        yAxisId="price"
                        domain={[priceRange.min, priceRange.max]}
                        label={{ value: '¥/KWh', angle: -90, position: 'insideLeft', style: { fill: colors.text, fontSize: 12 } }}
                        stroke={colors.text}
                        tick={{ fill: colors.text, fontSize: 11 }}
                    />

                    {showImbalance && (
                        <YAxis
                            yAxisId="imbalance"
                            orientation="right"
                            domain={[imbalanceRange.min, imbalanceRange.max]}
                            stroke={colors.imbalance}
                            tick={{ fill: colors.imbalance, fontSize: 11 }}
                            label={{ value: 'Imbalance Quantity', angle: 90, position: 'insideRight', style: { fill: colors.imbalance, fontSize: 12 } }}
                        />
                    )}

                    {showInterconnection && (
                        <YAxis
                            yAxisId="interconnection"
                            orientation="right"
                            domain={['auto', 'auto']}
                            stroke={colors.interconnection}
                            tick={{ fill: colors.interconnection, fontSize: 11 }}
                            label={{ value: 'MW', angle: 90, position: 'insideRight', style: { fill: colors.interconnection, fontSize: 12 } }}
                        />
                    )}

                    {showOcctoArea && (
                        <YAxis
                            yAxisId="occto"
                            orientation="right"
                            domain={[occtoRange.min, occtoRange.max]}
                            stroke={colors.occtoArea}
                            tick={{ fill: colors.occtoArea, fontSize: 11 }}
                            label={{
                                value: 'Quantity',
                                angle: 90,
                                position: 'insideRight',
                                style: { fill: colors.occtoArea, fontSize: 12 }
                            }}
                        />
                    )}

                    {/* 3. DATA SERIES (Grouped together) */}

                    {/* Imbalance Data */}
                    {showImbalance && (
                        <Line
                            yAxisId="imbalance"
                            type="monotone"
                            dataKey="imbalance"
                            stroke={colors.imbalance}
                            name="Imbalance Quantity"
                            strokeWidth={1.5}
                            strokeDasharray="3 3"
                            connectNulls={true}
                            isAnimationActive={false}
                            dot={false}
                        />
                    )}

                    {/* Interconnection Data */}
                    {showInterconnection && (
                        <ReferenceLine y={0} yAxisId="interconnection" stroke={colors.interconnection} strokeOpacity={0.3} strokeDasharray="3 3" />
                    )}
                    {showInterconnection && (
                        <Line
                            yAxisId="interconnection"
                            type="monotone"
                            dataKey="interconnection_flow_diff"
                            stroke={colors.interconnection}
                            strokeOpacity={1}
                            name="連系線流量差異 (MW)"
                            strokeWidth={3}
                            connectNulls={true}
                            isAnimationActive={false}
                            dot={false}
                            activeDot={{ r: 5, fill: colors.interconnection, stroke: colors.interconnection, strokeWidth: 2 }}
                        />
                    )}

                    {/* OCCTO Data */}
                    {showOcctoArea && occtoChartType === 'line' && (
                        <Line
                            yAxisId="occto"
                            type="monotone"
                            dataKey="occto_value"
                            stroke={colors.occtoArea}
                            name={occtoFields.find(f => f.value === selectedOcctoField)?.label || selectedOcctoField}
                            strokeWidth={2}
                            dot={false}
                            connectNulls={true}
                            isAnimationActive={false}
                        />
                    )}

                    {showOcctoArea && occtoChartType === 'stacked' && occtoStackedFields.map(field => (
                        <Bar
                            key={field.key}
                            dataKey={`occto_data.${field.key}`}
                            yAxisId="occto"
                            stackId="occto"
                            fill={field.color}
                            name={field.label}
                            isAnimationActive={false}
                            barSize={20}
                            fillOpacity={0.6}
                        />
                    ))}

                    {/* Prediction Ranges (Area) */}
                    {showPredictionRange && selectedModels.map((model: any, index: number) => {
                        const modelKey = `${model.id}|${model.name}`;
                        const modelColor = modelColorMap[modelKey];
                        let areaColor = `${modelColor}33`;
                        if (modelColor && modelColor.startsWith('rgb')) {
                            areaColor = modelColor.replace(')', ', 0.2)').replace('rgb', 'rgba');
                        } else if (modelColor && modelColor.startsWith('hsl')) {
                            areaColor = modelColor.replace(')', ', 0.2)').replace('hsl', 'hsla');
                        }
                        return (
                            <Area
                                key={`area-${modelKey}-${index}`}
                                yAxisId="price"
                                type={chartType === 'stepLine' ? 'step' : 'monotone'}
                                dataKey={(datum) => {
                                    const prediction = datum.modelPredictions.find((mp: ModelPrediction) => `${mp.modelId}|${mp.modelName}` === modelKey);
                                    if (!prediction) return null;
                                    const bottom = prediction.predictedPrice5 ?? prediction.predictedPrice;
                                    const top = prediction.predictedPrice95 ?? prediction.predictedPrice;
                                    if (bottom === null || top === null) return null;
                                    return [bottom, top];
                                }}
                                stroke="none"
                                fill={areaColor}
                                fillOpacity={0.5}
                                activeDot={false}
                                isAnimationActive={false}
                                connectNulls={true}
                            />
                        );
                    })}

                    {/* Prediction Lines */}
                    {selectedModels.map((model: any, index: number) => {
                        const modelKey = `${model.id}|${model.name}`;
                        const modelColor = modelColorMap[modelKey];
                        return (
                            <Line
                                key={`line-${modelKey}-${index}`}
                                yAxisId="price"
                                type={chartType === 'stepLine' ? 'step' : 'monotone'}
                                dataKey={(datum) => {
                                    const prediction = datum.modelPredictions.find(
                                        (mp: ModelPrediction) => `${mp.modelId}|${mp.modelName}` === modelKey
                                    );
                                    return prediction?.predictedPrice ?? null;
                                }}
                                stroke={modelColor}
                                name={`${model.name}`}
                                dot={getModelDot(modelKey)}
                                strokeWidth={1.5}
                                connectNulls={true}
                                isAnimationActive={false}
                            />
                        );
                    })}

                    {/* Actual Price Line */}
                    <Line
                        yAxisId="price"
                        type={chartType === 'stepLine' ? 'step' : 'monotone'}
                        dataKey="actualPrice"
                        stroke={colors.actual || '#ff0000'}
                        name="Observation"
                        dot={<CustomizedDot />}
                        strokeWidth={1.5}
                        connectNulls={true}
                        isAnimationActive={false}
                    />

                    {/* Intraday Layer */}
                    {showIntraday && (
                        <Customized
                            component={CandleStickLayer}
                            yAxisId="price"
                            darkMode={darkMode}
                        />
                    )}
                    {showIntraday && (
                        <Line
                            yAxisId="price"
                            type="monotone"
                            dataKey="intraday_average"
                            stroke={colors.intraday}
                            name="時間前市場平均價"
                            strokeWidth={2}
                            dot={false}
                            connectNulls={true}
                            isAnimationActive={false}
                        />
                    )}

                    {/* 4. INTERACTIONS (Tooltip must be last or near last to render on top properly) */}
                    <Tooltip
                        content={<CustomTooltip
                            active={false}
                            payload={[]}
                            label=""
                            processedChartData={processedChartData}
                            adjacentPointsCount={adjacentPointsCount}
                            colors={colors}
                            areaName={areaName}
                            selectedModels={selectedModels}
                            modelColorMap={modelColorMap}
                            showIntraday={showIntraday}
                            showImbalance={showImbalance}
                            showInterconnection={showInterconnection}
                            showOcctoArea={showOcctoArea}
                            selectedOcctoField={selectedOcctoField}
                            occtoChartType={occtoChartType}
                        />}
                        wrapperStyle={{ zIndex: 1000 }}
                    />

                </ComposedChart>
            </ResponsiveContainer>
        </Box>
    );
};