import React from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import { RevenueSummaryChart } from './RevenueSummaryChart';
import { RevenueEmptyState } from './RevenueEmptyState';
import { OptimizationResult, GanttChartData } from '@/types/revenueAnalysis';
import { useTheme } from '@/app/ThemeProvider';
import { useTranslation } from 'react-i18next';

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
    batteryECap?: number;
    cycleLimit?: number;
    isSimulating: boolean;
    isDataLoading?: boolean;
    isInitializing?: boolean;
    onRunSimulation: () => void;
    manualResult?: { optimization: OptimizationResult; realizedRevenue: number } | null;
    priceBasis?: string;
    onPriceBasisChange?: (basis: string) => void;
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
    batteryECap,
    cycleLimit,
    isSimulating,
    isDataLoading = false,
    isInitializing = false,
    onRunSimulation,
    manualResult,
    priceBasis,
    onPriceBasisChange,
}) => {
    const { darkMode } = useTheme();
    const { t } = useTranslation('siteRevenue');

    if (!ganttData) {
        if (isSimulating || isDataLoading || isInitializing) {
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
                        {isDataLoading && !isSimulating ? t('container.loadingMarketData') : isInitializing && !isSimulating ? t('container.preparingSimulation') : t('container.calculatingRevenue')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('container.simulationParamsNote')}
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
                batteryECap={batteryECap}
                cycleLimit={cycleLimit}
                manualResult={manualResult}
                priceBasis={priceBasis}
                onPriceBasisChange={onPriceBasisChange}
            />
        </Paper>
    );
};
