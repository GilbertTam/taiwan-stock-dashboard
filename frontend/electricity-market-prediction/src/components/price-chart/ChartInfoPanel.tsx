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
}) => {
    // #region agent log
    React.useEffect(() => {
        fetch('http://127.0.0.1:7242/ingest/e4915982-d3b9-498e-9d28-1526983920b7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChartInfoPanel.tsx:56',message:'ChartInfoPanel render',data:{hasHoveredData:!!hoveredData,hoveredTimestamp:hoveredData?.timestamp},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    }, [hoveredData]);
    // #endregion
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
                minHeight: 32, // Slightly reduced for tighter layout
                display: 'flex',
                alignItems: 'center',
                gap: 1.5, // Tighter spacing
                flexWrap: 'wrap',
                px: 2,
                py: 0.5,
                backgroundColor: 'transparent',
                borderBottom: `1px solid ${colors.tooltipBorder}`,
                mb: 0.5
            }}
        >
            {!hoveredData ? (
                <Typography variant="caption" sx={{ color: colors.subText, opacity: 0.6 }}>
                    移動滑鼠至圖表查看詳情
                </Typography>
            ) : (
                <>
                    {/* Time display */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: colors.subText, fontWeight: 'bold' }}>
                            {areaName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.text, fontWeight: 'bold' }}>
                            {format(new Date(hoveredData.timestamp), 'MM/dd HH:mm')}
                        </Typography>
                    </Box>

                    {/* Actual price - with left border as separator */}
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
                </>
            )}
        </Box>
    );
};

export default ChartInfoPanel;
