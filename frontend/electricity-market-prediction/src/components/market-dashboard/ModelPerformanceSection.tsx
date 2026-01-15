import React from 'react';
import { Box, Paper, Typography, Divider } from '@mui/material';
import MaeAnalysis from '@/components/MaeAnalysis/MaeAnalysis';
import ProfitAnalysis from '@/components/ProfitAnalysis/ProfitAnalysis';
import { ChartDataPoint } from '@/utils/chartUtils';

interface ModelPerformanceSectionProps {
    chartData: ChartDataPoint[];
    selectedModels: any[];
    topBottomPairs: number;
    setTopBottomPairs: (value: number) => void;
}

const ModelPerformanceSection: React.FC<ModelPerformanceSectionProps> = ({
    chartData,
    selectedModels,
    topBottomPairs,
    setTopBottomPairs
}) => {
    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="h5" component="h2" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                Model Performance Analysis
            </Typography>

            <Paper sx={{ p: 3, mb: 4 }}>
                <ProfitAnalysis
                    chartData={chartData}
                    selectedModels={selectedModels}
                    topBottomPairs={topBottomPairs}
                    setTopBottomPairs={setTopBottomPairs}
                />
            </Paper>

            <Paper sx={{ p: 3 }}>
                <MaeAnalysis
                    chartData={chartData}
                    selectedModels={selectedModels}
                />
            </Paper>
        </Box>
    );
};

export default ModelPerformanceSection;
