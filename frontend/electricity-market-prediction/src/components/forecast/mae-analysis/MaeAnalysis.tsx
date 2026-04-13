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
}

const MaeAnalysis: React.FC<MaeAnalysisProps> = ({ chartData, selectedModels, embedded = false }) => {
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
                embedded={embedded}
            />

            <MaeSummaryTable
                selectedModels={selectedModels}
                modelTimeSlotMAEs={modelTimeSlotMAEs}
                modelColorMap={modelColorMap}
            />
        </Box>
    );
};

export default MaeAnalysis;
