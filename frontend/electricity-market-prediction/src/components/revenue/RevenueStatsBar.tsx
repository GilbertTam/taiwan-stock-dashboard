'use client';

/**
 * 月營收頁標頭 — 最新月份、公布家數、今日新申報、平均 YoY、重新整理。
 * 視覺沿用 DailyStatsBar / 專案 CSS variables。
 */
import React from 'react';
import { Box, Typography, ButtonBase, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useTranslation } from 'react-i18next';
import type { RevenueSummary } from '@/types/revenue';
import { fmtPct, pctColor } from './revenueFormat';

interface Props {
    yearMonth: string | null;
    summary: RevenueSummary | null;
    shown: number;
    loading?: boolean;
    onRefresh: () => void;
}

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 64 }}>
            <Typography sx={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.2 }}>{label}</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: color ?? 'var(--foreground)', lineHeight: 1.2 }}>
                {value}
            </Typography>
        </Box>
    );
}

export function RevenueStatsBar({ yearMonth, summary, shown, loading, onRefresh }: Props) {
    const { t } = useTranslation('revenue');
    return (
        <Box
            sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                p: 2, mb: 2, borderRadius: 2,
                border: '1px solid var(--card-border)', background: 'var(--card-bg)',
                backdropFilter: 'blur(12px)', flexWrap: 'wrap', gap: 2,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                    sx={{
                        width: 36, height: 36, borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,204,122,0.12)',
                    }}
                >
                    <ReceiptLongIcon sx={{ color: 'var(--primary)', fontSize: 20 }} />
                </Box>
                <Box>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.1 }}>
                        {t('page.title')}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.1 }}>
                        {t('stats.dataMonth')} {yearMonth ?? '—'}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Stat label={t('stats.announced')} value={`${summary?.total ?? 0}`} />
                <Stat label={t('stats.newToday')} value={`${summary?.new_today ?? 0}`} color="#FF6B6B" />
                <Stat
                    label={t('stats.avgYoy')}
                    value={fmtPct(summary?.avg_yoy ?? null)}
                    color={pctColor(summary?.avg_yoy ?? null)}
                />
                <Stat label={t('stats.shown')} value={`${shown}`} color="var(--primary)" />
                <ButtonBase
                    onClick={onRefresh}
                    disabled={loading}
                    sx={{
                        p: 1, borderRadius: '8px', color: 'var(--muted)',
                        '&:hover': { color: 'var(--primary)', background: 'var(--hover-bg)' },
                    }}
                >
                    {loading
                        ? <CircularProgress size={16} sx={{ color: 'var(--primary)' }} />
                        : <RefreshIcon sx={{ fontSize: 18 }} />}
                </ButtonBase>
            </Box>
        </Box>
    );
}
