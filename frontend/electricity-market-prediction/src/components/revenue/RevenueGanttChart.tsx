/**
 * @fileoverview 營收分析甘特圖容器 | Revenue Analysis Gantt Chart Container
 *
 * 整合操作排程圖表與 SoC 折線圖，X 軸與 Price 圖連動。
 */
'use client';

import React from 'react';
import { Box } from '@mui/material';
import { GanttChartData } from '@/types/revenueAnalysis';
import { OperationScheduleChart } from './OperationScheduleChart';

interface RevenueGanttChartProps {
    data: GanttChartData;
    selectedModels: { id: string | number; name: string; color: string }[];
    timeCategories: string[];
    colors?: { actual?: string };
    height?: number;
    opChartRef?: React.RefObject<{ getInstance: () => any } | null>;
}

export const RevenueGanttChart: React.FC<RevenueGanttChartProps> = ({
    data,
    selectedModels,
    timeCategories,
    opChartRef,
}) => {
    return (
        <Box sx={{ width: '100%', height: '100%' }}>
            <OperationScheduleChart
                ref={opChartRef}
                data={data}
                selectedModels={selectedModels}
                timeCategories={timeCategories}
                height={260}
                groupId="revenue-time-group"
            />
        </Box>
    );
};
