'use client';

import React, { useState } from 'react';
import { Box, Alert } from '@mui/material';
import { ChartDataPoint } from '@/utils/chartUtils';
import { TimeSlot } from '@/types';
import { useMaeAnalysis } from './hooks/useMaeAnalysis';
import { MaeChartLightweight } from './MaeChartLightweight';
import { MaeSummaryTable } from './MaeSummaryTable';

interface MaeAnalysisProps {
    chartData: ChartDataPoint[];
    selectedModels: {
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }[];
}

const MaeAnalysis: React.FC<MaeAnalysisProps> = ({ chartData, selectedModels }) => {
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
                    請選擇模型以進行MAE分析 (Please select models to perform MAE analysis)
                </Alert>
            </Box>
        );
    }

    // 如果沒有資料，顯示提示
    if (!hasData) {
        return (
            <Box sx={{ mt: 3 }}>
                <Alert severity="info">
                    該時段無MAE分析資料 (No MAE analysis data available for this period)
                </Alert>
            </Box>
        );
    }

    return (
        <Box>
            <MaeChartLightweight
                dailyMAEs={dailyMAEs}
                selectedModels={selectedModels}
                modelColorMap={modelColorMap}
                selectedTimeSlot={selectedTimeSlot}
                onTimeSlotChange={setSelectedTimeSlot}
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
