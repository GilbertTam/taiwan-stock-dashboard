'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { format } from 'date-fns';
import { ModelPrediction } from '@/utils/chartUtils';

// Types for the chart data point
interface ProcessedDataPoint {
    timestamp: number;
    actualPrice: number | null;
    modelPredictions: ModelPrediction[];
    modelDifferences?: Record<string, number | null>;
    actualDelta?: number | null;
    imbalance?: number | null;
    intraday_average?: number | null;
    interconnection_flow_diff?: number | null;
    occto_values?: Record<string, number | null>;
    weather_data?: {
        temperature?: number | null;
        rainfall?: number | null;
        snowfall?: number | null;
        wind_speed?: number | null;
        relative_humidity?: number | null;
        clouds_all?: number | null;
        [key: string]: any;
    };
    weather_data_actual?: {
        temperature?: number | null;
        rainfall?: number | null;
        snowfall?: number | null;
        wind_speed?: number | null;
        relative_humidity?: number | null;
        clouds_all?: number | null;
        [key: string]: any;
    };
    weather_data_forecast?: {
        temperature?: number | null;
        rainfall?: number | null;
        snowfall?: number | null;
        wind_speed?: number | null;
        relative_humidity?: number | null;
        clouds_all?: number | null;
        [key: string]: any;
    };
}

interface SelectedModel {
    id: string | number;
    name: string;
    color: string;
    calculatingDate: string;
}

interface ChartColors {
    actual: string;
    text: string;
    subText: string;
    background: string;
    tooltipBg: string;
    tooltipBorder: string;
    delta: {
        positive: string;
        negative: string;
        neutral: string;
    };
}

interface ChartInfoPanelProps {
    hoveredData: ProcessedDataPoint | null;
    selectedModels: SelectedModel[];
    modelColorMap: Record<string, string>;
    colors: ChartColors;
    areaName: string;
    showImbalance?: boolean;
    showIntraday?: boolean;
    showInterconnection?: boolean;
    showOcctoArea?: boolean;
    showWeather?: boolean;
    showWeatherActual?: boolean;
    showWeatherForecast?: boolean;
    selectedOcctoFields?: Set<string>;
    selectedWeatherFields?: Set<string>;
    selectedWeatherFieldsActual?: Set<string>;
    selectedWeatherFieldsForecast?: Set<string>;
}

/**
 * ChartInfoPanel - TradingView-style fixed header panel
 * Displayed above the chart in a reserved space to prevent layout shift and occlusion
 */
