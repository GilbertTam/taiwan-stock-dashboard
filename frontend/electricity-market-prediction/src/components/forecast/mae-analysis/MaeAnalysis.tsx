'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Alert } from '@mui/material';
import { ChartDataPoint } from '@/utils/chartUtils';
import { TimeSlot } from '@/types';
import { useMaeAnalysis } from '../hooks/useMaeAnalysis';
import { MaeChart } from './MaeChart';
import { MaeSummaryTable } from './MaeSummaryTable';

interface MaeAnalysisProps {
    chartData: ChartDataPoint[];
    selectedModels: {
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }[];
    /** 內嵌於模型效能頁時縮減留白、不重複標題 */
    embedded?: boolean;
    /** compact 模式：只顯示圖表 + 一行摘要，不顯示 summary table */
    compact?: boolean;
}

const MaeAnalysis: React.FC<MaeAnalysisProps> = ({ chartData, selectedModels, embedded = false, compact = false }) => {
    const { t } = useTranslation('forecast');
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>(TimeSlot.ALL);

    const {
        modelColorMap,
        modelTimeSlotMAEs,
        dailyMAEs,
    } = useMaeAnalysis({ chartData, selectedModels });

    // 檢查是否有資料
    const hasData = chartData.length > 0 && dailyMAEs.length > 0;
    const hasModels = selectedModels.length > 0;

    // compact 模式的最佳/最差 MAE 摘要 (must be before early returns to satisfy Rules of Hooks)
    const compactSummary = React.useMemo(() => {
        if (!compact || !hasModels) return null;
        let bestName = '';
        let bestMae = Infinity;
        let worstName = '';
        let worstMae = -Infinity;
        selectedModels.forEach((model) => {
            const modelKey = `${model.id}|${model.name}`;
            const mae = modelTimeSlotMAEs[modelKey]?.[TimeSlot.ALL];
            if (mae != null) {
                if (mae < bestMae) { bestMae = mae; bestName = model.name; }
                if (mae > worstMae) { worstMae = mae; worstName = model.name; }
            }
        });
        if (!bestName) return null;
        return { bestName, bestMae, worstName, worstMae };
    }, [compact, hasModels, selectedModels, modelTimeSlotMAEs]);

    // 如果沒有選擇模型，顯示提示
    if (!hasModels) {
        return (
            <Box sx={{ mt: 3 }}>
                <Alert severity="info">
                    {t('maeAnalysis.selectModel')}
                </Alert>
            </Box>
        );
    }

    // 如果沒有資料，顯示提示
    if (!hasData) {
        return (
            <Box sx={{ mt: 3 }}>
                <Alert severity="info">
                    {t('maeAnalysis.noData')}
                </Alert>
            </Box>
        );
    }

    return (
        <Box>
            <MaeChart
                dailyMAEs={dailyMAEs}
                selectedModels={selectedModels}
                modelColorMap={modelColorMap}
                selectedTimeSlot={selectedTimeSlot}
                onTimeSlotChange={setSelectedTimeSlot}
                embedded={embedded || compact}
            />

            {/* compact 模式：一行 best/worst 摘要 */}
            {compact && compactSummary && (
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', px: 0.5, py: 0.25, mt: 0.5 }}>
                    <Box component="span" sx={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                        {t('compactSummary.bestMae', { name: compactSummary.bestName, value: compactSummary.bestMae.toFixed(2) })}
                    </Box>
                    {compactSummary.worstName !== compactSummary.bestName && (
                        <Box component="span" sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {t('compactSummary.worstMae', { name: compactSummary.worstName, value: compactSummary.worstMae.toFixed(2) })}
                        </Box>
                    )}
                </Box>
            )}

            {/* full 模式：完整 summary table */}
            {!compact && (
                <MaeSummaryTable
                    selectedModels={selectedModels}
                    modelTimeSlotMAEs={modelTimeSlotMAEs}
                    modelColorMap={modelColorMap}
                />
            )}
        </Box>
    );
};

export default MaeAnalysis;
