import React from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { PriceChart } from '@/components/price-chart';
import { ModelSelector } from '@/components/price-chart/ModelSelector';
import WeatherChartSection from '@/components/WeatherChartSection';
import MarketInfoPanel from '@/components/MarketInfoPanel';
import { ChartDataPoint } from '@/utils/chartUtils';
import { PredictionModel, CalculatingDate } from '@/types';

interface PriceChartSectionProps {
    chartData: ChartDataPoint[];
    weatherChartData: any[];
    weatherActual: any[];
    weatherForecast: any[];
    imbalanceData: any[];
    intradayData: any[];
    interconnectionData: any[];
    occtoAreaData: any[];
    selectedModels: Array<{
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }>;
    availableModels: PredictionModel[];
    calculatingDatesByModel: { [key: string]: CalculatingDate[] };
    startDate: Date | null;
    endDate: Date | null;
    selectedArea: string;
    isFetchingPredictions?: boolean;
    onModelToggle: (modelId: string | number, modelName: string) => void;
    onModelCalculatingDateChange: (modelIndex: number, newDate: string) => void;
}

const PriceChartSection: React.FC<PriceChartSectionProps> = ({
    chartData,
    weatherChartData,
    weatherActual,
    weatherForecast,
    imbalanceData,
    intradayData,
    interconnectionData,
    occtoAreaData,
    selectedModels,
    availableModels,
    calculatingDatesByModel,
    startDate,
    endDate,
    selectedArea,
    isFetchingPredictions = false,
    onModelToggle,
    onModelCalculatingDateChange,
}) => {
    return (
        <Box sx={{ mt: 3 }}>
            <Paper sx={{ p: 3, mb: 3, position: 'relative' }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                    Price Prediction Comparison
                </Typography>
                
                {/* Model Selector - Above Chart */}
                <ModelSelector
                    models={selectedModels}
                    availableModels={availableModels}
                    calculatingDatesByModel={calculatingDatesByModel}
                    maxSelection={5}
                    onModelToggle={onModelToggle}
                    onCalculatingDateChange={onModelCalculatingDateChange}
                />

                <Box sx={{ position: 'relative' }}>
                    <PriceChart
                        chartData={chartData}
                        areaName={selectedArea}
                        selectedModels={selectedModels}
                        imbalanceData={imbalanceData}
                        intradayData={intradayData}
                        interconnectionData={interconnectionData}
                        occtoAreaData={occtoAreaData}
                    />
                    {/* Loading Overlay */}
                    {isFetchingPredictions && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1000,
                                borderRadius: 1
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 2
                                }}
                            >
                                <CircularProgress size={40} />
                                <Typography variant="body2" sx={{ color: 'white' }}>
                                    Loading predictions...
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Paper>

            <MarketInfoPanel
                startDate={startDate}
                endDate={endDate}
                selectedArea={selectedArea}
            />

            <WeatherChartSection
                weatherActual={weatherActual}
                weatherForecast={weatherForecast}
                weatherChartData={weatherChartData}
            />
        </Box>
    );
};

export default PriceChartSection;
