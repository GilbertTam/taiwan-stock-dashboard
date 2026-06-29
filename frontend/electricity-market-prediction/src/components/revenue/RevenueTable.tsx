'use client';

/**
 * 月營收主表。欄位:代號/名稱、產業、當月營收、MoM%、YoY%、累計營收、累計YoY%。
 * YoY/MoM 紅綠上色(台股慣例:正紅負綠);今日新申報顯示「新」badge。
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { MonthlyRevenue } from '@/types/revenue';
import { fmtPct, fmtRevenue, pctColor } from './revenueFormat';

interface Props {
    items: MonthlyRevenue[];
}

const COLS = '92px 1fr 120px 110px 100px 100px 120px 100px';

function HeaderCell({ label, align = 'right' }: { label: string; align?: 'left' | 'right' }) {
    return (
        <Typography sx={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textAlign: align }}>
            {label}
        </Typography>
    );
}

export function RevenueTable({ items }: Props) {
    const { t } = useTranslation('revenue');

    return (
        <Box sx={{ border: '1px solid var(--card-border)', borderRadius: 2, overflow: 'hidden', background: 'var(--card-bg)' }}>
            {/* 表頭 */}
            <Box
                sx={{
                    display: 'grid', gridTemplateColumns: COLS, gap: 1, alignItems: 'center',
                    px: 1.5, py: 1, borderBottom: '1px solid var(--card-border)',
                    background: 'var(--subtle-bg)', position: 'sticky', top: 0, zIndex: 1,
                }}
            >
                <HeaderCell label={t('table.code')} align="left" />
                <HeaderCell label={t('table.name')} align="left" />
                <HeaderCell label={t('table.industry')} align="left" />
                <HeaderCell label={t('table.revenue')} />
                <HeaderCell label={t('table.mom')} />
                <HeaderCell label={t('table.yoy')} />
                <HeaderCell label={t('table.cumRevenue')} />
                <HeaderCell label={t('table.cumYoy')} />
            </Box>

            {/* 列 */}
            {items.map((r) => (
                <Box
                    key={`${r.code}-${r.year_month}`}
                    sx={{
                        display: 'grid', gridTemplateColumns: COLS, gap: 1, alignItems: 'center',
                        px: 1.5, py: 1, borderBottom: '1px solid var(--card-border)',
                        '&:hover': { background: 'var(--hover-bg)' },
                        '&:last-of-type': { borderBottom: 'none' },
                    }}
                >
                    {/* 代號 + 新 badge */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: 'var(--foreground)' }}>
                            {r.code}
                        </Typography>
                        {r.is_new && (
                            <Box
                                component="span"
                                sx={{
                                    fontSize: 9, fontWeight: 800, px: 0.5, py: 0.125, borderRadius: '4px',
                                    background: '#FF6B6B', color: '#000', lineHeight: 1.4,
                                }}
                            >
                                {t('table.newBadge')}
                            </Box>
                        )}
                    </Box>

                    <Typography sx={{ fontSize: 13, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.industry}
                    </Typography>

                    <Typography sx={{ fontSize: 13, textAlign: 'right', color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtRevenue(r.revenue)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, textAlign: 'right', fontWeight: 700, color: pctColor(r.mom_pct), fontVariantNumeric: 'tabular-nums' }}>
                        {fmtPct(r.mom_pct)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, textAlign: 'right', fontWeight: 700, color: pctColor(r.yoy_pct), fontVariantNumeric: 'tabular-nums' }}>
                        {fmtPct(r.yoy_pct)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, textAlign: 'right', color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtRevenue(r.cum_revenue)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, textAlign: 'right', fontWeight: 700, color: pctColor(r.cum_yoy_pct), fontVariantNumeric: 'tabular-nums' }}>
                        {fmtPct(r.cum_yoy_pct)}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}
