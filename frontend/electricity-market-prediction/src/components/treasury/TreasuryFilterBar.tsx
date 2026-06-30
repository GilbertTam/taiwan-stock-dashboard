'use client';

/**
 * 庫藏股篩選列:狀態 / 市場別 / 搜尋。Segmented 樣式沿用 DailyFilterBar。
 */
import React from 'react';
import { Box, ButtonBase, InputBase } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import type { TreasuryStatusFilter } from '@/types/treasury';

export type TreasuryMarketFilter = 'all' | 'twse' | 'tpex';

interface Props {
    status: TreasuryStatusFilter;
    onStatusChange: (s: TreasuryStatusFilter) => void;
    market: TreasuryMarketFilter;
    onMarketChange: (m: TreasuryMarketFilter) => void;
    query: string;
    onQueryChange: (q: string) => void;
}

function Segmented<T extends string>({
    options, value, onChange,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <Box sx={{ display: 'flex', gap: '2px', p: '2px', borderRadius: '8px', background: 'var(--subtle-bg)' }}>
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <ButtonBase
                        key={opt.value}
                        disableRipple
                        onClick={() => onChange(opt.value)}
                        sx={{
                            px: 1.5, height: 30, borderRadius: '6px',
                            fontSize: 12.5, fontWeight: active ? 700 : 500,
                            transition: 'all 0.15s ease',
                            backgroundColor: active ? 'rgba(0,204,122,0.14)' : 'transparent',
                            color: active ? 'var(--primary)' : 'var(--muted)',
                            '&:hover': { backgroundColor: active ? 'rgba(0,204,122,0.2)' : 'var(--hover-bg)' },
                        }}
                    >
                        {opt.label}
                    </ButtonBase>
                );
            })}
        </Box>
    );
}

export function TreasuryFilterBar(props: Props) {
    const { t } = useTranslation('treasury');
    const { status, onStatusChange, market, onMarketChange, query, onQueryChange } = props;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
            <Segmented<TreasuryStatusFilter>
                value={status}
                onChange={onStatusChange}
                options={[
                    { value: 'active', label: t('filter.active') },
                    { value: 'new', label: t('filter.new') },
                    { value: 'executing', label: t('filter.executing') },
                    { value: 'done', label: t('filter.done') },
                    { value: 'all', label: t('filter.all') },
                ]}
            />
            <Box sx={{ width: 1, height: 22, background: 'var(--card-border)' }} />
            <Segmented<TreasuryMarketFilter>
                value={market}
                onChange={onMarketChange}
                options={[
                    { value: 'all', label: t('filter.allMarket') },
                    { value: 'twse', label: t('filter.twse') },
                    { value: 'tpex', label: t('filter.tpex') },
                ]}
            />
            <Box sx={{ flex: 1 }} />
            <Box
                sx={{
                    display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, height: 32,
                    borderRadius: '8px', border: '1px solid var(--card-border)',
                    background: 'var(--subtle-bg)', minWidth: 180,
                }}
            >
                <SearchIcon sx={{ fontSize: 16, color: 'var(--muted)' }} />
                <InputBase
                    placeholder={t('filter.search')}
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    sx={{ fontSize: 13, color: 'var(--foreground)', flex: 1 }}
                />
            </Box>
        </Box>
    );
}
