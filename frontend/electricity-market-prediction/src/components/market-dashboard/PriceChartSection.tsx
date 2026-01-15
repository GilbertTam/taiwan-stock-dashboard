import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { PriceChart } from '@/components/price-chart';
import WeatherChartSection from '@/components/WeatherChartSection';
import MarketInfoPanel from '@/components/MarketInfoPanel';
import { ChartDataPoint } from '@/utils/chartUtils';

interface PriceChartSectionProps {
    chartData: ChartDataPoint[];
    weatherChartData: any[];
    weatherActual: any[];
    weatherForecast: any[];
    imbalanceData: any[];
    intradayData: any[];
    interconnectionData: any[];
    occtoAreaData: any[];
    selectedModels: any[];
    startDate: Date | null;
    endDate: Date | null;
    selectedArea: string;
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
    startDate,
    endDate,
    selectedArea
}) => {
    return (
        <Box sx={{ mt: 3 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                    Price Prediction Comparison
                </Typography>
                <PriceChart
                    chartData={chartData}
                    areaName={selectedArea}
                    selectedModels={selectedModels}
                    imbalanceData={imbalanceData}
                    intradayData={intradayData}
                    interconnectionData={interconnectionData}
                    occtoAreaData={occtoAreaData}
                />
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
