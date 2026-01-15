'use client';

import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';

// Types
import { ImbalanceData, IntradayData, InterconnectionFlow, OcctoAreaData } from '@/types';
import { ChartDataPoint } from '@/utils/chartUtils';

// Components
import { PriceChartControls } from './PriceChartControls';
import { PriceChartCanvas } from './PriceChartCanvas';
import { ZScoreChart } from './ZScoreChart';
import { CustomTooltip } from './CustomTooltip';

// Context
import { PriceChartProvider, usePriceChart } from './context/PriceChartContext';

// Hooks
import { useChartData } from './hooks/useChartData';

interface PriceChartProps {
    chartData: ChartDataPoint[];
    areaName: string;
    selectedModels: {
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }[];
    topBottomPairs?: number;
    imbalanceData?: ImbalanceData[];
    intradayData?: IntradayData[];
    interconnectionData?: InterconnectionFlow[];
    occtoAreaData?: OcctoAreaData[];
}

const PriceChartContent: React.FC = () => {
    const {
        areaName,
        selectedModels,
        modelMAEs,
        modelColorMap,
        colors,
        darkMode,
        showPredictionRange,
        processedChartData, // Needed for Canvas
        showZScore // Needed for ZScoreChart
    } = usePriceChart();

    return (
        <Paper
            elevation={3}
            sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: colors.background,
                height: '100%',
                border: '1px solid #333'
            }}
        >
            <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6" component="h2" sx={{ color: colors.text, fontWeight: 'bold' }}>
                        {`Price ${areaName} Japan`}
                    </Typography>

                    {/* MAE Chips */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {selectedModels.map((model, index) => {
                            const modelKey = `${model.id}|${model.name}`;
                            const mae = modelMAEs[modelKey];
                            if (mae === undefined) return null;
                            return (
                                <Chip
                                    key={`mae-${modelKey}-${index}`}
                                    label={`${model.name} MAE: ${mae.toFixed(2)}`}
                                    size="small"
                                    sx={{
                                        backgroundColor: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0)',
                                        color: modelColorMap[modelKey],
                                        fontWeight: 'bold',
                                        border: `1px solid ${modelColorMap[modelKey]}`,
                                    }}
                                />
                            );
                        })}
                    </Box>
                </Box>

                {/* Controls now consume context internally */}
                <PriceChartControls />

                {/* Legends */}
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                        label="Observation"
                        size="small"
                        sx={{
                            backgroundColor: 'transparent',
                            border: `1px solid ${colors.actual}`,
                            color: colors.actual,
                            '& .MuiChip-label': { fontWeight: 'bold' }
                        }}
                    />
                    {selectedModels.map((model, index) => {
                        const modelKey = `${model.id}|${model.name}`;
                        const modelColor = modelColorMap[modelKey];
                        return (
                            <Chip
                                key={`legend-${modelKey}-${index}`}
                                label={`${model.name} ${model.calculatingDate === 'latest' ? '(最新)' : `(${model.calculatingDate})`}`}
                                size="small"
                                sx={{
                                    backgroundColor: 'transparent',
                                    border: `1px solid ${modelColor}`,
                                    color: modelColor,
                                    '& .MuiChip-label': { fontWeight: 'bold' }
                                }}
                            />
                        );
                    })}
                    {showPredictionRange && (
                        <Chip
                            label="Forecast range (P5-P95)"
                            size="small"
                            sx={{
                                backgroundColor: 'transparent',
                                border: `1px solid rgba(255,255,255,0.2)`,
                                color: colors.subText,
                            }}
                        />
                    )}
                    <Box sx={{ ml: 'auto' }}>
                        <Typography variant="caption" sx={{ color: colors.subText }}>
                            All data in ¥/KWh
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Canvas now consumes context internally */}
            <PriceChartCanvas />

            <ZScoreChart
                showZScore={showZScore}
                processedChartData={processedChartData}
                colors={colors}
                selectedModels={selectedModels}
                modelColorMap={modelColorMap}
            />
        </Paper>
    );
};

const PriceChart: React.FC<PriceChartProps> = (props) => {
    const { darkMode } = useTheme();

    // Memoize colors if needed, but Context handles it too. 
    // Ideally pass basic colors to Provider.
    const colors = {
        actual: darkMode ? '#ff4d4f' : '#cf1322',
        grid: darkMode ? '#333' : '#e6e6e6',
        background: darkMode ? '#1a1a1a' : '#ffffff',
        text: darkMode ? '#d9d9d9' : '#000000',
        subText: darkMode ? '#a6a6a6' : '#595959',
        tooltipBg: darkMode ? 'rgba(33, 33, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        tooltipBorder: darkMode ? '#444' : '#d9d9d9',
        tooltipHeaderBg: darkMode ? '#2a2a2a' : '#f0f0f0',
        warning: darkMode ? '#faad14' : '#d48806',
        nowLine: darkMode ? '#1890ff' : '#0050b3',
        predicted: darkMode ? '#36cfc9' : '#13a8a8',
        delta: {
            positive: darkMode ? '#52c41a' : '#389e0d',
            negative: darkMode ? '#f5222d' : '#cf1322',
            neutral: darkMode ? '#a6a6a6' : '#8c8c8c'
        },
        imbalance: darkMode ? '#8884d8' : '#8884d8',
        interconnection: darkMode ? '#ff7300' : '#ff7300',
        intraday: darkMode ? '#82ca9d' : '#82ca9d',
        occtoArea: darkMode ? '#ffc658' : '#ffc658',
    };

    return (
        <PriceChartProvider {...props} darkMode={darkMode} colors={colors}>
            <PriceChartContent />
        </PriceChartProvider>
    );
};

export default PriceChart;
