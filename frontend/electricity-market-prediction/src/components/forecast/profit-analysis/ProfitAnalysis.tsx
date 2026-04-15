'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Alert, Grid, Typography } from '@mui/material';
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
    /** compact 模式：只顯示圖表 + 一行摘要，不顯示 controls 和 summary table */
    compact?: boolean;
}

const ProfitAnalysis: React.FC<ProfitAnalysisProps> = ({
    chartData,
    selectedModels,
    topBottomPairs,
    setTopBottomPairs,
    embedded = false,
    hideControls = false,
    compact = false,
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

    // 如果沒有選擇模型，但仍然有資料（actualProfit），顯示提示但繼續顯示圖表
    const showModelWarning = !hasModels && hasData;

    // compact 模式下的一行摘要 (must be before early returns to satisfy Rules of Hooks)
    const compactSummary = React.useMemo(() => {
        if (!compact || !totalProfits || !hasModels) return null;
        const optimal = totalProfits?.cumulativeActual ?? 0;
        let bestName = '';
        let bestValue = -Infinity;
        selectedModels.forEach((model) => {
            const modelKey = `${model.id}|${model.name}`;
            const v = totalProfits?.[`${modelKey}_cumulative`];
            if (typeof v === 'number' && v > bestValue) {
                bestValue = v;
                bestName = model.name;
            }
        });
        const percent = optimal > 0 ? ((bestValue / optimal) * 100).toFixed(1) : '–';
        return { optimal, bestName, bestValue, percent };
    }, [compact, totalProfits, selectedModels, hasModels]);

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

    return (
        <Box sx={{ mt: embedded || compact ? 0 : 3 }}>
            {showModelWarning && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    {t('emptyState.selectModelForProfit')}
                </Alert>
            )}

            {!hideControls && !compact && (
                <ProfitControls
                    topBottomPairs={topBottomPairs}
                    setTopBottomPairs={setTopBottomPairs}
                    colors={colors}
                />
            )}

            {/* 方法說明 */}
            {embedded && (
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 0.5 }}>
                    {t('profitAnalysis.subtitle')}
                </Typography>
            )}

            <Grid container spacing={compact ? 0.5 : embedded ? 1.5 : 4}>
                <Grid item xs={12}>
                    <ProfitChart
                        embedded={embedded || compact}
                        combinedData={combinedData}
                        selectedModels={selectedModels}
                        modelColorMap={modelColorMap}
                        colors={colors}
                        darkMode={darkMode}
                    />
                </Grid>

                {/* compact 模式：一行 inline 摘要 */}
                {compact && compactSummary && (
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', px: 0.5, py: 0.25 }}>
                            <Box component="span" sx={{ fontSize: '0.75rem', color: colors.actual, fontWeight: 700 }}>
                                {t('compactSummary.optimalSpread', { value: compactSummary.optimal.toLocaleString(undefined, { maximumFractionDigits: 0 }) })}
                            </Box>
                            {compactSummary.bestName && (
                                <Box component="span" sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {t('compactSummary.bestModel', {
                                        name: compactSummary.bestName,
                                        value: compactSummary.bestValue.toLocaleString(undefined, { maximumFractionDigits: 0 }),
                                        percent: compactSummary.percent,
                                    })}
                                </Box>
                            )}
                        </Box>
                    </Grid>
                )}

                {/* full 模式：完整 summary table */}
                {!compact && (
                    <Grid item xs={12}>
                        <ProfitSummaryTable
                            totalProfits={totalProfits}
                            selectedModels={selectedModels}
                            modelColorMap={modelColorMap}
                            colors={colors}
                            darkMode={darkMode}
                        />
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default ProfitAnalysis;
