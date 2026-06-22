'use client';

/**
 * 主力動向泡泡圖 — 純 SVG 自繪(不引 echarts/recharts)。
 *
 * 軸:
 *   X = 買進均價 (buy_avg)
 *   Y = 賣出均價 (sell_avg)
 * 視覺編碼:
 *   bubble 面積 ∝ |net|(張數)
 *   bubble 顏色 = 紅(net > 0,淨買)/ 綠(net < 0,淨賣)
 * 對角線 y=x:
 *   點在線「上方」  → 賣均 > 買均 → 出價差賺到 (profit zone)
 *   點在線「下方」  → 賣均 < 買均 → 倒賠價差     (loss zone)
 *
 * 取 |net| top 30 以避免過於密集;hover 顯示券商明細。
 */

import React, { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { BrokerEntryOut } from '@/types/stock';
import { netColor, formatLots } from '@/utils/twseColor';

interface Props {
    entries: BrokerEntryOut[];
    /** 最多顯示前 N 名(以 |net| 排序),其餘略過避免過密 */
    topN?: number;
}

// SVG 內部座標(viewBox);實際輸出大小由 CSS 控制
const W = 520;
const H = 280;
const PAD_L = 50;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 36;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

// 泡泡半徑範圍 — 用 sqrt 縮放確保「面積」正比 |net|
const R_MIN = 4;
const R_MAX = 18;

export function BrokerBubbleChart({ entries, topN = 30 }: Props) {
    // 1. 過濾出可繪的點(三個必填欄位都有 + net != 0)
    const valid = useMemo(
        () => entries.filter(
            (e) => e.buy_avg != null && e.sell_avg != null && e.buy_avg > 0 && e.sell_avg > 0 && e.net !== 0,
        ),
        [entries],
    );
    const top = useMemo(
        () => [...valid].sort((a, b) => Math.abs(b.net) - Math.abs(a.net)).slice(0, topN),
        [valid, topN],
    );

    // 2. 算座標尺度(加 8% padding)
    const scale = useMemo(() => {
        if (top.length === 0) return null;
        const prices = top.flatMap((e) => [e.buy_avg!, e.sell_avg!]);
        const lo = Math.min(...prices);
        const hi = Math.max(...prices);
        const pad = (hi - lo) * 0.08 || Math.max(0.5, lo * 0.02);
        const min = lo - pad;
        const max = hi + pad;
        const maxNet = Math.max(...top.map((e) => Math.abs(e.net)));
        return { min, max, maxNet };
    }, [top]);

    const [hoverCode, setHoverCode] = useState<string | null>(null);
    const hover = useMemo(
        () => (hoverCode ? top.find((e) => e.broker_code === hoverCode) ?? null : null),
        [hoverCode, top],
    );

    if (top.length === 0 || !scale) {
        return (
            <Box
                sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: 160, borderRadius: 2,
                    border: '1px dashed var(--card-border)',
                    background: 'rgba(255,255,255,0.02)',
                    color: 'var(--muted)', fontSize: 12, textAlign: 'center', px: 2,
                }}
            >
                沒有足夠資料繪製泡泡圖
            </Box>
        );
    }

    const { min, max, maxNet } = scale;
    const xOf = (price: number) => PAD_L + ((price - min) / (max - min)) * PLOT_W;
    const yOf = (price: number) => PAD_T + (1 - (price - min) / (max - min)) * PLOT_H;
    const rOf = (net: number) =>
        Math.max(R_MIN, Math.sqrt(Math.abs(net) / maxNet) * R_MAX);

    // 4 個刻度
    const ticks = Array.from({ length: 4 }, (_, i) => {
        const v = min + (max - min) * (i / 3);
        return { v, x: xOf(v), y: yOf(v) };
    });

    return (
        <Box sx={{ position: 'relative' }}>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                style={{ width: '100%', height: 'auto', display: 'block' }}
            >
                {/* 賺/虧區的淡背景 */}
                <polygon
                    points={`${PAD_L},${PAD_T} ${W - PAD_R},${PAD_T} ${W - PAD_R},${H - PAD_B}`}
                    fill="#FF4444"
                    fillOpacity={0.04}
                />
                <polygon
                    points={`${PAD_L},${PAD_T} ${PAD_L},${H - PAD_B} ${W - PAD_R},${H - PAD_B}`}
                    fill="#22C55E"
                    fillOpacity={0.04}
                />

                {/* 對角線 y=x 與標籤 */}
                <line
                    x1={xOf(min)} y1={yOf(min)}
                    x2={xOf(max)} y2={yOf(max)}
                    stroke="var(--muted)"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                />
                <text
                    x={W - PAD_R - 4} y={PAD_T + 11}
                    fontSize="9" fill="#FF4444" textAnchor="end" opacity={0.7}
                >
                    賺價差
                </text>
                <text
                    x={PAD_L + 4} y={H - PAD_B - 4}
                    fontSize="9" fill="#22C55E" opacity={0.7}
                >
                    倒賠價差
                </text>

                {/* 軸框 */}
                <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="var(--card-border)" />
                <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--card-border)" />

                {/* 刻度 + 格線 */}
                {ticks.map((t, i) => (
                    <g key={i}>
                        {/* x tick */}
                        <line
                            x1={t.x} y1={H - PAD_B}
                            x2={t.x} y2={H - PAD_B + 3}
                            stroke="var(--card-border)"
                        />
                        <text
                            x={t.x} y={H - PAD_B + 14}
                            fontSize="9" fill="var(--muted)" textAnchor="middle"
                        >
                            {t.v.toFixed(t.v < 100 ? 2 : 1)}
                        </text>
                        {/* y tick */}
                        <line
                            x1={PAD_L - 3} y1={t.y}
                            x2={PAD_L} y2={t.y}
                            stroke="var(--card-border)"
                        />
                        <text
                            x={PAD_L - 6} y={t.y + 3}
                            fontSize="9" fill="var(--muted)" textAnchor="end"
                        >
                            {t.v.toFixed(t.v < 100 ? 2 : 1)}
                        </text>
                        {/* 淡格線 */}
                        {i > 0 && i < 3 && (
                            <>
                                <line
                                    x1={t.x} y1={PAD_T} x2={t.x} y2={H - PAD_B}
                                    stroke="var(--card-border)" strokeOpacity={0.25}
                                />
                                <line
                                    x1={PAD_L} y1={t.y} x2={W - PAD_R} y2={t.y}
                                    stroke="var(--card-border)" strokeOpacity={0.25}
                                />
                            </>
                        )}
                    </g>
                ))}

                {/* bubbles */}
                {top.map((e) => {
                    const cx = xOf(e.buy_avg!);
                    const cy = yOf(e.sell_avg!);
                    const r = rOf(e.net);
                    const color = netColor(e.net);
                    const isHover = hoverCode === e.broker_code;
                    return (
                        <circle
                            key={e.broker_code}
                            cx={cx} cy={cy} r={r}
                            fill={color}
                            fillOpacity={isHover ? 0.85 : 0.4}
                            stroke={color}
                            strokeWidth={isHover ? 2 : 1}
                            onMouseEnter={() => setHoverCode(e.broker_code)}
                            onMouseLeave={() => setHoverCode(null)}
                            style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s, stroke-width 0.15s' }}
                        />
                    );
                })}

                {/* 軸標籤 */}
                <text
                    x={PAD_L + PLOT_W / 2} y={H - 6}
                    fontSize="10" fill="var(--muted)" textAnchor="middle"
                >
                    買進均價
                </text>
                <text
                    x={14} y={PAD_T + PLOT_H / 2}
                    fontSize="10" fill="var(--muted)" textAnchor="middle"
                    transform={`rotate(-90 14 ${PAD_T + PLOT_H / 2})`}
                >
                    賣出均價
                </text>
            </svg>

            {/* Hover tooltip */}
            {hover && (
                <Box
                    sx={{
                        position: 'absolute', top: 8, right: 8,
                        p: 1, minWidth: 132,
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 1,
                        fontSize: 11,
                        pointerEvents: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                        <Box sx={{ fontFamily: 'monospace', color: 'var(--muted)', fontSize: 10 }}>
                            {hover.broker_code}
                        </Box>
                        {hover.rank_in_buy != null && (
                            <Box sx={{ color: '#FF4444', fontSize: 9 }}>買 #{hover.rank_in_buy}</Box>
                        )}
                        {hover.rank_in_sell != null && (
                            <Box sx={{ color: '#22C55E', fontSize: 9 }}>賣 #{hover.rank_in_sell}</Box>
                        )}
                    </Box>
                    <Box sx={{ fontWeight: 700, mb: 0.5, color: 'var(--foreground)' }}>
                        {hover.broker_name}
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 1, rowGap: 0.25 }}>
                        <Box sx={{ color: 'var(--muted)' }}>淨</Box>
                        <Box sx={{ color: netColor(hover.net), fontWeight: 600, textAlign: 'right' }}>
                            {formatLots(hover.net)} 張
                        </Box>
                        <Box sx={{ color: 'var(--muted)' }}>買均</Box>
                        <Box sx={{ fontFamily: 'monospace', textAlign: 'right' }}>
                            {hover.buy_avg?.toFixed(2)}
                        </Box>
                        <Box sx={{ color: 'var(--muted)' }}>賣均</Box>
                        <Box sx={{ fontFamily: 'monospace', textAlign: 'right' }}>
                            {hover.sell_avg?.toFixed(2)}
                        </Box>
                    </Box>
                </Box>
            )}

            {/* Legend */}
            <Box
                sx={{
                    mt: 0.5,
                    display: 'flex', flexWrap: 'wrap',
                    gap: 1.5,
                    fontSize: 10.5,
                    color: 'var(--muted)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#FF4444' }} />
                    淨買超
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
                    淨賣超
                </Box>
                <Box>圓越大 = 量越大</Box>
                <Box sx={{ ml: 'auto' }}>
                    顯示 {top.length} / {valid.length} 檔
                </Box>
            </Box>
        </Box>
    );
}
