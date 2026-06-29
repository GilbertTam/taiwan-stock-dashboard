'use client';

/**
 * 營收頁 | /dashboard/revenue
 *
 * 台股月營收(TWSE/TPEX OpenAPI)。版面:
 *   1. RevenueStatsBar  — 最新月份 / 公布家數 / 今日新申報 / 平均 YoY / 刷新
 *   2. RevenueFilterBar — 年月 / 市場 / 排序 / 僅新申報 / YoY·MoM 門檻 / 搜尋
 *   3. IndustryChips    — 產業別篩選
 *   4. RevenueTable     — 主表(YoY/MoM 紅綠;新申報 badge)
 *
 * 篩選/排序皆由後端處理;前端把參數丟給 /api/revenue/monthly。
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
    fetchMonthlyRevenue,
    fetchMonths,
    fetchIndustries,
} from '@/services/revenueApi';
import type { RevenueListResponse, RevenueSort } from '@/types/revenue';
import { RevenueStatsBar } from '@/components/revenue/RevenueStatsBar';
import { RevenueFilterBar, type RevenueMarketFilter } from '@/components/revenue/RevenueFilterBar';
import { IndustryChips } from '@/components/revenue/IndustryChips';
import { RevenueTable } from '@/components/revenue/RevenueTable';

export default function RevenuePage() {
    const { t } = useTranslation('revenue');

    const [data, setData] = useState<RevenueListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [months, setMonths] = useState<string[]>([]);
    const [industries, setIndustries] = useState<string[]>([]);

    const [yearMonth, setYearMonth] = useState<string | null>(null);
    const [market, setMarket] = useState<RevenueMarketFilter>('all');
    const [sort, setSort] = useState<RevenueSort>('first_seen');
    const [newOnly, setNewOnly] = useState(false);
    const [minYoy, setMinYoy] = useState('');
    const [minMom, setMinMom] = useState('');
    const [query, setQuery] = useState('');
    const [industry, setIndustry] = useState<string | null>(null);

    // mount:抓可選年月 + 產業別
    useEffect(() => {
        fetchMonths().then((r) => {
            setMonths(r.months);
            if (r.months.length > 0) setYearMonth((cur) => cur ?? r.months[0]);
        }).catch(() => {});
        fetchIndustries().then((r) => setIndustries(r.industries)).catch(() => {});
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchMonthlyRevenue({
                market,
                year_month: yearMonth ?? undefined,
                industry: industry ?? undefined,
                min_yoy: minYoy.trim() !== '' ? Number(minYoy) : undefined,
                min_mom: minMom.trim() !== '' ? Number(minMom) : undefined,
                new_only: newOnly,
                query: query.trim() || undefined,
                sort,
            });
            setData(res);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : t('page.error'));
        } finally {
            setLoading(false);
        }
    }, [market, yearMonth, industry, minYoy, minMom, newOnly, query, sort, t]);

    // 篩選變動 → 重抓(搜尋與門檻輸入 debounce 300ms)
    useEffect(() => {
        const id = setTimeout(load, 300);
        return () => clearTimeout(id);
    }, [load]);

    const items = data?.items ?? [];

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100vh', background: 'var(--background)' }}>
            <RevenueStatsBar
                yearMonth={data?.year_month ?? yearMonth}
                summary={data?.summary ?? null}
                shown={items.length}
                loading={loading}
                onRefresh={load}
            />

            <RevenueFilterBar
                months={months}
                yearMonth={yearMonth}
                onMonthChange={setYearMonth}
                market={market}
                onMarketChange={setMarket}
                sort={sort}
                onSortChange={setSort}
                newOnly={newOnly}
                onNewOnlyChange={setNewOnly}
                minYoy={minYoy}
                onMinYoyChange={setMinYoy}
                minMom={minMom}
                onMinMomChange={setMinMom}
                query={query}
                onQueryChange={setQuery}
            />

            <IndustryChips
                industries={industries}
                selected={industry}
                onSelect={setIndustry}
            />

            {loading && !data ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={28} sx={{ color: 'var(--primary)' }} />
                </Box>
            ) : error ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography sx={{ color: '#FF6B6B', fontSize: 14 }}>{error}</Typography>
                </Box>
            ) : items.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography sx={{ color: 'var(--muted)', fontSize: 14 }}>{t('page.empty')}</Typography>
                </Box>
            ) : (
                <RevenueTable items={items} />
            )}
        </Box>
    );
}
