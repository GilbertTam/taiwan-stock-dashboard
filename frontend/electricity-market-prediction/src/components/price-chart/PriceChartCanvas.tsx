import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea, Area, Line, Bar, ReferenceLine, Customized } from 'recharts';
import { startOfDay } from 'date-fns';
import { ModelPrediction } from '@/utils/chartUtils';
import { occtoFields, occtoStackedFields } from './constants';
import { generateXAxisTicks, formatXAxis } from '@/utils/chartHelpers';

// Context
import { usePriceChart } from './context/PriceChartContext';

// Local Components
import { CustomTooltip } from './CustomTooltip';
import { CandleStickLayer } from './layers/CandleStickLayer';
import { CustomizedDot } from './markers/CustomizedDot';
import { getModelDot } from './markers/ModelDot';

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
                        ticks={generateXAxisTicks(processedChartData || [])}
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