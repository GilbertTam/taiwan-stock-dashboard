import React, { useState } from 'react';
import { Box, Typography, CircularProgress, Tabs, Tab, Divider } from '@mui/material';
import { PriceChart } from '@/components/price-chart';
import WeatherChartSection from '@/components/WeatherChartSection';
import MarketInfoPanel from '@/components/MarketInfoPanel';
import { ChartDataPoint } from '@/utils/chartUtils';
import { PredictionModel, CalculatingDate } from '@/types';
import Card from '@/components/common/Card';

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
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Card sx={{ p: 3, mb: 3, position: 'relative' }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                    Price Prediction Comparison
                </Typography>

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
            </Card>

            {/* Sub-panels: Z-Score (inside PriceChart), Weather, Market Info */}
            <Card sx={{ p: 0, mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            minHeight: 40,
                        },
                    }}
                >
                    <Tab label="Z-Score / 模型偏差" />
                    <Tab label="天氣趨勢" />
                    <Tab label="市場資訊摘要" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {tabValue === 0 && (
                        <Typography variant="body2" color="text.secondary">
                            Z-Score 圖已顯示在主圖下方，可用來快速比較實際價格與各模型預測的標準化偏差。
                        </Typography>
                    )}

                    {tabValue === 1 && (
                        <WeatherChartSection
                            weatherActual={weatherActual}
                            weatherForecast={weatherForecast}
                            weatherChartData={weatherChartData}
                        />
                    )}

                    {tabValue === 2 && (
                        <MarketInfoPanel
                            startDate={startDate}
                            endDate={endDate}
                            selectedArea={selectedArea}
                        />
                    )}
                </Box>
            </Card>
        </Box>
    );
};

export default PriceChartSection;
