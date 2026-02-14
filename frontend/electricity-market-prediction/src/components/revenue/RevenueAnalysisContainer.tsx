import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { RevenueSummaryChart } from './RevenueSummaryChart';
import { OptimizationResult, GanttChartData } from '@/types/revenueAnalysis';
import { useTheme } from '@/app/ThemeProvider';

interface RevenueAnalysisContainerProps {
    actualResult: OptimizationResult | null;
    modelResults: Record<string, { optimization: OptimizationResult; realizedRevenue: number }>;
    ganttData: GanttChartData | null;
    selectedModels: Array<{
        id: string | number;
        name: string;
        color: string;
    }>;
    colors: any;
    dt: number;
}

export const RevenueAnalysisContainer: React.FC<RevenueAnalysisContainerProps> = ({
    actualResult,
    modelResults,
    ganttData,
    selectedModels,
    colors,
    dt
}) => {
    const { darkMode } = useTheme();

    if (!ganttData) {
        return (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', height: '100%' }}>
                <Typography>Click "Run Simulation" in the sidebar to see revenue analysis</Typography>
            </Box>
        );
    }

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                flex: 1,
                backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'white',
                border: '1px solid',
                borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                height: '100%'
            }}
        >
            <RevenueSummaryChart
                actualResult={actualResult}
                modelResults={modelResults}
                ganttData={ganttData}
                selectedModels={selectedModels}
                colors={colors}
                dt={dt}
            />
        </Paper>
    );
};
