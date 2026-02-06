'use client';

import React from 'react';
import { Box } from '@mui/material';
import { ChartToolbar } from './ChartToolbar';
import { PriceChartLightweight } from '@/components/price-chart/PriceChartLightweight';
import { ChartInfoPanel } from '@/components/price-chart/ChartInfoPanel';
import { usePriceChart } from '@/components/price-chart/context/PriceChartContext';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { useChartColors } from '@/utils/chartColors';

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
            {/* Info Panel - Fixed at top */}
            <Box sx={{ 
                flexShrink: 0,
                backgroundColor: 'var(--card-bg)',
                borderBottom: '1px solid var(--card-border)',
                position: 'relative',
                zIndex: 10,
            }}>
                <ChartInfoPanel
                    hoveredData={hoveredData}
                    selectedModels={selectedModels}
                    modelColorMap={modelColorMap}
                    colors={colors}
                    areaName={areaName || 'Tokyo'}
                    showImbalance={showImbalance}
                    showIntraday={showIntraday}
                    showInterconnection={showInterconnection}
                    showOcctoArea={showOcctoArea}
                    showWeather={showWeather}
                    showWeatherActual={showWeatherActual}
                    showWeatherForecast={showWeatherForecast}
                    selectedOcctoFields={selectedOcctoFields}
                    selectedWeatherFields={selectedWeatherFields}
                    selectedWeatherFieldsActual={selectedWeatherFieldsActual}
                    selectedWeatherFieldsForecast={selectedWeatherFieldsForecast}
                />
            </Box>

            {/* Chart Container - Takes remaining space */}
            <Box sx={{ 
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                minHeight: 0,
            }}
            onMouseDown={(e) => {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/e4915982-d3b9-498e-9d28-1526983920b7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PriceChartContainer.tsx:82',message:'Mouse down on chart container wrapper',data:{clientX:e.clientX,clientY:e.clientY,targetTag:(e.target as HTMLElement)?.tagName,zIndex:(e.target as HTMLElement)?.style?.zIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
            }}
            >
                {/* Chart Toolbar (Overlay) */}
                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 20, pointerEvents: 'none' }}>
                    <Box sx={{ pointerEvents: 'auto' }}>
                        <ChartToolbar
                            onZoomIn={() => { /* Implement zoom logic in PriceChartLightweight via ref if possible */ }}
                            onZoomOut={() => { }}
                            onDownload={() => { }}
                        />
                    </Box>
                </Box>

                {/* Main Chart - Using Lightweight Charts */}
                <PriceChartLightweight />
            </Box>
        </Box>
    );
};
