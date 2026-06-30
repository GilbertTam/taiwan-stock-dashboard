'use client';

/**
 * 庫藏股頁 | /dashboard/repurchase
 *
 * 台股庫藏股買回(MOPS t35sc09)。版面:
 *   1. TreasuryStatsBar  — 執行中 / 新公告 / 完成 計數 / 刷新
 *   2. TreasuryFilterBar — 狀態(執行中+新公告 預設) / 市場 / 搜尋
 *   3. TreasuryTable     — 主表(狀態 badge;新公告紅)
 *
 * 篩選由後端處理;前端把參數丟給 /api/treasury/list。
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { fetchTreasury } from '@/services/treasuryApi';
import type { TreasuryListResponse, TreasuryStatusFilter } from '@/types/treasury';
import { TreasuryStatsBar } from '@/components/treasury/TreasuryStatsBar';
import { TreasuryFilterBar, type TreasuryMarketFilter } from '@/components/treasury/TreasuryFilterBar';
import { TreasuryTable } from '@/components/treasury/TreasuryTable';

export default function RepurchasePage() {
    const { t } = useTranslation('treasury');

    const [data, setData] = useState<TreasuryListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [status, setStatus] = useState<TreasuryStatusFilter>('active');
    const [market, setMarket] = useState<TreasuryMarketFilter>('all');
    const [query, setQuery] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchTreasury({
                status,
                market,
                query: query.trim() || undefined,
            });
            setData(res);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : t('page.error'));
        } finally {
            setLoading(false);
        }
    }, [status, market, query, t]);

    useEffect(() => {
        const id = setTimeout(load, 300);
        return () => clearTimeout(id);
    }, [load]);

    const items = data?.items ?? [];

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100vh', background: 'var(--background)' }}>
            <TreasuryStatsBar
                summary={data?.summary ?? null}
                shown={items.length}
                loading={loading}
                onRefresh={load}
            />

            <TreasuryFilterBar
                status={status}
                onStatusChange={setStatus}
                market={market}
                onMarketChange={setMarket}
                query={query}
                onQueryChange={setQuery}
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
                <TreasuryTable items={items} />
            )}
        </Box>
    );
}
