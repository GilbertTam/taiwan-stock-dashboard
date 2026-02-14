/**
 * @fileoverview 營收分析甘特圖容器 | Revenue Analysis Gantt Chart Container
 *
 * 整合操作排程甘特圖與 SoC 變化圖，提供互動式的營收與操作策略分析視圖。
 * Integrates Operation Gantt Chart and SoC Chart for interactive revenue and strategy analysis.
 */
'use client';

import React, { useMemo, useState } from 'react';
import { Box, Typography, Button, ButtonGroup } from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import { format } from 'date-fns';
import { GanttChartData, ViewOptions, DEFAULT_VIEW_OPTIONS } from '@/types/revenueAnalysis';
import { ChargeDischargeChart } from './ChargeDischargeChart';
import { GanttRowData } from './OperationGanttChart';
import { SocChart } from './SocChart';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

interface RevenueGanttChartProps {
    data: GanttChartData;
    height?: number;
    viewOptions?: ViewOptions; // Optional to avoid breaking other usages if any
}

export const RevenueGanttChart: React.FC<RevenueGanttChartProps> = ({
    data,
    height = 400,
    viewOptions = DEFAULT_VIEW_OPTIONS
}) => {
    const { darkMode } = useTheme();
    const [slotWidth, setSlotWidth] = useState(20);

    const handleZoomIn = () => setSlotWidth(prev => Math.min(prev + 5, 100));
    const handleZoomOut = () => setSlotWidth(prev => Math.max(prev - 5, 10));

    // Transform data for charts
    const rows = useMemo(() => {
        const result: GanttRowData[] = [];
        // We can use viewOptions here if we want to filter rows, but for now we just show/hide the whole chart

        // Optimal
        if (data.optimal && data.optimal.length > 0) {
            result.push({
                id: 'optimal',
                name: 'Optimal Plan',
                data: data.optimal,
                color: '#4caf50'
            });
        }

        // Models
        Object.entries(data.models).forEach(([name, ops], idx) => {
            const color = ['#2196f3', '#9c27b0', '#ff9800'][idx % 3];
            result.push({
                id: name,
                name: `Predicted: ${name}`,
                data: ops,
                color: color
            });
        });

        return result;
    }, [data]);

    return (
        <Box sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 2
        }}>
            {/* Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* Date Range Display */}
                <Typography variant="subtitle2" color="text.secondary">
                    Date Range: {(() => {
                        try {
                            const start = new Date(data.dateRange.start);
                            const end = new Date(data.dateRange.end);
                            if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid Date Range';
                            return `${format(start, 'yyyy-MM-dd')} - ${format(end, 'yyyy-MM-dd')}`;
                        } catch (e) {
                            return 'Invalid Date Range';
                        }
                    })()}
                </Typography>
                {/* Zoom Controls */}
                <ButtonGroup size="small" variant="outlined">
                    <Button onClick={handleZoomOut}><ZoomOutIcon fontSize="small" /></Button>
                    <Button onClick={handleZoomIn}><ZoomInIcon fontSize="small" /></Button>
                </ButtonGroup>
            </Box>

            {/* Operation Chart */}
            {viewOptions.showOperation && (
                <Box>
                    <ChargeDischargeChart
                        rows={rows}
                        slotWidth={slotWidth}
                        periodCount={48}
                        startDate={data.dateRange.start}
                    />
                </Box>
            )}

            {/* SoC Chart */}
            {viewOptions.showSoC && (
                <Box>
                    <Typography variant="subtitle2" gutterBottom>State of Charge</Typography>
                    <SocChart
                        rows={rows}
                        slotWidth={slotWidth}
                        periodCount={48}
                        chartHeight={120}
                        startDate={data.dateRange.start}
                    />
                </Box>
            )}
        </Box>
    );
};
