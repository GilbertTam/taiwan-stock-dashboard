
import React from 'react';
import { Box, Typography } from '@mui/material';
import { format } from 'date-fns';
import { HjksOutage } from '@/types';

interface OutageHoverBarProps {
    outages: HjksOutage[] | null; // null = 不顯示
}

function getTypeColor(stopType: string | undefined) {
    const t = stopType || '';
    if (t.includes('緊急') || t.includes('事故')) return { bg: 'rgba(239,68,68,0.2)', text: '#f87171', border: 'rgba(239,68,68,0.4)' };
    if (t.includes('計画外')) return { bg: 'rgba(249,115,22,0.2)', text: '#fb923c', border: 'rgba(249,115,22,0.4)' };
    if (t.includes('出力低下')) return { bg: 'rgba(168,85,247,0.2)', text: '#c084fc', border: 'rgba(168,85,247,0.4)' };
    if (t.includes('計画')) return { bg: 'rgba(59,130,246,0.2)', text: '#60a5fa', border: 'rgba(59,130,246,0.4)' };
    return { bg: 'rgba(251,191,36,0.2)', text: '#fbbf24', border: 'rgba(251,191,36,0.4)' };
}

function SingleOutageRow({ outage }: { outage: HjksOutage }) {
    const colors = getTypeColor(outage.stop_type);
    const capacity = (outage.down_capacity ?? outage.max_capacity ?? 0).toLocaleString();
    const startFmt = outage.start_datetime
        ? format(new Date(outage.start_datetime), 'MM/dd HH:mm')
        : '-';
    const endFmt = outage.end_datetime
        ? format(new Date(outage.end_datetime), 'HH:mm')
        : '未定';

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            {/* 停機類型 chip */}
            <Box
                sx={{
                    flexShrink: 0,
                    px: 0.75,
                    py: 0.125,
                    borderRadius: 0.5,
                    backgroundColor: colors.bg,
                    border: `1px solid ${colors.border}`,
                }}
            >
                <Typography sx={{ fontSize: 9, fontWeight: 700, color: colors.text, whiteSpace: 'nowrap' }}>
                    {outage.stop_type || '停機'}
                </Typography>
            </Box>

            {/* 電廠 · 機組 */}
            <Typography
                sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--foreground)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                }}
            >
                {outage.name}
                {outage.unit_name && (
                    <Box component="span" sx={{ fontWeight: 400, color: 'var(--muted)', ml: 0.5 }}>
                        {outage.unit_name}
                    </Box>
                )}
            </Typography>

            {/* 地區 */}
            <Typography sx={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>
                {outage.area}
            </Typography>

            {/* 容量 */}
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: colors.text, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {capacity} MW
            </Typography>

            {/* 時間 */}
            <Typography sx={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {startFmt} ~ {endFmt}
            </Typography>

            {/* 原因 */}
            {outage.factor && (
                <Typography
                    sx={{
                        fontSize: 10,
                        color: 'var(--muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                        flex: 1,
                    }}
                >
                    {outage.factor}
                </Typography>
            )}
        </Box>
    );
}

/**
 * 停機資訊底部資訊列
 * 取代浮動的 OutageTooltip
 * 當使用者 hover 到圖表上的停機標記附近時，從底部滑入顯示停機詳情
 */
export function OutageHoverBar({ outages }: OutageHoverBarProps) {
    const visible = outages != null && outages.length > 0;
    const isMultiple = visible && outages!.length > 1;

    return (
        <Box
            sx={{
                flex: 1,
                minWidth: 0,
                mx: 1,
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.2s ease',
                pointerEvents: 'none',
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    overflow: 'hidden',
                    height: 28,
                }}
            >
                {isMultiple ? (
                    // 多件停機：顯示概要 + 橫向列表（最多 3 個 chip，超出顯示 +N）
                    <>
                        <Typography sx={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>
                            {outages!.length} 件
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, minWidth: 0, overflow: 'hidden' }}>
                            {outages!.slice(0, 3).map((o) => {
                                const c = getTypeColor(o.stop_type);
                                return (
                                    <Box
                                        key={o.id}
                                        sx={{
                                            flexShrink: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            px: 0.75,
                                            py: 0.25,
                                            borderRadius: 0.75,
                                            backgroundColor: c.bg,
                                            border: `1px solid ${c.border}`,
                                        }}
                                    >
                                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: c.text, whiteSpace: 'nowrap' }}>
                                            {o.name} {o.unit_name || ''} · {(o.down_capacity ?? o.max_capacity ?? 0).toLocaleString()} MW
                                        </Typography>
                                    </Box>
                                );
                            })}
                            {outages!.length > 3 && (
                                <Typography sx={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0, alignSelf: 'center' }}>
                                    +{outages!.length - 3}
                                </Typography>
                            )}
                        </Box>
                    </>
                ) : visible ? (
                    // 單件停機：完整資訊列
                    <SingleOutageRow outage={outages![0]} />
                ) : null}
            </Box>
        </Box>
    );
}
