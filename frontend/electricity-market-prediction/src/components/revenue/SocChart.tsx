/**
 * @fileoverview 電池狀態 (SoC) 圖表 | State of Charge (SoC) Chart
 *
 * 顯示電池儲能狀態隨時間變化的折線圖，輔助分析操作策略。
 * Visualizes battery State of Charge (SoC) over time to assist strategy analysis.
 */
'use client';

import React, { useMemo } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import { GanttRowData } from './OperationGanttChart';
import { format } from 'date-fns';

interface SocChartProps {
    rows: GanttRowData[];
    periodCount?: number;
    slotWidth?: number;
    chartHeight?: number;
    headerHeight?: number;
    leftPanelWidth?: number;
    startDate?: string | Date; // Added prop
}

export const SocChart: React.FC<SocChartProps> = ({
    rows,
    periodCount = 48,
    slotWidth = 20,
    chartHeight = 150,
    headerHeight = 30,
    leftPanelWidth = 140,
    startDate
}) => {
    const { darkMode } = useTheme();

    const maxSlots = useMemo(() => {
        if (rows.length === 0) return periodCount;
        const maxLen = Math.max(...rows.map(r => r.data.length));
        return Math.max(maxLen, periodCount);
    }, [rows, periodCount]);

    const chartWidth = maxSlots * slotWidth;

    const colors = {
        border: darkMode ? '#333333' : '#e0e0e0',
        text: darkMode ? '#e0e0e0' : '#333333',
        textSecondary: darkMode ? '#aaaaaa' : '#666666',
        grid: darkMode ? '#333333' : '#f0f0f0',
        socMin: '#ff4d4f',
        socMax: '#ff4d4f',
    };

    // Helper to generate path for a row
    const getSocPath = (data: any[]) => {
        if (!data || data.length === 0) return '';
        const points = data.map((op, idx) => {
            const x = idx * slotWidth + (slotWidth / 2);
            // Invert Y: 100% -> 0, 0% -> height
            const y = chartHeight - (op.soc * chartHeight);
            return `${x},${y}`;
        });
        return `M ${points.join(' L ')}`;
    };

    // Helper to get time label
    const getTimeLabel = (idx: number) => {
        if (!startDate) return `${(idx % 48) + 1}`;
        try {
            const d = new Date(startDate);
            if (isNaN(d.getTime())) return `${(idx % 48) + 1}`;
            d.setMinutes(d.getMinutes() + (idx * 30));
            return format(d, 'HH:mm');
        } catch (e) {
            return `${(idx % 48) + 1}`;
        }
    };

    return (
        <Box sx={{ display: 'flex', overflow: 'hidden', border: `1px solid ${colors.border}`, borderRadius: 1, mt: 1 }}>
            {/* Left Panel: Y Axis Labels */}
            <Box sx={{
                width: leftPanelWidth,
                flexShrink: 0,
                borderRight: `1px solid ${colors.border}`,
                bgcolor: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                p: 1
            }}>
                <Typography variant="subtitle2">SoC (%)</Typography>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', py: 2 }}>
                    <Typography variant="caption">100%</Typography>
                    <Typography variant="caption">50%</Typography>
                    <Typography variant="caption">0%</Typography>
                </Box>
            </Box>

            {/* Scrollable Chart Area */}
            <Box sx={{ flex: 1, overflowX: 'auto', position: 'relative' }}>
                <Box sx={{ width: chartWidth, minWidth: '100%' }}>
                    <svg width={chartWidth} height={chartHeight + headerHeight}>
                        {/* Grid Lines */}
                        <line x1={0} y1={0} x2={chartWidth} y2={0} stroke={colors.grid} />
                        <line x1={0} y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke={colors.grid} strokeDasharray="4 4" />
                        <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke={colors.grid} />

                        {/* SoC Lines */}
                        {rows.map((row) => (
                            <path
                                key={row.id}
                                d={getSocPath(row.data)}
                                fill="none"
                                stroke={row.color}
                                strokeWidth={2}
                                opacity={0.8}
                            />
                        ))}

                        {/* Hover Overlay area for tooltips */}
                        {Array.from({ length: maxSlots }).map((_, idx) => {
                            const isMajorHour = idx % 6 === 0;
                            return (
                                <g key={idx}>
                                    <Tooltip
                                        title={
                                            <Box sx={{ p: 0.5 }}>
                                                <Typography variant="subtitle2">Time: {getTimeLabel(idx)}</Typography>
                                                {rows.map(row => {
                                                    const val = row.data[idx]?.soc;
                                                    return val !== undefined ? (
                                                        <Box key={row.id} display="flex" gap={1}>
                                                            <Box width={10} height={10} bgcolor={row.color} />
                                                            <Typography variant="caption">{row.name}: {(val * 100).toFixed(1)}%</Typography>
                                                        </Box>
                                                    ) : null;
                                                })}
                                            </Box>
                                        }
                                        arrow
                                    >
                                        <rect
                                            x={idx * slotWidth}
                                            y={0}
                                            width={slotWidth}
                                            height={chartHeight}
                                            fill="transparent"
                                        />
                                    </Tooltip>

                                    {/* Axis Labels */}
                                    {isMajorHour && (
                                        <text
                                            x={idx * slotWidth}
                                            y={chartHeight + 15}
                                            fontSize="10"
                                            fill={colors.textSecondary}
                                        >
                                            {getTimeLabel(idx)}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </Box>
            </Box>
        </Box>
    );
};
