/**
 * @fileoverview 操作甘特圖元件 | Operation Schedule Gantt Chart
 *
 * 顯示電力市場操作排程的甘特圖，包含充電、放電、現貨交易等操作的時間軸。
 * Visualizes operation schedules including charging, discharging, and spot trading on a timeline.
 */
import React, { useMemo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { GanttOperation } from '@/types/revenueAnalysis';
import { addMinutes, format, parseISO } from 'date-fns';

export interface GanttRowData {
    id: string;
    name: string;
    data: GanttOperation[];
    color: string;
}

interface OperationGanttChartProps {
    rows: GanttRowData[];
    slotWidth: number;
    periodCount: number;
    startDate: string;
}

export const OperationGanttChart: React.FC<OperationGanttChartProps> = ({
    rows,
    slotWidth,
    periodCount,
    startDate,
}) => {
    // Basic implementation of a Gantt Chart for operations
    // This renders rows of timeline bars based on the provided data

    const totalWidth = periodCount * slotWidth;

    return (
        <Box sx={{ width: '100%', overflowX: 'auto', border: '1px solid rgba(128,128,128,0.2)' }}>
            <Box sx={{ minWidth: totalWidth, position: 'relative' }}>
                {/* Header (Time Axis could go here) */}
                <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
                    <Box sx={{ width: 150, flexShrink: 0, p: 1, borderRight: '1px solid rgba(128,128,128,0.2)' }}>
                        <Typography variant="caption" fontWeight="bold">Source</Typography>
                    </Box>
                    <Box sx={{ flex: 1, position: 'relative', height: 24 }}>
                        {/* Simple hour markers */}
                        {Array.from({ length: 24 }).map((_, i) => (
                            <Typography
                                key={i}
                                variant="caption"
                                sx={{
                                    position: 'absolute',
                                    left: (i * 2 + 1) * slotWidth, // Approx middle of hour
                                    transform: 'translateX(-50%)',
                                    color: 'text.secondary'
                                }}
                            >
                                {i}:00
                            </Typography>
                        ))}
                    </Box>
                </Box>

                {/* Rows */}
                {rows.map((row) => (
                    <Box key={row.id} sx={{ display: 'flex', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
                        <Box sx={{ width: 150, flexShrink: 0, p: 1, borderRight: '1px solid rgba(128,128,128,0.2)', display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: row.color, mr: 1 }} />
                            <Typography variant="body2" noWrap title={row.name}>{row.name}</Typography>
                        </Box>
                        <Box sx={{ flex: 1, position: 'relative', height: 40 }}>
                            {row.data.map((op, idx) => {
                                // op.timeStep is 0-based index from start of period
                                const left = op.timeStep * slotWidth;
                                const width = slotWidth;
                                return (
                                    <Tooltip
                                        key={`${op.timeStep}-${idx}`}
                                        title={
                                            <Box>
                                                <Typography variant="subtitle2">{row.name}</Typography>
                                                <Typography variant="caption">Time: {op.datetime}<br />Action: {op.action}<br />Price: {op.price}<br />Power: {op.power}</Typography>
                                            </Box>
                                        }
                                    >
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                left,
                                                width: width - 2, // gap
                                                top: 4,
                                                bottom: 4,
                                                bgcolor: row.color,
                                                opacity: 0.8,
                                                borderRadius: 1,
                                                cursor: 'pointer'
                                            }}
                                        />
                                    </Tooltip>
                                );
                            })}
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};
