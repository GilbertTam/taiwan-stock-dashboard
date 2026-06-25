'use client';

/**
 * 情緒分佈條 — 看好 / 看壞 / 中立 的橫向堆疊比例條 + 數字。
 * 用於頻道卡片與頻道詳情頭部。
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { SentimentCounts } from '@/types/podcast';
import { totalCount } from './sentimentUtils';

interface Props {
    counts: SentimentCounts;
    compact?: boolean;
}

export function SentimentBar({ counts, compact = false }: Props) {
    const { t } = useTranslation('podcast');
    const total = totalCount(counts) || 1;
    const segs: { key: string; value: number; color: string }[] = [
        { key: 'sentiment.bullish', value: counts.bullish, color: 'var(--primary)' },
        { key: 'sentiment.bearish', value: counts.bearish, color: '#FF6B6B' },
        { key: 'sentiment.neutral', value: counts.neutral, color: 'var(--muted)' },
    ];

    return (
        <Box sx={{ width: '100%' }}>
            <Box
                sx={{
                    display: 'flex', height: compact ? 6 : 8, borderRadius: 99,
                    overflow: 'hidden', background: 'var(--subtle-bg)',
                }}
            >
                {segs.map((s) => (
                    <Box
                        key={s.key}
                        sx={{
                            width: `${(s.value / total) * 100}%`,
                            background: s.color,
                            transition: 'width 0.3s ease',
                        }}
                    />
                ))}
            </Box>
            {!compact && (
                <Box sx={{ display: 'flex', gap: 1.5, mt: 0.75, flexWrap: 'wrap' }}>
                    {segs.map((s) => (
                        <Box key={s.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: 99, background: s.color }} />
                            <Typography sx={{ fontSize: 11, color: 'var(--muted)' }}>
                                {t(s.key)} {s.value}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}
