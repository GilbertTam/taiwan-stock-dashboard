'use client';

/**
 * 篩選列:日期 / 市場別 / 分類模式(基礎分類 ↔ 子產業)/ 搜尋。
 *
 * 日期:
 *   - 預設今日(live 抓取)
 *   - DatePicker shouldDisableDate 反灰沒有 snapshot 的日期(今日永遠可選)
 *   - 選非今日 → 走 /api/stock/daily/limit-up?date=...
 */

import React, { useMemo } from 'react';
import { Box, ButtonBase, InputBase, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { format, parseISO, startOfDay, subYears } from 'date-fns';
import type { ClassifyMode, Market } from '@/types/stock';

export type MarketFilter = Market | 'all';

interface Props {
    market: MarketFilter;
    onMarketChange: (m: MarketFilter) => void;
    mode: ClassifyMode;
    onModeChange: (m: ClassifyMode) => void;
    query: string;
    onQueryChange: (q: string) => void;

    /** 選擇的日期 (YYYY-MM-DD);null = 今日 live */
    selectedDate: string | null;
    onDateChange: (date: string | null) => void;
    /** 後端回的「有 snapshot 的日期」清單 (YYYY-MM-DD) */
    availableDates: string[];
    /** 後端認定的今日 (YYYY-MM-DD) */
    todayIso: string;
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

export function DailyFilterBar({
    market, onMarketChange,
    mode, onModeChange,
    query, onQueryChange,
    selectedDate, onDateChange,
    availableDates, todayIso,
}: Props) {
    const availableSet = useMemo(() => new Set(availableDates), [availableDates]);
    const todayDate = useMemo(() => parseISO(todayIso), [todayIso]);
    const minDate = useMemo(() => subYears(todayDate, 2), [todayDate]);

    const pickerValue = selectedDate ? parseISO(selectedDate) : todayDate;

    const shouldDisableDate = (d: Date): boolean => {
        const iso = format(startOfDay(d), 'yyyy-MM-dd');
        // 今日永遠可選 (走 live)
        if (iso === todayIso) return false;
        return !availableSet.has(iso);
    };

    const handleChange = (d: Date | null) => {
        if (d === null) {
            onDateChange(null);
            return;
        }
        const iso = format(startOfDay(d), 'yyyy-MM-dd');
        // 選到今日 → 用 null 代表 live(後端不傳 date param)
        onDateChange(iso === todayIso ? null : iso);
    };

    const isLive = selectedDate === null || selectedDate === todayIso;
    const histCount = availableDates.length;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Tooltip
                    title={
                        histCount === 0
                            ? '尚無歷史 snapshot;今日資料為即時抓取'
                            : `有 ${histCount} 天歷史快照可選`
                    }
                    placement="bottom-start"
                >
                    <Box
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 0.5,
                            height: 32, px: 1, borderRadius: '8px',
                            border: '1px solid',
                            borderColor: isLive ? 'rgba(0,204,122,0.4)' : 'var(--card-border)',
                            background: isLive ? 'rgba(0,204,122,0.08)' : 'var(--subtle-bg)',
                        }}
                    >
                        <CalendarTodayIcon
                            sx={{ fontSize: 14, color: isLive ? 'var(--primary)' : 'var(--muted)' }}
                        />
                        <DatePicker
                            value={pickerValue}
                            onChange={handleChange}
                            shouldDisableDate={shouldDisableDate}
                            minDate={minDate}
                            maxDate={todayDate}
                            format="yyyy-MM-dd"
                            slotProps={{
                                textField: {
                                    variant: 'standard',
                                    size: 'small',
                                    InputProps: { disableUnderline: true },
                                    sx: {
                                        width: 108,
                                        '& input': {
                                            fontSize: 12.5,
                                            fontFamily: 'monospace',
                                            color: isLive ? 'var(--primary)' : 'var(--foreground)',
                                            fontWeight: isLive ? 700 : 500,
                                            padding: 0,
                                        },
                                    },
                                },
                                day: {
                                    sx: {
                                        '&.Mui-disabled': { color: 'var(--muted)', opacity: 0.35 },
                                    },
                                },
                            }}
                        />
                        {isLive && (
                            <Box
                                component="span"
                                sx={{
                                    fontSize: 9.5, fontWeight: 700,
                                    px: 0.625, py: 0.125, borderRadius: '4px',
                                    background: 'var(--primary)', color: '#000',
                                    letterSpacing: 0.5,
                                }}
                            >
                                LIVE
                            </Box>
                        )}
                    </Box>
                </Tooltip>
            </LocalizationProvider>
            <Box sx={{ width: 1, height: 22, background: 'var(--card-border)' }} />
            <Segmented<MarketFilter>
                value={market}
                onChange={onMarketChange}
                options={[
                    { value: 'all', label: '全部' },
                    { value: 'twse', label: '上市' },
                    { value: 'tpex', label: '上櫃' },
                ]}
            />
            <Box sx={{ width: 1, height: 22, background: 'var(--card-border)' }} />
            <Segmented<ClassifyMode>
                value={mode}
                onChange={onModeChange}
                options={[
                    { value: 'base', label: '基礎分類' },
                    { value: 'sub', label: '子產業細分' },
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
                    placeholder="搜尋代號 / 名稱"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    sx={{ fontSize: 13, color: 'var(--foreground)', flex: 1 }}
                />
            </Box>
        </Box>
    );
}
