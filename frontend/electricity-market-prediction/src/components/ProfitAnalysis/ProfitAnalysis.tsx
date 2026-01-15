'use client';

import React from 'react';
import { Box, Alert, Grid } from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import { ChartDataPoint } from '@/utils/chartUtils';
import { useProfitAnalysis } from './hooks/useProfitAnalysis';
import { ProfitChart } from './ProfitChart';
import { ProfitControls } from './ProfitControls';
import { ProfitSummaryTable } from './ProfitSummaryTable';

interface ProfitAnalysisProps {
    chartData: ChartDataPoint[];
    selectedModels: {
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }[];
    topBottomPairs: number;
    setTopBottomPairs: (value: number) => void;
}

const ProfitAnalysis: React.FC<ProfitAnalysisProps> = ({
    chartData,
    selectedModels,
    topBottomPairs,
    setTopBottomPairs
}) => {
    const { darkMode } = useTheme();

    const {
        colors,
        modelColorMap,
        dailyProfits,
        combinedData,
        totalProfits
    } = useProfitAnalysis({ chartData, selectedModels, topBottomPairs });

    // 檢查是否有資料（支援沒有選擇模型時也能顯示 actualProfit）
    const hasData = chartData.length > 0 && dailyProfits.length > 0;
    const hasModels = selectedModels.length > 0;

    // 如果沒有資料，顯示提示
    if (!hasData) {
        return (
            <Box sx={{ mt: 3 }}>
                <Alert severity="info">
                    該時段無收益分析資料 (No profit analysis data available for this period)
                </Alert>
            </Box>
        );
    }

    // 如果沒有選擇模型，但仍然有資料（actualProfit），顯示提示但繼續顯示圖表
    const showModelWarning = !hasModels && hasData;

    return (
        <Box sx={{ mt: 3 }}>
            {showModelWarning && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    請選擇模型以進行模型收益比較分析 (Please select models to compare profit analysis)
                </Alert>
            )}

            <ProfitControls
                topBottomPairs={topBottomPairs}
                setTopBottomPairs={setTopBottomPairs}
                colors={colors}
            />

            <Grid container spacing={4}>
                <Grid item xs={12}>
                    <ProfitChart
                        combinedData={combinedData}
                        selectedModels={selectedModels}
                        modelColorMap={modelColorMap}
                        colors={colors}
                        darkMode={darkMode}
                    />
                </Grid>

                <Grid item xs={12}>
                    <ProfitSummaryTable
                        totalProfits={totalProfits}
                        selectedModels={selectedModels}
                        modelColorMap={modelColorMap}
                        colors={colors}
                        darkMode={darkMode}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

export default ProfitAnalysis;
