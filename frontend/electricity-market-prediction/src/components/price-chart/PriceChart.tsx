'use client';

import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chartColors';

// Types
import { ImbalanceData, IntradayData, InterconnectionFlow, OcctoAreaData } from '@/types';
import { ChartDataPoint } from '@/utils/chartUtils';

// Components
import { PriceChartControls } from './PriceChartControls';
import { PriceChartLightweight } from './PriceChartLightweight';
import { ZScoreChartLightweight } from './ZScoreChartLightweight';
import { ChartInfoPanel } from './ChartInfoPanel';

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

// Optimization: Memoize the chart component to prevent heavy re-renders 
// when parent state (like hoveredData text) updates, although it consumes Context, 
// explicit memoization helps signal intent and blocks prop-based re-renders.
const MemoizedPriceChartLightweight = React.memo(PriceChartLightweight);
const MemoizedZScoreChartLightweight = React.memo(ZScoreChartLightweight);

// Fully migrated to Lightweight Charts - ECharts completely removed
if (typeof window !== 'undefined') {
    console.log('[PriceChart] Using Lightweight Charts (ECharts removed)');
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
        processedChartData,
        showZScore,
        // Hover state - This is what updates when you move the mouse
        hoveredData,
        showImbalance,
        showIntraday,
        showInterconnection,
    } = usePriceChart();

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 2,
                backgroundColor: colors.background,
                border: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 480,
            }}
        >
            {/* Header + controls */}
            <Box sx={{ px: 2, pt: 2, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
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

            {/* Main / sub panes */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    px: 2,
                    pb: 2,
                    gap: 1.5,
                }}
            >
                {/* TradingView-style fixed info header above main chart */}
                <ChartInfoPanel
                    hoveredData={hoveredData}
                    selectedModels={selectedModels}
                    modelColorMap={modelColorMap}
                    colors={colors}
                    areaName={areaName}
                    showImbalance={showImbalance}
                    showIntraday={showIntraday}
                    showInterconnection={showInterconnection}
                />

                {/* Main price chart */}
                <Box 
                    sx={{ 
                        flex: 1, 
                        minHeight: 320,
                        position: 'relative',
                        width: '100%',
                    }}
                >
                    <MemoizedPriceChartLightweight />
                </Box>

                {/* Sub-panel: Z-Score (kept here for now; can be moved under tabs in PriceChartSection) */}
                <Box sx={{ mt: 0.5 }}>
                    <MemoizedZScoreChartLightweight
                        showZScore={showZScore}
                        processedChartData={processedChartData}
                        colors={colors}
                        selectedModels={selectedModels}
                        modelColorMap={modelColorMap}
                        darkMode={darkMode}
                    />
                </Box>
            </Box>
        </Paper >
    );
};

const PriceChart: React.FC<PriceChartProps> = (props) => {
    const { darkMode } = useTheme();

    // Unified chart colors (shared across all chart components)
    const colors = useChartColors();

    return (
        <PriceChartProvider {...props} darkMode={darkMode} colors={colors}>
            <PriceChartContent />
        </PriceChartProvider>
    );
};

export default PriceChart;