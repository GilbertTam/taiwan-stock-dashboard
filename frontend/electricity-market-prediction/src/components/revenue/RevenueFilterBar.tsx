'use client';

/**
 * 月營收篩選列:年月 / 市場別 / 排序 / 僅新申報 / YoY·MoM 門檻 / 搜尋。
 * Segmented 樣式沿用 DailyFilterBar。
 */
import React from 'react';
import { Box, ButtonBase, InputBase, MenuItem, Select } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import { useTranslation } from 'react-i18next';
import type { RevenueSort } from '@/types/revenue';

export type RevenueMarketFilter = 'all' | 'twse' | 'tpex';

interface Props {
    months: string[];
    yearMonth: string | null;
    onMonthChange: (m: string) => void;
    market: RevenueMarketFilter;
    onMarketChange: (m: RevenueMarketFilter) => void;
    sort: RevenueSort;
    onSortChange: (s: RevenueSort) => void;
    newOnly: boolean;
    onNewOnlyChange: (v: boolean) => void;
    minYoy: string;
    onMinYoyChange: (v: string) => void;
    minMom: string;
    onMinMomChange: (v: string) => void;
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

function NumInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
        <Box
            sx={{
                display: 'flex', alignItems: 'center', height: 32, px: 1, width: 96,
                borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--subtle-bg)',
            }}
        >
            <InputBase
                type="number"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                sx={{ fontSize: 12.5, color: 'var(--foreground)', flex: 1 }}
            />
        </Box>
    );
}

export function RevenueFilterBar(props: Props) {
    const { t } = useTranslation('revenue');
    const {
        months, yearMonth, onMonthChange,
        market, onMarketChange, sort, onSortChange,
        newOnly, onNewOnlyChange, minYoy, onMinYoyChange, minMom, onMinMomChange,
        query, onQueryChange,
    } = props;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
            {/* 年月 */}
            <Select
                value={yearMonth ?? ''}
                onChange={(e) => onMonthChange(e.target.value)}
                variant="standard"
                disableUnderline
                sx={{
                    height: 32, px: 1.25, borderRadius: '8px',
                    border: '1px solid var(--card-border)', background: 'var(--subtle-bg)',
                    fontSize: 12.5, fontFamily: 'monospace', color: 'var(--foreground)',
                    '& .MuiSelect-select': { py: 0 },
                }}
            >
                {months.map((m) => (
                    <MenuItem key={m} value={m} sx={{ fontSize: 12.5, fontFamily: 'monospace' }}>{m}</MenuItem>
                ))}
            </Select>

            <Box sx={{ width: 1, height: 22, background: 'var(--card-border)' }} />
            <Segmented<RevenueMarketFilter>
                value={market}
                onChange={onMarketChange}
                options={[
                    { value: 'all', label: t('filter.all') },
                    { value: 'twse', label: t('filter.twse') },
                    { value: 'tpex', label: t('filter.tpex') },
                ]}
            />

            <Box sx={{ width: 1, height: 22, background: 'var(--card-border)' }} />
            <Segmented<RevenueSort>
                value={sort}
                onChange={onSortChange}
                options={[
                    { value: 'first_seen', label: t('sort.new') },
                    { value: 'yoy', label: t('sort.yoy') },
                    { value: 'mom', label: t('sort.mom') },
                    { value: 'revenue', label: t('sort.revenue') },
                ]}
            />

            {/* 僅新申報 */}
            <ButtonBase
                disableRipple
                onClick={() => onNewOnlyChange(!newOnly)}
                sx={{
                    display: 'flex', alignItems: 'center', gap: 0.4, height: 32, px: 1.25,
                    borderRadius: '8px', fontSize: 12.5, fontWeight: newOnly ? 700 : 500,
                    border: '1px solid',
                    borderColor: newOnly ? 'rgba(255,107,107,0.5)' : 'var(--card-border)',
                    background: newOnly ? 'rgba(255,107,107,0.1)' : 'var(--subtle-bg)',
                    color: newOnly ? '#FF6B6B' : 'var(--muted)',
                }}
            >
                <FiberNewIcon sx={{ fontSize: 16 }} />
                {t('filter.newOnly')}
            </ButtonBase>

            <NumInput value={minYoy} onChange={onMinYoyChange} placeholder={t('filter.minYoy')} />
            <NumInput value={minMom} onChange={onMinMomChange} placeholder={t('filter.minMom')} />

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
