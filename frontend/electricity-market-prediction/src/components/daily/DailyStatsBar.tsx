'use client';

/**
 * 漲停頁標頭 — 顯示日期、當日漲停數、上市/上櫃拆解、更新時間、重新整理。
 * 排版參考 chengwaye/daily 的頁頂統計列；視覺沿用專案的 CSS variables。
 */

import React from 'react';
import { Box, Typography, ButtonBase, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import type { MarketBreakdown } from '@/types/stock';

interface Props {
    date: string | null;
    updatedAt: string | null;
    total: number;
    shown: number;
    breakdown: MarketBreakdown | null;
    loading?: boolean;
    onRefresh: () => void;
    /** 背景預載 broker 進度;null = 未觸發 */
    prefetch?: { queued: number; ok: number; pending: number } | null;
}

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 64 }}>
            <Typography sx={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.2 }}>{label}</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: color ?? 'var(--foreground)', lineHeight: 1.2 }}>
                {value}
            </Typography>
        </Box>
    );
}

export function DailyStatsBar({ date, updatedAt, total, shown, breakdown, loading, onRefresh, prefetch }: Props) {
    const formattedTime = updatedAt
        ? new Date(updatedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
        : '—';
    const prefetchText = prefetch
        ? prefetch.queued > 0
            ? `背景預載分點 ${prefetch.queued} 檔(已快取 ${prefetch.ok} / 抓取中 ${prefetch.pending})`
            : `分點快取已就緒(${prefetch.ok} 檔)`
        : null;
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                mb: 2,
                borderRadius: 2,
                border: '1px solid var(--card-border)',
                background: 'var(--card-bg)',
                backdropFilter: 'blur(12px)',
                flexWrap: 'wrap',
                gap: 2,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                    sx={{
                        width: 36, height: 36, borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(127,29,29,0.25)',
                    }}
                >
                    <TrendingUpIcon sx={{ color: '#FF6B6B', fontSize: 20 }} />
                </Box>
                <Box>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.1 }}>
                        當日漲停
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.1 }}>
                        {date ?? '—'}　更新 {formattedTime}
                    </Typography>
                    {prefetchText && (
                        <Typography
                            sx={{
                                fontSize: 11, color: 'var(--primary)',
                                lineHeight: 1.2, mt: 0.5, fontWeight: 600,
                            }}
                        >
                            {prefetchText}
                        </Typography>
                    )}
                </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Stat label="總漲停" value={`${total}`} color="#FF6B6B" />
                <Stat label="上市" value={`${breakdown?.twse ?? 0}`} />
                <Stat label="上櫃" value={`${breakdown?.tpex ?? 0}`} />
                <Stat label="當前顯示" value={`${shown}`} color="var(--primary)" />
                <ButtonBase
                    onClick={onRefresh}
                    disabled={loading}
                    sx={{
                        p: 1, borderRadius: '8px',
                        color: 'var(--muted)',
                        '&:hover': { color: 'var(--primary)', background: 'var(--hover-bg)' },
                    }}
                >
                    {loading
                        ? <CircularProgress size={16} sx={{ color: 'var(--primary)' }} />
                        : <RefreshIcon sx={{ fontSize: 18 }} />}
                </ButtonBase>
            </Box>
        </Box>
    );
}
