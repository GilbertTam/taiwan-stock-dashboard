'use client';

/**
 * 主力動向泡泡圖 — 對稱 X 軸雙泡型(參考 chengwaye/daily 設計)。
 *
 * 軸:
 *   X = 對稱量軸 — 左側 = 賣量(張), 右側 = 買量(張)。
 *       用 sqrt scale 自訂刻度 (0/25/100/500/2000),讓小量也看得到。
 *   Y = 股價(張) — 範圍從 snapshot 的 low/high (再加買賣均價的 outer 範圍)+ padding。
 *
 * 每個 broker 最多兩顆泡泡:
 *   - 買 > 0 → 紅泡 (x=+buy,  y=buy_avg)
 *   - 賣 > 0 → 綠泡 (x=-sell, y=sell_avg)
 * 面積 ∝ 該方向的張數(用 √ 縮放)。
 *
 * Hover 任一顆 → 同一 broker 的另一顆同步亮 + 顯示連線 + tooltip。
 * 取 max(buy, sell) 前 15 大的 broker(其他略過避免擁擠)。
 */

import React, { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { BrokerEntryOut, BrokerSnapshotResponse } from '@/types/stock';
import { formatLots } from '@/utils/twseColor';

interface Props {
    snap: BrokerSnapshotResponse;
    /** 最多顯示前 N 大(以 max(buy, sell) 排序);其餘略過避免過密 */
    topN?: number;
}

const DEFAULT_TOP_N = 15;

// SVG viewBox
const W = 720;
const H = 360;
const PAD_L = 56;
const PAD_R = 18;
const PAD_T = 24;
const PAD_B = 40;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

// 泡泡半徑範圍
const R_MIN = 5;
const R_MAX = 28;

// 對稱 X 軸刻度(張) — 配合 sqrt scale 等距分佈
const X_TICKS = [0, 25, 100, 200, 500, 1000, 2000];

const COLOR_BUY = '#FF4444';
const COLOR_SELL = '#22C55E';
const COLOR_REF = '#FBBF24';

export function BrokerBubbleChart({ snap, topN = DEFAULT_TOP_N }: Props) {
    const entries = snap.all ?? [];

    // 1. 取 max(buy, sell) 前 N 大 — 雙邊泡泡都會畫
    const top = useMemo(() => {
        const valid = entries.filter((e) => (e.buy || 0) + (e.sell || 0) > 0);
        return [...valid]
            .sort((a, b) => Math.max(b.buy, b.sell) - Math.max(a.buy, a.sell))
            .slice(0, topN);
    }, [entries, topN]);

    // 2. Y 軸範圍 — 從 snapshot OHLC 找,再考慮買賣均價
    const yRange = useMemo(() => {
        const candidates: number[] = [];
        if (snap.open != null) candidates.push(snap.open);
        if (snap.high != null) candidates.push(snap.high);
        if (snap.low != null) candidates.push(snap.low);
        if (snap.close != null) candidates.push(snap.close);
        top.forEach((e) => {
            if (e.buy_avg) candidates.push(e.buy_avg);
            if (e.sell_avg) candidates.push(e.sell_avg);
        });
        if (candidates.length === 0) return null;
        const lo = Math.min(...candidates);
        const hi = Math.max(...candidates);
        const pad = (hi - lo) * 0.08 || Math.max(0.5, lo * 0.01);
        return { min: lo - pad, max: hi + pad };
    }, [snap, top]);

    // 3. X 軸 max(用 X_TICKS 最大值 = 2000,但若實際值超過則往上抬)
    const xMax = useMemo(() => {
        const maxVol = Math.max(
            ...top.map((e) => Math.max(e.buy || 0, e.sell || 0)),
            X_TICKS[X_TICKS.length - 1],
        );
        return maxVol;
    }, [top]);

    // 4. 最大量(用於 bubble size 縮放)
    const maxNet = useMemo(
        () => Math.max(...top.flatMap((e) => [e.buy || 0, e.sell || 0]), 1),
        [top],
    );

    const [hoverCode, setHoverCode] = useState<string | null>(null);
    const hover = useMemo(
        () => (hoverCode ? top.find((e) => e.broker_code === hoverCode) ?? null : null),
        [hoverCode, top],
    );

    if (top.length === 0 || !yRange) {
        return (
            <Box
                sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: 200, borderRadius: 2,
                    border: '1px dashed var(--card-border)',
                    background: 'rgba(255,255,255,0.02)',
                    color: 'var(--muted)', fontSize: 12, textAlign: 'center', px: 2,
                }}
            >
                沒有足夠資料繪製泡泡圖
            </Box>
        );
    }

    // sqrt scale,對稱 X:正 = 買(右),負 = 賣(左)
    const sqrtMax = Math.sqrt(xMax);
    const xOf = (signedVolume: number) => {
        const sign = signedVolume >= 0 ? 1 : -1;
        const frac = (sign * Math.sqrt(Math.abs(signedVolume))) / sqrtMax; // -1..+1
        return PAD_L + PLOT_W / 2 + (frac * PLOT_W) / 2;
    };
    const yOf = (price: number) =>
        PAD_T + (1 - (price - yRange.min) / (yRange.max - yRange.min)) * PLOT_H;
    const rOf = (vol: number) =>
        vol > 0 ? Math.max(R_MIN, Math.sqrt(vol / maxNet) * R_MAX) : 0;

    // Y 軸刻度 — 6 段
    const yTicks = Array.from({ length: 6 }, (_, i) => {
        const v = yRange.min + ((yRange.max - yRange.min) * i) / 5;
        return { v, y: yOf(v) };
    });

    // 漲停參考線(收盤即為漲停價,因該股當日為漲停股)
    const closeY = snap.close != null ? yOf(snap.close) : null;

    return (
        <Box sx={{ position: 'relative' }}>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                style={{ width: '100%', height: 'auto', display: 'block' }}
            >
                {/* 中軸 (X=0) — 左右分隔 */}
                <line
                    x1={xOf(0)} y1={PAD_T}
                    x2={xOf(0)} y2={H - PAD_B}
                    stroke="var(--card-border)"
                    strokeOpacity={0.6}
                />

                {/* 漲停水平線 */}
                {closeY != null && (
                    <>
                        <line
                            x1={PAD_L} y1={closeY}
                            x2={W - PAD_R} y2={closeY}
                            stroke={COLOR_REF}
                            strokeDasharray="4 4"
                            strokeOpacity={0.6}
                        />
                        <text
                            x={PAD_L - 4} y={closeY - 4}
                            fontSize="10" fill={COLOR_REF} textAnchor="end" fontWeight={600}
                        >
                            漲停 {snap.close?.toFixed(2)}
                        </text>
                    </>
                )}

                {/* 軸框 */}
                <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="var(--card-border)" />
                <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--card-border)" />

                {/* Y 刻度 + 標籤 */}
                {yTicks.map((t, i) => (
                    <g key={`y${i}`}>
                        <line
                            x1={PAD_L - 3} y1={t.y}
                            x2={PAD_L} y2={t.y}
                            stroke="var(--card-border)"
                        />
                        <text
                            x={PAD_L - 6} y={t.y + 3}
                            fontSize="10" fill="var(--muted)" textAnchor="end"
                            fontFamily="monospace"
                        >
                            {t.v.toFixed(t.v < 100 ? 2 : 1)}
                        </text>
                        {i > 0 && i < yTicks.length - 1 && (
                            <line
                                x1={PAD_L} y1={t.y} x2={W - PAD_R} y2={t.y}
                                stroke="var(--card-border)" strokeOpacity={0.15}
                            />
                        )}
                    </g>
                ))}

                {/* X 刻度 + 標籤 — 對稱;0 在中間 */}
                {X_TICKS.map((v) => {
                    const positions: { x: number; sign: -1 | 0 | 1 }[] = v === 0
                        ? [{ x: xOf(0), sign: 0 }]
                        : [{ x: xOf(-v), sign: -1 }, { x: xOf(+v), sign: 1 }];
                    return positions.map((p, idx) => (
                        <g key={`x${v}-${idx}`}>
                            <line
                                x1={p.x} y1={H - PAD_B}
                                x2={p.x} y2={H - PAD_B + 3}
                                stroke="var(--card-border)"
                            />
                            <text
                                x={p.x} y={H - PAD_B + 14}
                                fontSize="10"
                                fill={p.sign === 1 ? COLOR_BUY : p.sign === -1 ? COLOR_SELL : 'var(--muted)'}
                                textAnchor="middle"
                                fontFamily="monospace"
                            >
                                {v}
                            </text>
                        </g>
                    ));
                })}

                {/* 軸方向標籤 */}
                <text
                    x={PAD_L + 8} y={H - PAD_B + 28}
                    fontSize="11" fill={COLOR_SELL} fontWeight={700}
                >
                    ← 賣量(張)
                </text>
                <text
                    x={W - PAD_R - 8} y={H - PAD_B + 28}
                    fontSize="11" fill={COLOR_BUY} fontWeight={700} textAnchor="end"
                >
                    買量(張)→
                </text>
                <text
                    x={14} y={PAD_T + PLOT_H / 2}
                    fontSize="11" fill="var(--muted)" textAnchor="middle" fontWeight={600}
                    transform={`rotate(-90 14 ${PAD_T + PLOT_H / 2})`}
                >
                    成交均價
                </text>

                {/* 主資料層:每個 broker 兩顆泡泡 + hover 時連線 */}
                {top.map((e) => {
                    const isHover = hoverCode === e.broker_code;
                    const hasBuy = (e.buy || 0) > 0 && e.buy_avg != null;
                    const hasSell = (e.sell || 0) > 0 && e.sell_avg != null;
                    const buyX = hasBuy ? xOf(+e.buy) : 0;
                    const buyY = hasBuy ? yOf(e.buy_avg!) : 0;
                    const sellX = hasSell ? xOf(-e.sell) : 0;
                    const sellY = hasSell ? yOf(e.sell_avg!) : 0;
                    return (
                        <g key={e.broker_code}>
                            {/* hover 時兩泡之間虛線連起 */}
                            {isHover && hasBuy && hasSell && (
                                <line
                                    x1={sellX} y1={sellY}
                                    x2={buyX} y2={buyY}
                                    stroke="var(--foreground)"
                                    strokeDasharray="2 3"
                                    strokeOpacity={0.5}
                                />
                            )}
                            {hasSell && (
                                <circle
                                    cx={sellX} cy={sellY} r={rOf(e.sell)}
                                    fill={COLOR_SELL}
                                    fillOpacity={isHover ? 0.85 : 0.35}
                                    stroke={COLOR_SELL}
                                    strokeWidth={isHover ? 2 : 1}
                                    onMouseEnter={() => setHoverCode(e.broker_code)}
                                    onMouseLeave={() => setHoverCode(null)}
                                    style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s' }}
                                />
                            )}
                            {hasBuy && (
                                <circle
                                    cx={buyX} cy={buyY} r={rOf(e.buy)}
                                    fill={COLOR_BUY}
                                    fillOpacity={isHover ? 0.85 : 0.35}
                                    stroke={COLOR_BUY}
                                    strokeWidth={isHover ? 2 : 1}
                                    onMouseEnter={() => setHoverCode(e.broker_code)}
                                    onMouseLeave={() => setHoverCode(null)}
                                    style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s' }}
                                />
                            )}
                            {/* 名稱:hover 時或量極大時顯示 */}
                            {(isHover || (e.buy || 0) >= maxNet * 0.5 || (e.sell || 0) >= maxNet * 0.5) && (
                                <text
                                    x={hasBuy ? buyX : sellX}
                                    y={(hasBuy ? buyY : sellY) - rOf(hasBuy ? e.buy : e.sell) - 4}
                                    fontSize="9.5"
                                    fill={isHover ? 'var(--foreground)' : 'var(--muted)'}
                                    textAnchor="middle"
                                    fontWeight={isHover ? 700 : 500}
                                    pointerEvents="none"
                                >
                                    {e.broker_name || e.broker_code}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Hover tooltip — 跟著左/右側避免擋住 bubble */}
            {hover && (
                <Box
                    sx={{
                        position: 'absolute', top: 8,
                        ...(hover.net >= 0 ? { left: 8 } : { right: 8 }),
                        p: 1, minWidth: 168,
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 1,
                        fontSize: 11,
                        pointerEvents: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                    }}
                >
                    <Box sx={{ fontFamily: 'monospace', color: 'var(--muted)', fontSize: 10 }}>
                        {hover.broker_code}
                    </Box>
                    <Box sx={{ fontWeight: 700, mb: 0.5, color: 'var(--foreground)' }}>
                        {hover.broker_name}
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', columnGap: 1, rowGap: 0.25 }}>
                        <Box sx={{ color: COLOR_BUY }}>買</Box>
                        <Box sx={{ textAlign: 'right' }}>{formatLots(hover.buy)} 張</Box>
                        <Box sx={{ color: 'var(--muted)' }}>@{hover.buy_avg?.toFixed(2) ?? '—'}</Box>
                        <Box sx={{ color: COLOR_SELL }}>賣</Box>
                        <Box sx={{ textAlign: 'right' }}>{formatLots(hover.sell)} 張</Box>
                        <Box sx={{ color: 'var(--muted)' }}>@{hover.sell_avg?.toFixed(2) ?? '—'}</Box>
                        <Box
                            sx={{
                                gridColumn: '1 / -1',
                                mt: 0.5, pt: 0.5,
                                borderTop: '1px solid var(--card-border)',
                                display: 'flex', justifyContent: 'space-between',
                                fontWeight: 700,
                            }}
                        >
                            <Box sx={{ color: hover.net >= 0 ? COLOR_BUY : COLOR_SELL }}>
                                {hover.net >= 0 ? '淨買超' : '淨賣超'}
                            </Box>
                            <Box sx={{ color: hover.net >= 0 ? COLOR_BUY : COLOR_SELL }}>
                                {formatLots(hover.net)} 張
                            </Box>
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
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_BUY }} />
                    買進(右側)
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_SELL }} />
                    賣出(左側)
                </Box>
                <Box>圓越大 = 量越大</Box>
                <Box sx={{ ml: 'auto' }}>顯示 top {top.length}</Box>
            </Box>
        </Box>
    );
}
