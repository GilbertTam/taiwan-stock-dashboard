/**
 * @fileoverview 營收分析甘特圖容器 | Revenue Analysis Gantt Chart Container
 *
 * 整合操作排程圖表與 SoC 折線圖，X 軸與 Price 圖連動。
 */
'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { GanttChartData } from '@/types/revenueAnalysis';
import { OperationScheduleChart } from './OperationScheduleChart';
import { SocLineChart } from './SocLineChart';

interface RevenueGanttChartProps {
    data: GanttChartData;
    selectedModels: { id: string | number; name: string; color: string }[];
    timeCategories: string[];
    colors?: { actual?: string };
    height?: number;
    opChartRef?: React.RefObject<{ getInstance: () => any } | null>;
    socChartRef?: React.RefObject<{ getInstance: () => any } | null>;
}

export const RevenueGanttChart: React.FC<RevenueGanttChartProps> = ({
    data,
    selectedModels,
    timeCategories,
    colors = {},
    height = 400,
    opChartRef,
    socChartRef
}) => {
    return (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <OperationScheduleChart
                ref={opChartRef}
                data={data}
                selectedModels={selectedModels}
                timeCategories={timeCategories}
                height={260}
                groupId="revenue-time-group"
            />

            <Box>
                <Typography variant="subtitle2" fontWeight="600" gutterBottom>Battery State of Charge</Typography>
                <SocLineChart
                    ref={socChartRef}
                    data={data}
                    selectedModels={selectedModels}
                    timeCategories={timeCategories}
                    colors={colors}
                    height={220}
                    groupId="revenue-time-group"
                />
            </Box>
        </Box>
    );
};
