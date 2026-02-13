'use client';

import React, { useMemo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import { GanttOperation } from '@/types/revenueAnalysis';
import { format } from 'date-fns';
import { getJepxTimeCode } from '@/utils/jepxUtils';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

export interface GanttRowData {
    id: string;
    name: string;
    data: GanttOperation[];
    color: string;
}

interface OperationGanttChartProps {
    rows: GanttRowData[];
    periodCount?: number; // Default 48 per day, but could be dynamic
    slotWidth?: number;
    rowHeight?: number;
    headerHeight?: number;
    leftPanelWidth?: number;
    startDate?: string | Date; // Added prop
}

export const OperationGanttChart: React.FC<OperationGanttChartProps> = ({
    rows,
    periodCount = 48,
    slotWidth = 20,
    rowHeight = 60,
    headerHeight = 40,
    leftPanelWidth = 140,
    startDate
}) => {
    const { darkMode } = useTheme();

    // Calculate total width based on max data length if not fixed
    // For now assuming all rows have same length or fit in periodCount
    // But better to check max length
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
        charge: '#4caf50', // Green
        spot: '#f44336',   // Red
        balance: '#ff9800', // Orange
        idle: 'transparent',
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'Charge': return colors.charge;
            case 'Spot': return colors.spot;
            case 'Balance': return colors.balance;
            default: return colors.idle;
        }
    };

    const getOpacity = (power: number, action: string) => {
        if (action === 'Idle') return 0;
        // Simple scaling: if power > 0, opacity 0.4 + (power relative to max? or just 0.8)
        // Without max power context, we can just use a fixed opacity or scale if we knew P_max
        return 0.7;
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
        <Box sx={{ display: 'flex', overflow: 'hidden', border: `1px solid ${colors.border}`, borderRadius: 1 }}>
            {/* Left Panel: Row Names */}
            <Box sx={{
                width: leftPanelWidth,
                flexShrink: 0,
                borderRight: `1px solid ${colors.border}`,
                bgcolor: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                mt: `${headerHeight}px` // Offset for header
            }}>
                {rows.map((row) => (
                    <Box key={row.id} sx={{
                        height: rowHeight,
                        borderBottom: `1px solid ${colors.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center', // Changed to center
                        p: 1,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: row.color,
                        textAlign: 'center',
                        lineHeight: 1.2
                    }}>
                        {row.name}
                    </Box>
                ))}
            </Box>

            {/* Scrollable Chart Area */}
            <Box sx={{ flex: 1, overflowX: 'auto', position: 'relative' }}>
                <Box sx={{ width: chartWidth, minWidth: '100%' }}>
                    <svg width={chartWidth} height={headerHeight + rows.length * rowHeight}>
                        {/* Header: Periods */}
                        <g>
                            {Array.from({ length: maxSlots }).map((_, idx) => {
                                const isDayStart = idx % 48 === 0;
                                const isMajorHour = idx % 6 === 0; // Every 3 hours

                                return (
                                    <g key={idx} transform={`translate(${idx * slotWidth}, 0)`}>
                                        <rect width={slotWidth} height={headerHeight} fill={isDayStart ? (darkMode ? '#333' : '#eee') : 'transparent'} stroke={colors.border} strokeWidth={0.5} />

                                        {/* Show label only periodically to avoid clutter */}
                                        {isMajorHour && (
                                            <text
                                                x={0} // Start of slot
                                                y={headerHeight / 2 + 5}
                                                fontSize="10"
                                                fill={colors.textSecondary}
                                            >
                                                {getTimeLabel(idx)}
                                            </text>
                                        )}
                                        {/* JEPX Time Code (small) */}
                                        <text
                                            x={slotWidth / 2}
                                            y={headerHeight - 2}
                                            fontSize="8"
                                            textAnchor="middle"
                                            fill={colors.textSecondary}
                                            opacity={0.5}
                                        >
                                            {(idx % 48) + 1}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>

                        {/* Rows */}
                        {rows.map((row, rowIndex) => {
                            const yOffset = headerHeight + rowIndex * rowHeight;
                            return (
                                <g key={row.id} transform={`translate(0, ${yOffset})`}>
                                    <line x1={0} y1={rowHeight} x2={chartWidth} y2={rowHeight} stroke={colors.border} />

                                    {row.data.map((op, idx) => {
                                        if (idx >= maxSlots) return null;
                                        if (op.action === 'Idle') return null;

                                        const barHeight = rowHeight - 8;
                                        const barY = 4;
                                        const barX = idx * slotWidth;

                                        // Arrow configuration
                                        const isCharge = op.action === 'Charge';
                                        const isDischarge = op.action === 'Spot' || op.action === 'Balance';

                                        // Center of the bar
                                        const centerX = barX + slotWidth / 2;
                                        const centerY = barY + barHeight / 2;

                                        return (
                                            <Tooltip
                                                key={idx}
                                                title={
                                                    <Box sx={{ p: 0.5 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Time Code: {op.timeCode ?? ((idx % 48) + 1)}</Typography>
                                                        <Typography variant="caption" display="block">Time: {(() => {
                                                            // Try to use startDate + index first (consistent with axis)
                                                            if (startDate) {
                                                                try {
                                                                    const d = new Date(startDate);
                                                                    if (!isNaN(d.getTime())) {
                                                                        d.setMinutes(d.getMinutes() + (idx * 30));
                                                                        return format(d, 'MM/dd HH:mm');
                                                                    }
                                                                } catch (e) { }
                                                            }

                                                            // Fallback to op.datetime
                                                            try {
                                                                const d = new Date(op.datetime);
                                                                if (isNaN(d.getTime())) return 'Invalid Time';
                                                                return format(d, 'MM/dd HH:mm');
                                                            } catch (e) {
                                                                return 'Invalid Time';
                                                            }
                                                        })()}</Typography>
                                                        <Typography variant="caption" display="block">Action: {op.action}</Typography>
                                                        <Typography variant="caption" display="block">Power: {op.power.toFixed(2)} MW</Typography>
                                                        <Typography variant="caption" display="block">Price: {op.price.toFixed(2)} JPY</Typography>
                                                        <Typography variant="caption" display="block">Revenue: ¥{op.revenue?.toLocaleString() ?? 0}</Typography>
                                                    </Box>
                                                }
                                                arrow
                                            >
                                                <g style={{ cursor: 'pointer' }}>
                                                    <rect
                                                        x={barX}
                                                        y={barY}
                                                        width={slotWidth - 1}
                                                        height={barHeight}
                                                        fill={getActionColor(op.action)}
                                                        opacity={getOpacity(op.power, op.action)}
                                                        rx={2}
                                                    />
                                                    {/* Arrow Indicator */}
                                                    {isCharge && (
                                                        <path
                                                            d={`M${centerX},${centerY - 5} L${centerX},${centerY + 5} M${centerX - 3},${centerY + 2} L${centerX},${centerY + 5} L${centerX + 3},${centerY + 2}`}
                                                            stroke="rgba(255,255,255,0.8)"
                                                            strokeWidth="1.5"
                                                            fill="none"
                                                        />
                                                    )}
                                                    {isDischarge && (
                                                        <path
                                                            d={`M${centerX},${centerY + 5} L${centerX},${centerY - 5} M${centerX - 3},${centerY - 2} L${centerX},${centerY - 5} L${centerX + 3},${centerY - 2}`}
                                                            stroke="rgba(255,255,255,0.8)"
                                                            strokeWidth="1.5"
                                                            fill="none"
                                                        />
                                                    )}
                                                </g>
                                            </Tooltip>
                                        );
                                    })}
                                </g>
                            );
                        })}
                    </svg>
                </Box>
            </Box>
        </Box>
    );
};
