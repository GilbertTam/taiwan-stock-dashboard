'use client';

import React from 'react';
import { Box, Typography, Skeleton, Tooltip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import type { Area } from '@/types';
import { ChartDataPoint } from '@/utils/chartUtils';

// Distinct colors for each area (same as AllAreasPriceChart)
const AREA_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#6b7280', // gray
];

interface AreaInfoCardProps {
    area: Area;
    chartData: ChartDataPoint[];
    colorIndex: number;
    isFocused?: boolean;
    loading?: boolean;
    onToggleFocus?: () => void;
    spreadChange?: number | null;
    todaySpread?: number | null;
}

export function AreaInfoCard({
    area,
    chartData,
    colorIndex,
    isFocused,
    loading,
    onToggleFocus,
    spreadChange,
    todaySpread,
}: AreaInfoCardProps) {
    const color = AREA_COLORS[colorIndex % AREA_COLORS.length];

    // Calculate metrics
    const validPrices = chartData.filter((p) => p.actualPrice != null);
    const latestPrice = validPrices.length > 0 ? validPrices[validPrices.length - 1].actualPrice : null;
    const firstPrice = validPrices.length > 0 ? validPrices[0].actualPrice : null;

    const priceChange = latestPrice != null && firstPrice != null && firstPrice !== 0
        ? ((latestPrice - firstPrice) / firstPrice) * 100
        : null;

    const highPrice = validPrices.length > 0
        ? Math.max(...validPrices.map((p) => p.actualPrice!))
        : null;
    const lowPrice = validPrices.length > 0
        ? Math.min(...validPrices.map((p) => p.actualPrice!))
        : null;

    const hasData = validPrices.length > 0;

    return (
        <Box
            onClick={onToggleFocus}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleFocus?.(); } }}
            sx={{
                display: 'flex',
                alignItems: 'stretch',
                gap: 0,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: isFocused ? color : 'rgba(255,255,255,0.08)',
                backgroundColor: isFocused ? `${color}12` : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: isFocused ? `0 0 0 1px ${color}40` : 'none',
                minHeight: 48,
                '&:hover': {
                    borderColor: isFocused ? color : 'rgba(255,255,255,0.12)',
                    backgroundColor: isFocused ? `${color}18` : 'rgba(255,255,255,0.04)',
                    '& .color-bar': { height: '100%' },
                },
            }}
        >
            {/* Color bar */}
            <Box
                className="color-bar"
                sx={{
                    width: 3,
                    flexShrink: 0,
                    height: isFocused ? '100%' : '50%',
                    alignSelf: 'center',
                    backgroundColor: color,
                    borderRadius: '0 2px 2px 0',
                    transition: 'height 0.2s ease',
                }}
            />

            {/* Main content */}
            <Box sx={{ flex: 1, minWidth: 0, py: 0.75, pl: 1, pr: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.25 }}>
                
                {/* 第一列：地區名稱 + 最新電價 */}
                <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 0.5 }}>
                    <Typography sx={{ fontWeight: 700, color: 'var(--foreground)', fontSize: 13, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {area.name_ch}
                    </Typography>
                    
                    {loading ? (
                        <Skeleton variant="text" width={48} height={18} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                    ) : hasData && latestPrice != null ? (
                        <Typography
                            sx={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: color,
                                fontFamily: 'monospace',
                                fontVariantNumeric: 'tabular-nums',
                                lineHeight: 1.1,
                                letterSpacing: '-0.02em',
                            }}
                        >
                            ¥{latestPrice.toFixed(2)}
                        </Typography>
                    ) : (
                        <Typography sx={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.1 }}>—</Typography>
                    )}
                </Box>

                {/* 第二列：地區代碼 + (漲跌 | 價差) */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                    <Typography sx={{ color: 'var(--muted)', fontSize: 10, fontFamily: 'monospace', letterSpacing: 0.2 }}>
                        {area.name}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        {/* 漲跌指標 */}
                        {!loading && spreadChange != null && (
                            <Tooltip title="價差變化率 = (今日價差 - 昨日價差) / 昨日價差" arrow placement="top">
                                <Box
                                    component="span"
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 0.25,
                                        px: 0.5,
                                        py: 0.125,
                                        borderRadius: 0.5,
                                        backgroundColor: spreadChange >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                                        color: spreadChange >= 0 ? '#4ade80' : '#f87171',
                                        cursor: 'help',
                                    }}
                                >
                                    {spreadChange >= 0
                                        ? <TrendingUpIcon sx={{ fontSize: 10 }} />
                                        : <TrendingDownIcon sx={{ fontSize: 10 }} />}
                                    <Box component="span" sx={{ fontSize: 9, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                        {spreadChange >= 0 ? '+' : ''}{spreadChange.toFixed(1)}%
                                    </Box>
                                </Box>
                            </Tooltip>
                        )}
                        
                        {/* 今日價差 */}
                        {!loading && todaySpread != null && (
                            <Tooltip title="今日價差 = 今日最高價 - 今日最低價" arrow placement="top">
                                <Typography sx={{ color: 'var(--muted)', fontSize: 10, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', cursor: 'help' }}>
                                    Δ¥{todaySpread.toFixed(1)}
                                </Typography>
                            </Tooltip>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

interface AreaCardListProps {
    areas: Area[];
    allAreasChartData: Record<string, ChartDataPoint[]>;
    loading?: boolean;
    focusedArea?: string | null;
    onAreaClick?: (areaName: string) => void;
    dailySpreadStats?: Record<string, { todaySpread: number | null; yesterdaySpread: number | null; change: number | null }>;
    direction?: 'row' | 'column';
}

export function AreaCardList({
    areas,
    allAreasChartData,
    loading,
    focusedArea,
    onAreaClick,
    dailySpreadStats,
    direction = 'row',
}: AreaCardListProps) {
    const isColumn = direction === 'column';
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: isColumn ? 'stretch' : 'center',
                justifyContent: isColumn ? 'flex-start' : 'center',
                flexDirection: isColumn ? 'column' : 'row',
                gap: 0.75,
                width: '100%',
                height: isColumn ? '100%' : undefined,
                overflowX: isColumn ? 'hidden' : 'auto',
                overflowY: isColumn ? 'auto' : 'hidden',
                pb: isColumn ? 0 : 0.5,
                '&::-webkit-scrollbar': {
                    width: isColumn ? 4 : undefined,
                    height: isColumn ? undefined : 4,
                },
                '&::-webkit-scrollbar-track': {
                    backgroundColor: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 2,
                },
                ...(isColumn ? {
                    '& > *': {
                        minWidth: 0,
                    },
                } : {
                    '& > *': {
                        flexShrink: 0,
                        width: 140,
                    },
                }),
            }}
        >
            {areas.map((area, idx) => (
                <AreaInfoCard
                    key={area.name}
                    area={area}
                    chartData={allAreasChartData[area.name] || []}
                    colorIndex={idx}
                    loading={loading}
                    isFocused={focusedArea === area.name}
                    onToggleFocus={() => onAreaClick?.(area.name)}
                    spreadChange={dailySpreadStats?.[area.name]?.change ?? null}
                    todaySpread={dailySpreadStats?.[area.name]?.todaySpread ?? null}
                />
            ))}
        </Box>
    );
}

