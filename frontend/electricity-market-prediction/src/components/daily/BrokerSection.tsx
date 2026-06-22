'use client';

/**
 * 展開券商區（點擊股票列後出現）。版面三面板（參考 chengwaye/daily）：
 *   1. 法人三大籌碼   ── 直接用 stock 上已有的外資/投信/自營
 *   2. 券商買賣超    ── 從 /api/stock/daily/brokers/{code} 抓的 buyTop/sellTop
 *   3. 主力動向泡泡圖  ── 暫為占位（buyTop/sellTop 都接好後可實作 Chart.js 泡泡）
 *
 * 三狀態 UI（對應後端 BrokerSnapshotResponse.status）：
 *   - pending → 顯示「分點資料抓取中（10–60s）」+ 進度條動畫；每 5s 輪詢一次，
 *               最多 36 次（3 分鐘）後停止輪詢並顯示「請稍候稍久再試」
 *   - ok      → 顯示 buyTop/sellTop（含買進/賣出均價）
 *   - failed  → 顯示錯誤 + 「重新抓取」按鈕（呼叫 refresh endpoint）
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, ButtonBase, LinearProgress } from '@mui/material';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { DailyStock, BrokerSnapshotResponse, BrokerEntryOut } from '@/types/stock';
import { netColor, formatLots } from '@/utils/twseColor';
import { fetchBrokers, refreshBrokers } from '@/services/stockApi';
import { BrokerBubbleChart } from './BrokerBubbleChart';

const POLL_INTERVAL_MS = 5000;
// 後端單檔最壞 ~4 分鐘 (CRAWL_TIMEOUT_S=240) + 緩衝 → 5 分鐘(60 次)
const POLL_MAX_TRIES = 60;

function PanelHeading({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            sx={{
                fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: 1, mb: 0.75,
            }}
        >
            {children}
        </Typography>
    );
}

function InstitutionalPanel({ stock }: { stock: DailyStock }) {
    const items: [string, number][] = [
        ['外資', stock.foreign],
        ['投信', stock.trust],
        ['自營商', stock.dealer],
    ];
    return (
        <Box>
            <PanelHeading>法人三大籌碼（張）</PanelHeading>
            <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
                {items.map(([label, v]) => (
                    <Box key={label} sx={{ display: 'flex', flexDirection: 'column', minWidth: 64 }}>
                        <Typography sx={{ fontSize: 11, color: 'var(--muted)' }}>{label}</Typography>
                        <Typography sx={{ fontSize: 18, fontWeight: 700, color: netColor(v) }}>
                            {formatLots(v)}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

function BrokerLine({ b, side }: { b: BrokerEntryOut; side: 'buy' | 'sell' }) {
    const lots = side === 'buy' ? b.buy : b.sell;
    const avg = side === 'buy' ? b.buy_avg : b.sell_avg;
    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 1, py: 0.25, fontSize: 12 }}>
            <Box sx={{ color: 'var(--foreground)' }}>
                <Box component="span" sx={{ color: 'var(--muted)', mr: 0.5, fontFamily: 'monospace', fontSize: 10.5 }}>
                    {b.broker_code}
                </Box>
                {b.broker_name}
            </Box>
            <Box sx={{ color: netColor(b.net), fontWeight: 600, textAlign: 'right' }}>
                {formatLots(b.net)}
            </Box>
            <Box sx={{ color: 'var(--muted)', fontSize: 11, textAlign: 'right', minWidth: 36 }}>
                {avg ? `@${avg.toFixed(2)}` : ''}
            </Box>
        </Box>
    );
}

function BrokerListPanel({ snap, loading }: { snap: BrokerSnapshotResponse | null; loading: boolean }) {
    const renderList = (title: string, rows: BrokerEntryOut[], side: 'buy' | 'sell') => (
        <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)', mb: 0.5 }}>
                {title}
            </Typography>
            {rows.length === 0
                ? <Typography sx={{ fontSize: 12, color: 'var(--muted)' }}>—</Typography>
                : rows.map((b) => <BrokerLine key={b.broker_code} b={b} side={side} />)
            }
        </Box>
    );
    return (
        <Box>
            <PanelHeading>券商買賣超</PanelHeading>
            {loading
                ? <Typography sx={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>讀取中…</Typography>
                : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                        {renderList('買超 Top15', snap?.buyTop ?? [], 'buy')}
                        {renderList('賣超 Top15', snap?.sellTop ?? [], 'sell')}
                    </Box>
                )
            }
        </Box>
    );
}

function BubblePanel({ snap }: { snap: BrokerSnapshotResponse | null }) {
    const entries = snap?.all ?? [];
    const ready = entries.length > 0;
    return (
        <Box>
            <PanelHeading>主力動向泡泡圖</PanelHeading>
            {ready ? (
                <BrokerBubbleChart entries={entries} />
            ) : (
                <Box
                    sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        minHeight: 160, borderRadius: 2,
                        border: '1px dashed var(--card-border)',
                        background: 'rgba(255,255,255,0.02)',
                        color: 'var(--muted)', fontSize: 12, textAlign: 'center', px: 2,
                    }}
                >
                    <Box>
                        <BubbleChartIcon sx={{ fontSize: 24, opacity: 0.6, mb: 0.5 }} />
                        <Typography sx={{ fontSize: 12 }}>待分點資料抓取完成</Typography>
                    </Box>
                </Box>
            )}
        </Box>
    );
}

function StatusBanner({
    snap, loading, polling, pollCount, pollMax, onRefresh,
}: {
    snap: BrokerSnapshotResponse | null;
    loading: boolean;
    polling: boolean;
    pollCount: number;
    pollMax: number;
    onRefresh: () => void;
}) {
    if (!snap) return null;
    if (snap.status === 'pending') {
        const exhausted = !polling && pollCount >= pollMax;
        return (
            <Box sx={{ gridColumn: '1 / -1', mb: 1 }}>
                <Typography sx={{ fontSize: 12, color: 'var(--muted)', mb: 0.5 }}>
                    分點資料抓取中(BSR 站含驗證碼,單檔通常 10-90 秒)
                    {polling && ` … 自動更新中 (${pollCount}/${pollMax})`}
                    {exhausted && ' … 已超過 5 分鐘仍未完成,可按重新抓取'}
                </Typography>
                <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
                {exhausted && (
                    <Box sx={{ mt: 1 }}>
                        <ButtonBase
                            onClick={onRefresh}
                            disabled={loading}
                            sx={{
                                px: 1.25, py: 0.5, borderRadius: '6px',
                                border: '1px solid var(--primary)',
                                color: 'var(--primary)', fontSize: 11,
                                display: 'inline-flex', alignItems: 'center', gap: 0.5,
                            }}
                        >
                            <RefreshIcon sx={{ fontSize: 13 }} /> 重新抓取
                        </ButtonBase>
                    </Box>
                )}
            </Box>
        );
    }
    if (snap.status === 'failed') {
        return (
            <Box sx={{ gridColumn: '1 / -1', mb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: 12, color: '#FF6B6B' }}>
                    分點資料抓取失敗{snap.error ? `:${snap.error}` : ''}
                </Typography>
                <ButtonBase
                    onClick={onRefresh}
                    disabled={loading}
                    sx={{
                        px: 1.25, py: 0.5, borderRadius: '6px',
                        border: '1px solid var(--primary)',
                        color: 'var(--primary)', fontSize: 11,
                        display: 'flex', alignItems: 'center', gap: 0.5,
                    }}
                >
                    <RefreshIcon sx={{ fontSize: 13 }} /> 重新抓取
                </ButtonBase>
            </Box>
        );
    }
    return null;
}

export function BrokerSection({
    stock,
    tradeDate,
}: {
    stock: DailyStock;
    /** 歷史日期(YYYY-MM-DD)→ 走 ?date= 查 DB,不主動觸發抓取;null = 今日 live */
    tradeDate?: string | null;
}) {
    const [snap, setSnap] = useState<BrokerSnapshotResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [polling, setPolling] = useState(false);
    const [pollCountState, setPollCountState] = useState(0);
    const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pollCount = useRef(0);
    const isHistory = !!tradeDate;

    const clearPoll = () => {
        if (pollTimer.current) {
            clearTimeout(pollTimer.current);
            pollTimer.current = null;
        }
        setPolling(false);
    };

    const load = useCallback(async (isPoll = false) => {
        if (!isPoll) setLoading(true);
        try {
            const res = await fetchBrokers(stock.code, tradeDate ?? undefined);
            setSnap(res);
            // 歷史模式不輪詢(backend 不會主動爬)
            if (!isHistory && res.status === 'pending') {
                if (pollCount.current < POLL_MAX_TRIES) {
                    pollCount.current += 1;
                    setPollCountState(pollCount.current);
                    setPolling(true);
                    pollTimer.current = setTimeout(() => load(true), POLL_INTERVAL_MS);
                } else {
                    clearPoll();
                }
            } else {
                clearPoll();
                pollCount.current = 0;
                setPollCountState(0);
            }
        } catch (e) {
            console.error('fetchBrokers failed', e);
            clearPoll();
        } finally {
            if (!isPoll) setLoading(false);
        }
    }, [stock.code, tradeDate, isHistory]);

    useEffect(() => {
        pollCount.current = 0;
        setPollCountState(0);
        load();
        return () => clearPoll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stock.code, tradeDate]);

    const onRefresh = useCallback(async () => {
        // 歷史模式不允許重抓 — BSR 站只有今日資料
        if (isHistory) return;
        setLoading(true);
        try {
            const res = await refreshBrokers(stock.code);
            setSnap(res);
            pollCount.current = 0;
            setPollCountState(0);
            if (res.status === 'pending') {
                setPolling(true);
                pollTimer.current = setTimeout(() => load(true), POLL_INTERVAL_MS);
            }
        } catch (e) {
            console.error('refreshBrokers failed', e);
        } finally {
            setLoading(false);
        }
    }, [stock.code, load, isHistory]);

    return (
        <Box
            sx={{
                p: 2,
                background: 'var(--subtle-bg)',
                borderTop: '1px solid var(--card-border)',
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr 1fr' },
                gap: 3,
            }}
        >
            <StatusBanner
                snap={snap}
                loading={loading}
                polling={polling}
                pollCount={pollCountState}
                pollMax={POLL_MAX_TRIES}
                onRefresh={onRefresh}
            />
            <InstitutionalPanel stock={stock} />
            <BrokerListPanel snap={snap} loading={loading && !snap} />
            <BubblePanel snap={snap} />
        </Box>
    );
}
