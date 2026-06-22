'use client';

/**
 * 當日漲停頁 | /dashboard/daily
 *
 * 版面結構:
 *   1. DailyStatsBar     ── 總漲停 / 上市/上櫃拆解 / 更新時間 / 重新整理
 *   2. DailyFilterBar    ── 日期 + 市場別 + 分類模式 + 搜尋
 *   3. SectorChips       ── 族群篩選 chips
 *   4. DailyTable        ── 主表(點開展開券商區)
 *
 * 日期軸:
 *   - selectedDate=null  ── 今日 live (走 live OpenAPI)
 *   - selectedDate=YYYY-MM-DD ── 歷史(走 DB snapshot;沒有就 404)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, ButtonBase, CircularProgress } from '@mui/material';
import {
    fetchAvailableDates,
    fetchDailyLimitUp,
    triggerBrokerBatchCrawl,
} from '@/services/stockApi';
import type {
    AvailableDatesResponse,
    ClassifyMode,
    DailyLimitUpResponse,
} from '@/types/stock';
import { DailyStatsBar } from '@/components/daily/DailyStatsBar';
import { DailyFilterBar, type MarketFilter } from '@/components/daily/DailyFilterBar';
import { SectorChips } from '@/components/daily/SectorChips';
import { DailyTable } from '@/components/daily/DailyTable';

export default function DailyPage() {
    const [data, setData] = useState<DailyLimitUpResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [market, setMarket] = useState<MarketFilter>('all');
    const [mode, setMode] = useState<ClassifyMode>('base');
    const [sector, setSector] = useState<string | null>(null);
    const [query, setQuery] = useState('');

    // 日期軸:null = 今日 live
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [availability, setAvailability] = useState<AvailableDatesResponse | null>(null);

    // 抓「有 snapshot 的日期」清單 (mount + 手動刷新)
    const loadAvailability = useCallback(async () => {
        try {
            const res = await fetchAvailableDates();
            setAvailability(res);
        } catch (e) {
            console.error('fetchAvailableDates failed', e);
        }
    }, []);

    useEffect(() => { loadAvailability(); }, [loadAvailability]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchDailyLimitUp({
                market,
                ...(selectedDate ? { date: selectedDate } : {}),
            });
            setData(res);
        } catch (e: unknown) {
            // 404 (歷史日期無 snapshot) 顯示友善訊息
            const status = (e as { response?: { status?: number } })?.response?.status;
            if (status === 404) {
                setError(`找不到 ${selectedDate} 的歷史快照`);
                setData(null);
            } else {
                setError(e instanceof Error ? e.message : '載入失敗');
            }
        } finally {
            setLoading(false);
        }
    }, [market, selectedDate]);

    useEffect(() => { load(); }, [load]);

    // 切換分類模式時清掉已選族群(兩套清單不互通)
    useEffect(() => { setSector(null); }, [mode]);

    const sectors = mode === 'base' ? data?.baseSectors ?? [] : data?.subSectors ?? [];

    const filtered = useMemo(() => {
        if (!data) return [];
        const q = query.trim().toLowerCase();
        return data.stocks.filter((s) => {
            if (market !== 'all' && s.market !== market) return false;
            if (sector) {
                const field = mode === 'base' ? s.concept_reason : s.concept;
                if (field !== sector) return false;
            }
            if (q && !(s.code.includes(q) || s.name.toLowerCase().includes(q))) return false;
            return true;
        });
    }, [data, market, sector, mode, query]);

    const todayIso = availability?.today ?? new Date().toISOString().slice(0, 10);
    const isHistory = selectedDate !== null && selectedDate !== todayIso;

    // ── 背景預載分點 ────────────────────────────────────────
    // 進頁時若是 live 模式 + 同個 session 還沒跑過 → 自動觸發 batch-crawl,
    // 讓所有漲停股的分點在背景開始抓。後端 Semaphore(1) 序列化 + dedup,
    // 不會重複打 BSR。當使用者點開股票列時,大機率已是 ok 狀態(瞬間顯示)。
    const [prefetchStatus, setPrefetchStatus] = useState<{
        queued: number; ok: number; pending: number;
    } | null>(null);
    const prefetchTriggered = useRef(false);
    const BROKER_PREFETCH_FLAG = 'taiwan-stock-broker-prefetch-date';

    useEffect(() => {
        if (isHistory || !data || data.stocks.length === 0) return;
        if (prefetchTriggered.current) return;
        // 同個 trade_date + 同個 session 只跑一次
        if (sessionStorage.getItem(BROKER_PREFETCH_FLAG) === data.date) return;

        prefetchTriggered.current = true;
        sessionStorage.setItem(BROKER_PREFETCH_FLAG, data.date);
        triggerBrokerBatchCrawl()
            .then((res) => {
                setPrefetchStatus({
                    queued: res.queued.length,
                    ok: res.skipped_ok.length,
                    pending: res.skipped_pending.length,
                });
            })
            .catch((e) => {
                console.warn('triggerBrokerBatchCrawl failed', e);
            });
    }, [data, isHistory]);

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100vh', background: 'var(--background)' }}>
            <DailyStatsBar
                date={data?.date ?? null}
                updatedAt={data?.updatedAt ?? null}
                total={data?.total ?? 0}
                shown={filtered.length}
                breakdown={data?.breakdown ?? null}
                loading={loading}
                onRefresh={() => { load(); loadAvailability(); }}
                prefetch={prefetchStatus}
            />

            <DailyFilterBar
                market={market} onMarketChange={setMarket}
                mode={mode} onModeChange={setMode}
                query={query} onQueryChange={setQuery}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                availableDates={availability?.dates.map((d) => d.date) ?? []}
                todayIso={todayIso}
            />

            <SectorChips
                mode={mode}
                sectors={sectors}
                selected={sector}
                onSelect={setSector}
                total={data?.total ?? 0}
            />

            {loading && !data ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={28} sx={{ color: 'var(--primary)' }} />
                </Box>
            ) : error ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography sx={{ color: '#FF6B6B', fontSize: 14, mb: 1 }}>{error}</Typography>
                    <ButtonBase
                        onClick={load}
                        sx={{
                            px: 2, py: 0.75, borderRadius: '8px',
                            border: '1px solid var(--primary)',
                            color: 'var(--primary)', fontSize: 13,
                        }}
                    >
                        重試
                    </ButtonBase>
                </Box>
            ) : filtered.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography sx={{ color: 'var(--muted)', fontSize: 14 }}>
                        {isHistory ? '此條件下沒有資料' : '此條件下沒有漲停股'}
                    </Typography>
                </Box>
            ) : (
                <DailyTable
                    stocks={filtered}
                    tradeDate={isHistory ? selectedDate : null}
                />
            )}
        </Box>
    );
}