export const ChartInfoPanel: React.FC<ChartInfoPanelProps> = ({
    hoveredData,
    selectedModels,
    modelColorMap,
    colors,
    areaName,
    showImbalance = false,
    showIntraday = false,
    showInterconnection = false,
    showOcctoArea = false,
    showWeather = false,
    showWeatherActual = false,
    showWeatherForecast = false,
    selectedOcctoFields = new Set(['area_demand']),
    selectedWeatherFields = new Set(['temperature']),
    selectedWeatherFieldsActual = new Set(['temperature']),
    selectedWeatherFieldsForecast = new Set(['temperature']),
}) => {
    // Format delta value with color
    const formatDelta = (value: number | null | undefined) => {
        if (value === null || value === undefined) return null;

        const isPositive = value > 0;
        const isNegative = value < 0;

        return (
            <Typography
                component="span"
                variant="caption"
                sx={{
                    color: isPositive
                        ? colors.delta.positive
                        : isNegative
                            ? colors.delta.negative
                            : colors.delta.neutral,
                    fontWeight: 'bold',
                    ml: 0.5,
                }}
            >
                ({isPositive ? '+' : ''}{value.toFixed(2)})
            </Typography>
        );
    };

    // Always render container - fixed height header style (TradingView style)
    return (
        <Box
            sx={{
                width: '100%',
                minHeight: 64, // Two rows
                display: 'flex',
                flexDirection: 'column',
                px: 2,
                py: 0.75,
                backgroundColor: 'var(--card-bg)',
            }}
        >
            {!hoveredData ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="caption" sx={{ color: colors.subText, opacity: 0.6 }}>
                    移動滑鼠至圖表查看詳情
                </Typography>
                </Box>
            ) : (
                <>
                    {/* Row 1: Time and Prices */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1.5,
                        mb: 0.75,
                        flexWrap: 'wrap',
                    }}>
                    {/* Time display */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: colors.subText, fontWeight: 'bold' }}>
                            {areaName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.text, fontWeight: 'bold' }}>
                            {format(new Date(hoveredData.timestamp), 'MM/dd HH:mm')}
                        </Typography>
                    </Box>

                        {/* Actual price */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 1.5, borderLeft: `1px solid ${colors.tooltipBorder}` }}>
                        <Box
                            sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: colors.actual,
                            }}
                        />
                        <Typography variant="caption" sx={{ color: colors.actual, fontWeight: 'bold' }}>
                            Obs:
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.actual }}>
                            {hoveredData.actualPrice !== null
                                ? `¥${hoveredData.actualPrice.toFixed(2)}`
                                : '-'}
                        </Typography>
                        {formatDelta(hoveredData.actualDelta)}
                    </Box>

                    {/* Model predictions */}
                    {selectedModels.map((model: SelectedModel) => {
                        const modelKey = `${model.id}|${model.name}`;
                        const modelColor = modelColorMap[modelKey] || model.color;
                        const prediction = hoveredData.modelPredictions?.find(
                            (mp: ModelPrediction) => `${mp.modelId}|${mp.modelName}` === modelKey
                        );
                        const difference = hoveredData.modelDifferences?.[modelKey];

                        return (
                            <Box key={modelKey} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box
                                    sx={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        backgroundColor: modelColor,
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: modelColor, fontWeight: 'bold' }}>
                                    {model.name}:
                                </Typography>
                                <Typography variant="caption" sx={{ color: modelColor }}>
                                    {prediction?.predictedPrice !== null && prediction?.predictedPrice !== undefined
                                        ? `¥${prediction.predictedPrice.toFixed(2)}`
                                        : '-'}
                                </Typography>
                                {formatDelta(difference)}
                            </Box>
                        );
                    })}
                    </Box>

                    {/* Row 2: Other Metrics */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1.5,
                        flexWrap: 'wrap',
                        pt: 0.75,
                        borderTop: `1px solid ${colors.tooltipBorder}`,
                    }}>
                    {/* Optional: Intraday */}
                    {showIntraday && hoveredData.intraday_average != null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ color: '#82ca9d', fontWeight: 'bold' }}>
                                Intra: ¥{hoveredData.intraday_average.toFixed(2)}
                            </Typography>
                        </Box>
                    )}

                    {/* Optional: Imbalance */}
                    {showImbalance && hoveredData.imbalance != null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ color: '#8884d8', fontWeight: 'bold' }}>
                                Imb: {hoveredData.imbalance.toFixed(2)}
                            </Typography>
                        </Box>
                    )}

                    {/* Optional: Interconnection */}
                    {showInterconnection && hoveredData.interconnection_flow_diff != null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ color: '#ff7300', fontWeight: 'bold' }}>
                                連系: {hoveredData.interconnection_flow_diff.toFixed(2)} MW
                            </Typography>
                        </Box>
                    )}

                        {/* Optional: OCCTO Fields */}
                        {showOcctoArea && hoveredData.occto_values && (
                            <>
                                {Array.from(selectedOcctoFields).map((field) => {
                                    const value = hoveredData.occto_values?.[field];
                                    if (value === null || value === undefined) return null;
                                    
                                    // Get field color from occtoStackedFields
                                    const fieldColors: Record<string, string> = {
                                        area_demand: '#14b8a6',
                                        nuclear_power: '#f59e0b',
                                        thermal: '#ef4444',
                                        hydropower: '#3b82f6',
                                        geothermal_power: '#8b5cf6',
                                        biomass: '#10b981',
                                        solar_power_generation_actual: '#fbbf24',
                                        wind_power_generation_actual: '#06b6d4',
                                        pumped_storage: '#6366f1',
                                        battery_storage: '#ec4899',
                                        interconnection_line: '#14b8a6',
                                        others: '#6b7280',
                                    };
                                    
                                    return (
                                        <Box key={field} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Typography variant="caption" sx={{ color: fieldColors[field] || '#14b8a6', fontWeight: 'bold' }}>
                                                {field}: {value.toFixed(0)} MW
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </>
                        )}

                        {/* Optional: Weather Fields */}
                        {showWeather && (
                            <>
                                {/* Weather Actual */}
                                {showWeatherActual && Array.from(selectedWeatherFieldsActual).map((field) => {
                                    const value = hoveredData.weather_data_actual?.[field as keyof typeof hoveredData.weather_data_actual];
                                    if (value === null || value === undefined) return null;
                                    
                                    const fieldLabels: Record<string, { label: string; unit: string; color: string }> = {
                                        temperature: { label: 'Temp', unit: '°C', color: '#ff4d4f' },
                                        rainfall: { label: 'Rain', unit: 'mm', color: '#1e90ff' },
                                        snowfall: { label: 'Snow', unit: 'mm', color: '#91d5ff' },
                                        wind_speed: { label: 'Wind', unit: 'm/s', color: '#52c41a' },
                                        relative_humidity: { label: 'Humid', unit: '%', color: '#722ed1' },
                                        clouds_all: { label: 'Clouds', unit: '%', color: '#8c8c8c' },
                                    };
                                    
                                    const fieldInfo = fieldLabels[field];
                                    if (!fieldInfo) return null;
                                    
                                    return (
                                        <Box key={`actual-${field}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Typography variant="caption" sx={{ color: fieldInfo.color, fontWeight: 'bold' }}>
                                                {fieldInfo.label} (A): {typeof value === 'number' ? value.toFixed(1) : value} {fieldInfo.unit}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                                {/* Weather Forecast */}
                                {showWeatherForecast && Array.from(selectedWeatherFieldsForecast).map((field) => {
                                    const value = hoveredData.weather_data_forecast?.[field as keyof typeof hoveredData.weather_data_forecast];
                                    if (value === null || value === undefined) return null;
                                    
                                    const fieldLabels: Record<string, { label: string; unit: string; color: string }> = {
                                        temperature: { label: 'Temp', unit: '°C', color: '#ff4d4f' },
                                        rainfall: { label: 'Rain', unit: 'mm', color: '#1e90ff' },
                                        snowfall: { label: 'Snow', unit: 'mm', color: '#91d5ff' },
                                        wind_speed: { label: 'Wind', unit: 'm/s', color: '#52c41a' },
                                        relative_humidity: { label: 'Humid', unit: '%', color: '#722ed1' },
                                        clouds_all: { label: 'Clouds', unit: '%', color: '#8c8c8c' },
                                    };
                                    
                                    const fieldInfo = fieldLabels[field];
                                    if (!fieldInfo) return null;
                                    
                                    return (
                                        <Box key={`forecast-${field}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Typography variant="caption" sx={{ color: fieldInfo.color, fontWeight: 'bold', opacity: 0.6 }}>
                                                {fieldInfo.label} (F): {typeof value === 'number' ? value.toFixed(1) : value} {fieldInfo.unit}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </>
                        )}
                    </Box>
                </>
            )}
        </Box>
    );
};

export default ChartInfoPanel;
