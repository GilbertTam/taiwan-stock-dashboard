'use client';

/**
 * 個股歷史營收展開面板 — 點代號後顯示。
 *   1. 直方圖(近 24 月,inline bar,無圖表相依):highlight 最新月
 *   2. 歷史表:年月 / 營收(百萬) / MoM% / YoY%(紅綠);預設 12 筆 + 顯示全部
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, ButtonBase, CircularProgress, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { fetchRevenueHistory } from '@/services/revenueApi';
import type { RevenueHistoryPoint } from '@/types/revenue';
import { fmtMillion, fmtPct, pctColor } from './revenueFormat';

interface Props {
    code: string;
    name: string;
}

const BAR_MAX = 24;        // 直方圖顯示月數
const HIGHLIGHT = '#FF9800';

function HistoryChart({ points }: { points: RevenueHistoryPoint[] }) {
    const data = points.slice(-BAR_MAX);
    const max = Math.max(1, ...data.map((p) => p.revenue ?? 0));

    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 110, px: 0.5, mb: 0.5 }}>
            {data.map((p, i) => {
                const isLast = i === data.length - 1;
                const h = Math.max(2, ((p.revenue ?? 0) / max) * 96);
                const [yy, mm] = p.year_month.split('-');
                const showYear = mm === '01' || i === 0;
                return (
                    <Box key={p.year_month} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
                        <Tooltip arrow title={`${p.year_month}　${fmtMillion(p.revenue)} 百萬`}>
                            <Box
                                sx={{
                                    width: '100%', height: `${h}px`, borderRadius: '2px 2px 0 0',
                                    background: isLast ? HIGHLIGHT : 'var(--muted)',
                                    opacity: isLast ? 1 : 0.45,
                                    transition: 'opacity 0.15s',
                                    '&:hover': { opacity: 1 },
                                }}
                            />
                        </Tooltip>
                        <Typography sx={{ fontSize: 8.5, color: showYear ? 'var(--foreground)' : 'var(--muted)', fontWeight: showYear ? 700 : 400, mt: 0.25, lineHeight: 1 }}>
                            {showYear ? yy : String(Number(mm))}
                        </Typography>
                    </Box>
                );
            })}
        </Box>
    );
}

export function RevenueHistoryPanel({ code, name }: Props) {
    const { t } = useTranslation('revenue');
    const [points, setPoints] = useState<RevenueHistoryPoint[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError(false);
        fetchRevenueHistory(code)
            .then((r) => { if (alive) setPoints(r.points); })
            .catch(() => { if (alive) setError(true); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [code]);

    // 歷史表:新到舊
    const tableRows = useMemo(() => {
        const desc = [...(points ?? [])].reverse();
        return showAll ? desc : desc.slice(0, 12);
    }, [points, showAll]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={20} sx={{ color: 'var(--primary)' }} />
            </Box>
        );
    }
    if (error || !points || points.length === 0) {
        return (
            <Box sx={{ py: 2, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 12, color: 'var(--muted)' }}>{t('history.empty')}</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 1.5 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', mb: 1 }}>
                {code} {name} {t('history.title')}
            </Typography>

            <HistoryChart points={points} />

            {/* 歷史表 */}
            <Box sx={{ mt: 1.5, border: '1px solid var(--card-border)', borderRadius: 1, overflow: 'hidden' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 1, px: 1.5, py: 0.75, background: 'var(--subtle-bg)' }}>
                    <Typography sx={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{t('history.month')}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textAlign: 'right' }}>{t('history.revenueM')}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textAlign: 'right' }}>{t('history.mom')}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textAlign: 'right' }}>{t('history.yoy')}</Typography>
                </Box>
                {tableRows.map((p) => (
                    <Box key={p.year_month} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 1, px: 1.5, py: 0.6, borderTop: '1px solid var(--card-border)' }}>
                        <Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--foreground)' }}>{p.year_month}</Typography>
                        <Typography sx={{ fontSize: 12, textAlign: 'right', color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>{fmtMillion(p.revenue)}</Typography>
                        <Typography sx={{ fontSize: 12, textAlign: 'right', fontWeight: 700, color: pctColor(p.mom_pct), fontVariantNumeric: 'tabular-nums' }}>{fmtPct(p.mom_pct)}</Typography>
                        <Typography sx={{ fontSize: 12, textAlign: 'right', fontWeight: 700, color: pctColor(p.yoy_pct), fontVariantNumeric: 'tabular-nums' }}>{fmtPct(p.yoy_pct)}</Typography>
                    </Box>
                ))}
            </Box>

            {points.length > 12 && (
                <ButtonBase
                    onClick={() => setShowAll((v) => !v)}
                    sx={{ mt: 1, fontSize: 12, color: 'var(--primary)', fontWeight: 600, mx: 'auto', display: 'block' }}
                >
                    {showAll ? t('history.collapse') : t('history.showAll', { count: points.length })}
                </ButtonBase>
            )}
        </Box>
    );
}
