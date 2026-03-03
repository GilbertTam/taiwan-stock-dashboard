/**
 * @fileoverview 充放電排程圖表 | Charge/Discharge Schedule Chart
 *
 * 以時間軸方式顯示各模型的充放電操作（Charge/Discharge/Spot/Balance/Idle）。
 * Visualizes charge/discharge operations on a timeline for multiple models.
 */
'use client';

import React, { useMemo } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import { GanttRowData } from './OperationGanttChart';
import { format } from 'date-fns';

interface ChargeDischargeChartProps {
    rows: GanttRowData[];
    periodCount?: number;
    slotWidth?: number;
    rowHeight?: number;
    headerHeight?: number;
    leftPanelWidth?: number;
    startDate?: string | Date;
}

export const ChargeDischargeChart: React.FC<ChargeDischargeChartProps> = ({
    rows,
    periodCount = 48,
    slotWidth = 20,
    rowHeight = 40,
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
        bg: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    };

    const getActionColor = (action: string | null) => {
        switch (action) {
            case 'Charge': return '#4caf50'; // Green
            case 'Spot': return '#f44336';   // Red
            case 'Balance': return '#ff9800'; // Orange
            default: return 'transparent';
        }
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
        <Box sx={{ display: 'flex', flexDirection: 'column', border: `1px solid ${colors.border}`, borderRadius: 1, mt: 1, overflow: 'hidden' }}>
            {/* Legend Header */}
            <Box sx={{
                p: 1.5,
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: colors.bg
            }}>
                <Typography variant="subtitle2" fontWeight="bold">Operation Schedule</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 12, height: 12, bgcolor: '#4caf50', borderRadius: 0.5 }} />
                        <Typography variant="caption">Charge</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 12, height: 12, bgcolor: '#f44336', borderRadius: 0.5 }} />
                        <Typography variant="caption">Spot (Discharge)</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 12, height: 12, bgcolor: '#ff9800', borderRadius: 0.5 }} />
                        <Typography variant="caption">Balance (Discharge)</Typography>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left Panel: Row Names */}
                <Box sx={{
                    width: leftPanelWidth,
                    flexShrink: 0,
                    borderRight: `1px solid ${colors.border}`,
                    bgcolor: colors.bg,
                    pt: `${headerHeight}px` // Push down by header height
                }}>
                    {rows.map((row, idx) => (
                        <Box
                            key={row.id}
                            sx={{
                                height: rowHeight,
                                display: 'flex',
                                alignItems: 'center',
                                px: 2,
                                borderBottom: idx < rows.length - 1 ? `1px solid ${colors.border}` : 'none'
                            }}
                        >
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: row.color, mr: 1, flexShrink: 0 }} />
                            <Typography variant="caption" noWrap title={row.name}>{row.name}</Typography>
                        </Box>
                    ))}
                </Box>

                {/* Scrollable Chart Area */}
                <Box sx={{ flex: 1, overflowX: 'auto', position: 'relative' }}>
                    <Box sx={{ width: chartWidth, minWidth: '100%' }}>
                        <svg width={chartWidth} height={rows.length * rowHeight + headerHeight}>

                            {/* Time Axis (Top) */}
                            {Array.from({ length: maxSlots }).map((_, idx) => {
                                const isMajorHour = idx % 6 === 0; // Every 3 hours
                                const x = idx * slotWidth;
                                return (
                                    <g key={idx}>
                                        <line x1={x} y1={headerHeight} x2={x} y2={rows.length * rowHeight + headerHeight} stroke={colors.grid} strokeOpacity={0.5} />
                                        {isMajorHour && (
                                            <text
                                                x={x + 2}
                                                y={headerHeight - 8}
                                                fontSize="10"
                                                fill={colors.textSecondary}
                                            >
                                                {getTimeLabel(idx)}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                            <line x1={0} y1={headerHeight} x2={chartWidth} y2={headerHeight} stroke={colors.border} />

                            {/* Rows */}
                            {rows.map((row, rowIdx) => {
                                const yBase = headerHeight + rowIdx * rowHeight;
                                return (
                                    <g key={row.id} transform={`translate(0, ${yBase})`}>
                                        {/* Row Bottom Border */}
                                        {rowIdx < rows.length - 1 && (
                                            <line x1={0} y1={rowHeight} x2={chartWidth} y2={rowHeight} stroke={colors.grid} />
                                        )}

                                        {/* Action Blocks */}
                                        {row.data.map((op, colIdx) => {
                                            const x = colIdx * slotWidth;
                                            const color = getActionColor(op.action);
                                            return (
                                                <g key={`${row.id}-${colIdx}`}>
                                                    <title>{`${row.name}\nTime: ${getTimeLabel(colIdx)}\nAction: ${op.action || '-'}\nPower: ${op.power != null ? Number(op.power).toFixed(2) : '-'} kW\nPrice (Actual): ${op.priceActual != null && Number.isFinite(op.priceActual) ? op.priceActual.toFixed(2) : '-'} JPY\nPrice (Pred): ${op.pricePredicted != null && Number.isFinite(op.pricePredicted) ? op.pricePredicted.toFixed(2) : '-'} JPY\nRev (Realized): ${op.revenueRealized != null && Number.isFinite(op.revenueRealized) ? op.revenueRealized.toLocaleString() : '-'} JPY`}</title>
                                                    {op.pricePredicted == null && row.name !== 'Optimal' && (
                                                        <rect
                                                            x={x}
                                                            y={0}
                                                            width={slotWidth}
                                                            height={rowHeight}
                                                            fill={darkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)'}
                                                        />
                                                    )}
                                                    {color !== 'transparent' && (
                                                        <rect
                                                            x={x + 1}
                                                            y={4}
                                                            width={slotWidth - 2}
                                                            height={rowHeight - 8}
                                                            fill={color}
                                                            rx={2}
                                                        />
                                                    )}
                                                </g>
                                            );
                                        })}
                                    </g>
                                );
                            })}
                        </svg>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};
