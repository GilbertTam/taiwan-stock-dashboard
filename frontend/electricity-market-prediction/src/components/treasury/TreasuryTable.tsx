'use client';

/**
 * 庫藏股主表。欄位:代號/名稱、買回目的、董事會決議日、預定買回期間、
 * 預定股數(張)、價格區間、已買回進度、狀態 badge(新公告/執行中/完成)。
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TreasuryBuyback } from '@/types/treasury';
import { STATUS_COLOR, STATUS_I18N, fmtShares, fmtPriceRange } from './treasuryFormat';

interface Props {
    items: TreasuryBuyback[];
}

const COLS = '96px 1fr 130px 100px 170px 110px 110px 96px';

function HeaderCell({ label, align = 'right' }: { label: string; align?: 'left' | 'right' }) {
    return (
        <Typography sx={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textAlign: align }}>
            {label}
        </Typography>
    );
}

function StatusBadge({ status }: { status: TreasuryBuyback['status'] }) {
    const { t } = useTranslation('treasury');
    const color = STATUS_COLOR[status];
    return (
        <Box
            component="span"
            sx={{
                fontSize: 11, fontWeight: 700, px: 0.75, py: 0.25, borderRadius: '6px',
                border: `1px solid ${color}`, color, whiteSpace: 'nowrap',
                background: status === '新公告' ? 'rgba(255,107,107,0.1)' : 'transparent',
            }}
        >
            {t(STATUS_I18N[status])}
        </Box>
    );
}

export function TreasuryTable({ items }: Props) {
    const { t } = useTranslation('treasury');

    return (
        <Box sx={{ border: '1px solid var(--card-border)', borderRadius: 2, overflow: 'hidden', background: 'var(--card-bg)' }}>
            <Box
                sx={{
                    display: 'grid', gridTemplateColumns: COLS, gap: 1, alignItems: 'center',
                    px: 1.5, py: 1, borderBottom: '1px solid var(--card-border)',
                    background: 'var(--subtle-bg)', position: 'sticky', top: 0, zIndex: 1,
                }}
            >
                <HeaderCell label={t('table.code')} align="left" />
                <HeaderCell label={t('table.name')} align="left" />
                <HeaderCell label={t('table.purpose')} align="left" />
                <HeaderCell label={t('table.boardDate')} align="left" />
                <HeaderCell label={t('table.period')} align="left" />
                <HeaderCell label={t('table.plannedShares')} />
                <HeaderCell label={t('table.priceRange')} />
                <HeaderCell label={t('table.status')} align="right" />
            </Box>

            {items.map((r) => (
                <Box
                    key={`${r.code}-${r.board_date}`}
                    sx={{
                        display: 'grid', gridTemplateColumns: COLS, gap: 1, alignItems: 'center',
                        px: 1.5, py: 1, borderBottom: '1px solid var(--card-border)',
                        '&:hover': { background: 'var(--hover-bg)' },
                        '&:last-of-type': { borderBottom: 'none' },
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: 'var(--foreground)' }}>
                            {r.code}
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.purpose}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {r.board_date}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {r.period_start || '—'} ~ {r.period_end || '—'}
                    </Typography>
                    <Typography sx={{ fontSize: 13, textAlign: 'right', color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtShares(r.planned_shares)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, textAlign: 'right', color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtPriceRange(r.price_low, r.price_high)}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <StatusBadge status={r.status} />
                    </Box>
                </Box>
            ))}
        </Box>
    );
}
