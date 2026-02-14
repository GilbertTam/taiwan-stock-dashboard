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
            <Box sx={{ flex: 1, minWidth: 0, py: 1, pl: 1.25, pr: 0.5, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--foreground)', fontSize: 13, lineHeight: 1.3 }} noWrap>
                        {area.name_ch}
                    </Typography>
                    {loading ? (
                        <Skeleton variant="text" width={44} height={16} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                    ) : hasData && latestPrice != null && (
                        <Typography component="span" sx={{ fontWeight: 600, color: 'var(--foreground)', fontFamily: 'monospace', fontSize: 12 }}>
                            ¥{latestPrice.toFixed(1)}
                        </Typography>
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    <Typography variant="caption" sx={{ color: 'var(--muted)', fontSize: 10 }}>
                        {area.name}
                    </Typography>
                    {!loading && hasData && (spreadChange != null || todaySpread != null) && (
                        <>
                            {spreadChange != null && (
                                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', color: spreadChange >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: 9 }}>
                                    {spreadChange >= 0 ? <TrendingUpIcon sx={{ fontSize: 10 }} /> : <TrendingDownIcon sx={{ fontSize: 10 }} />}
                                    <span style={{ marginLeft: 2 }}>{spreadChange >= 0 ? '+' : ''}{spreadChange.toFixed(1)}%</span>
                                </Box>
                            )}
                            {todaySpread != null && (
                                <Typography component="span" variant="caption" sx={{ color: 'var(--muted)', fontSize: 9, fontFamily: 'monospace' }}>
                                    價差 ¥{todaySpread.toFixed(1)}
                                </Typography>
                            )}
                        </>
                    )}
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
}

export function AreaCardList({
    areas,
    allAreasChartData,
    loading,
    focusedArea,
    onAreaClick,
    dailySpreadStats,
}: AreaCardListProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                pr: 0.5,
                '&::-webkit-scrollbar': {
                    width: 4,
                },
                '&::-webkit-scrollbar-track': {
                    backgroundColor: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 2,
                },
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

