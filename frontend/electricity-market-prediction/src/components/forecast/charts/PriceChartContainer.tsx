'use client';

import React from 'react';
import { Box } from '@mui/material';
import { ChartToolbar } from './ChartToolbar';
import { ChartLightweight } from '@/components/price-chart/ChartLightweight';

import { usePriceChart } from '@/components/price-chart/context/PriceChartContext';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { useChartColors } from '@/utils/chart-colors';

interface PriceChartContainerProps {
    areaName?: string;
}

export const PriceChartContainer: React.FC<PriceChartContainerProps> = ({
    areaName
}) => {
    const colors = useChartColors();

    // Context Data
    const {
        selectedModels,
        showImbalance,
        showIntraday,
        showInterconnection,
    } = useMarketDataContext();

    const {
        hoveredData,
        modelColorMap,
        showOcctoArea,
        showWeather,
        showWeatherActual,
        showWeatherForecast,
        selectedOcctoFields,
        selectedWeatherFields,
        selectedWeatherFieldsActual,
        selectedWeatherFieldsForecast,
    } = usePriceChart();

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 0,
        }}>
            {/* Chart Container - Takes remaining space */}
            <Box sx={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                minHeight: 0,
            }}
            >
                {/* Main Chart - Using Lightweight Charts */}
                <ChartLightweight />
            </Box>
        </Box>
    );
};
