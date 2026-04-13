'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Alert, Grid } from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import { ChartDataPoint } from '@/utils/chartUtils';
import { useProfitAnalysis } from '../hooks/useProfitAnalysis';
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
    /** 內嵌於模型效能頁時縮減留白、不重複標題 */
    embedded?: boolean;
    /** 隱藏 Top & Bottom Pairs 控制（改由右側 sidebar 顯示） */
    hideControls?: boolean;
}

const ProfitAnalysis: React.FC<ProfitAnalysisProps> = ({
    chartData,
    selectedModels,
    topBottomPairs,
    setTopBottomPairs,
    embedded = false,
    hideControls = false,
}) => {
    const { t } = useTranslation('forecast');
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
                    {t('emptyState.noProfitData')}
                </Alert>
            </Box>
        );
    }

    // 如果沒有選擇模型，但仍然有資料（actualProfit），顯示提示但繼續顯示圖表
    const showModelWarning = !hasModels && hasData;

    return (
        <Box sx={{ mt: embedded ? 0 : 3 }}>
            {showModelWarning && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    {t('emptyState.selectModelForProfit')}
                </Alert>
            )}

            {!hideControls && (
                <ProfitControls
                    topBottomPairs={topBottomPairs}
                    setTopBottomPairs={setTopBottomPairs}
                    colors={colors}
                />
            )}

            <Grid container spacing={embedded ? 1.5 : 4}>
                <Grid item xs={12}>
                    <ProfitChart
                        embedded={embedded}
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
