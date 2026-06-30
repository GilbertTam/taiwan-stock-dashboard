'use client';

/**
 * 庫藏股主表。欄位:代號/名稱、買回目的、董事會決議日、預定買回期間、
 * 預定股數(張)、價格區間、狀態 badge(新公告/執行中/完成)。
 * 決議日 / 預定期間 / 預定股數 / 價格區間 / 狀態 可點表頭排序(client-side)。
 */
import React, { useMemo, useState } from 'react';
import { Box, Typography, ButtonBase } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import { useTranslation } from 'react-i18next';
import type { TreasuryBuyback, TreasuryStatus } from '@/types/treasury';
import { STATUS_COLOR, STATUS_I18N, fmtShares, fmtPriceRange } from './treasuryFormat';

interface Props {
    items: TreasuryBuyback[];
}

const COLS = '96px 1fr 130px 100px 170px 110px 110px 96px';

type SortKey = 'board_date' | 'period' | 'planned_shares' | 'price' | 'status';
type SortDir = 'asc' | 'desc';

const STATUS_RANK: Record<TreasuryStatus, number> = { 新公告: 0, 執行中: 1, 完成: 2 };

/** 取排序值;字串/數字皆可,null/'' 一律排到底。 */
function sortVal(r: TreasuryBuyback, key: SortKey): number | string | null {
    switch (key) {
        case 'board_date': return r.board_date || null;
        case 'period': return r.period_end || null;
        case 'planned_shares': return r.planned_shares;
        case 'price': return r.price_high ?? r.price_low;
        case 'status': return STATUS_RANK[r.status];
    }
}

function StaticHeader({ label, align = 'right' }: { label: string; align?: 'left' | 'right' }) {
    return (
        <Typography sx={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textAlign: align }}>
            {label}
        </Typography>
    );
}

function SortHeader({
    label, active, dir, align = 'right', onClick,
}: {
    label: string; active: boolean; dir: SortDir; align?: 'left' | 'right'; onClick: () => void;
}) {
    const Arrow = dir === 'asc' ? ArrowDropUpIcon : ArrowDropDownIcon;
    return (
        <ButtonBase
            disableRipple
            onClick={onClick}
            sx={{
                display: 'flex', alignItems: 'center', gap: 0,
                justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
                fontSize: 11, fontWeight: 700,
                color: active ? 'var(--primary)' : 'var(--muted)',
                '&:hover': { color: 'var(--primary)' },
            }}
        >
            {label}
            <Arrow sx={{ fontSize: 16, opacity: active ? 1 : 0.35 }} />
        </ButtonBase>
    );
}

function StatusBadge({ status }: { status: TreasuryStatus }) {
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
    const [sortKey, setSortKey] = useState<SortKey>('board_date');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const onSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const sorted = useMemo(() => {
        const arr = [...items];
        const mul = sortDir === 'asc' ? 1 : -1;
        arr.sort((a, b) => {
            const va = sortVal(a, sortKey);
            const vb = sortVal(b, sortKey);
            // null 一律排到底(不受 asc/desc 影響)
            if (va == null && vb == null) return 0;
            if (va == null) return 1;
            if (vb == null) return -1;
            if (va < vb) return -1 * mul;
            if (va > vb) return 1 * mul;
            return 0;
        });
        return arr;
    }, [items, sortKey, sortDir]);

    const sh = (key: SortKey, label: string, align: 'left' | 'right' = 'right') => (
        <SortHeader label={label} active={sortKey === key} dir={sortDir} align={align} onClick={() => onSort(key)} />
    );

    return (
        <Box sx={{ border: '1px solid var(--card-border)', borderRadius: 2, overflow: 'hidden', background: 'var(--card-bg)' }}>
            <Box
                sx={{
                    display: 'grid', gridTemplateColumns: COLS, gap: 1, alignItems: 'center',
                    px: 1.5, py: 1, borderBottom: '1px solid var(--card-border)',
                    background: 'var(--subtle-bg)', position: 'sticky', top: 0, zIndex: 1,
                }}
            >
                <StaticHeader label={t('table.code')} align="left" />
                <StaticHeader label={t('table.name')} align="left" />
                <StaticHeader label={t('table.purpose')} align="left" />
                {sh('board_date', t('table.boardDate'), 'left')}
                {sh('period', t('table.period'), 'left')}
                {sh('planned_shares', t('table.plannedShares'))}
                {sh('price', t('table.priceRange'))}
                {sh('status', t('table.status'))}
            </Box>

            {sorted.map((r) => (
                <Box
                    key={`${r.code}-${r.board_date}`}
                    sx={{
                        display: 'grid', gridTemplateColumns: COLS, gap: 1, alignItems: 'center',
                        px: 1.5, py: 1, borderBottom: '1px solid var(--card-border)',
                        '&:hover': { background: 'var(--hover-bg)' },
                        '&:last-of-type': { borderBottom: 'none' },
                    }}
                >
                    <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: 'var(--foreground)' }}>
                        {r.code}
                    </Typography>
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
