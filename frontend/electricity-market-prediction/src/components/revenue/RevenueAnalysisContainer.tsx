import React from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import { RevenueSummaryChart } from './RevenueSummaryChart';
import { RevenueEmptyState } from './RevenueEmptyState';
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
    isSimulating: boolean;
    onRunSimulation: () => void;
}

/** 
 * 案場收益主內容容器 | Site revenue analysis main container
 */
export const RevenueAnalysisContainer: React.FC<RevenueAnalysisContainerProps> = ({
    actualResult,
    modelResults,
    ganttData,
    selectedModels,
    colors,
    dt,
    isSimulating,
    onRunSimulation
}) => {
    const { darkMode } = useTheme();

    if (!ganttData) {
        if (isSimulating) {
            return (
                <Paper
                    elevation={0}
                    sx={{
                        p: 4,
                        flex: 1,
                        backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'white',
                        border: '1px solid',
                        borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        borderRadius: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%'
                    }}
                >
                    <CircularProgress size={48} sx={{ mb: 3 }} />
                    <Typography variant="h6" color="text.primary" gutterBottom>
                        正在計算收益模擬... (Calculating revenue simulation...)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        依據您設定的參數，這可能需要幾秒鐘的時間。
                    </Typography>
                </Paper>
            );
        }

        return <RevenueEmptyState onRunSimulation={onRunSimulation} />;
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
