'use client';

/**
 * 月營收主表。欄位:代號/名稱、產業、出表日、當月營收、MoM%、YoY%、累計營收、累計YoY%。
 * YoY/MoM 紅綠上色(台股慣例:正紅負綠);今日新申報顯示「新」badge。
 * 點代號 → 展開該股歷史營收(直方圖 + 歷史表)。
 */
import React, { useState } from 'react';
import { Box, Typography, ButtonBase, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import type { MonthlyRevenue } from '@/types/revenue';
import { fmtPct, fmtRevenue, pctColor } from './revenueFormat';
import { RevenueHistoryPanel } from './RevenueHistoryPanel';

interface Props {
    items: MonthlyRevenue[];
}

const COLS = '104px 1fr 108px 76px 108px 92px 92px 108px 92px';

function HeaderCell({ label, align = 'right' }: { label: string; align?: 'left' | 'right' }) {
    return (
        <Typography sx={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textAlign: align }}>
            {label}
        </Typography>
    );
}

export function RevenueTable({ items }: Props) {
    const { t } = useTranslation('revenue');
    const [expanded, setExpanded] = useState<string | null>(null);

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
                <HeaderCell label={t('table.reportDate')} align="left" />
                <HeaderCell label={t('table.revenue')} />
                <HeaderCell label={t('table.mom')} />
                <HeaderCell label={t('table.yoy')} />
                <HeaderCell label={t('table.cumRevenue')} />
                <HeaderCell label={t('table.cumYoy')} />
            </Box>

            {/* 列 */}
            {items.map((r) => {
                const isOpen = expanded === r.code;
                return (
                    <Box key={`${r.code}-${r.year_month}`} sx={{ borderBottom: '1px solid var(--card-border)', '&:last-of-type': { borderBottom: 'none' } }}>
                        <Box
                            sx={{
                                display: 'grid', gridTemplateColumns: COLS, gap: 1, alignItems: 'center',
                                px: 1.5, py: 1, '&:hover': { background: 'var(--hover-bg)' },
                                background: isOpen ? 'var(--hover-bg)' : 'transparent',
                            }}
                        >
                            {/* 代號(可點展開) + 新 badge */}
                            <ButtonBase
                                disableRipple
                                onClick={() => setExpanded(isOpen ? null : r.code)}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.4, justifyContent: 'flex-start' }}
                            >
                                <ExpandMoreIcon sx={{ fontSize: 15, color: 'var(--muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: isOpen ? 'var(--primary)' : 'var(--foreground)' }}>
                                    {r.code}
                                </Typography>
                                {r.is_new && (
                                    <Box component="span" sx={{ fontSize: 9, fontWeight: 800, px: 0.5, py: 0.125, borderRadius: '4px', background: '#FF6B6B', color: '#000', lineHeight: 1.4 }}>
                                        {t('table.newBadge')}
                                    </Box>
                                )}
                            </ButtonBase>

                            <Typography sx={{ fontSize: 13, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</Typography>
                            <Typography sx={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.industry}</Typography>
                            <Typography sx={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{r.report_date ? r.report_date.slice(5) : '—'}</Typography>

                            <Typography sx={{ fontSize: 13, textAlign: 'right', color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>{fmtRevenue(r.revenue)}</Typography>
                            <Typography sx={{ fontSize: 13, textAlign: 'right', fontWeight: 700, color: pctColor(r.mom_pct), fontVariantNumeric: 'tabular-nums' }}>{fmtPct(r.mom_pct)}</Typography>
                            <Typography sx={{ fontSize: 13, textAlign: 'right', fontWeight: 700, color: pctColor(r.yoy_pct), fontVariantNumeric: 'tabular-nums' }}>{fmtPct(r.yoy_pct)}</Typography>
                            <Typography sx={{ fontSize: 13, textAlign: 'right', color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>{fmtRevenue(r.cum_revenue)}</Typography>
                            <Typography sx={{ fontSize: 13, textAlign: 'right', fontWeight: 700, color: pctColor(r.cum_yoy_pct), fontVariantNumeric: 'tabular-nums' }}>{fmtPct(r.cum_yoy_pct)}</Typography>
                        </Box>

                        <Collapse in={isOpen} unmountOnExit>
                            <Box sx={{ borderTop: '1px solid var(--card-border)', background: 'var(--subtle-bg)' }}>
                                {isOpen && <RevenueHistoryPanel code={r.code} name={r.name} />}
                            </Box>
                        </Collapse>
                    </Box>
                );
            })}
        </Box>
    );
}
