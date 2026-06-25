'use client';

/**
 * 標的標籤 — 個股 / 族群的彩色 pill，顏色依主導情緒。
 * 可選顯示提及次數（頻道卡片用）或情緒 emoji（集數列表用）。
 */
import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import type { Mention, Sentiment, TopMention } from '@/types/podcast';
import { SENTIMENT_COLOR, SENTIMENT_EMOJI, dominantSentiment } from './sentimentUtils';

interface Props {
    /** 提供 mention（單集表態）或 topMention（跨集彙整）其一。 */
    mention?: Mention;
    topMention?: TopMention;
}

export function MentionTag({ mention, topMention }: Props) {
    const target = mention?.target ?? topMention?.target ?? '';
    const ticker = mention?.ticker ?? topMention?.ticker ?? null;
    const sentiment: Sentiment = mention
        ? mention.sentiment
        : dominantSentiment(topMention?.sentiment ?? { bullish: 0, bearish: 0, neutral: 0 });
    const color = SENTIMENT_COLOR[sentiment];
    const count = topMention?.count;
    const reason = mention?.reason ?? undefined;

    const pill = (
        <Box
            sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5,
                px: 1, py: 0.4, borderRadius: '7px',
                border: `1px solid ${color}`,
                background: 'var(--subtle-bg)',
                maxWidth: '100%',
            }}
        >
            <Typography component="span" sx={{ fontSize: 11 }}>
                {SENTIMENT_EMOJI[sentiment]}
            </Typography>
            <Typography
                component="span"
                sx={{
                    fontSize: 12, fontWeight: 700, color: 'var(--foreground)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
            >
                {target}
            </Typography>
            {ticker && (
                <Typography component="span" sx={{ fontSize: 11, color: 'var(--muted)' }}>
                    {ticker}
                </Typography>
            )}
            {typeof count === 'number' && (
                <Typography
                    component="span"
                    sx={{ fontSize: 10, fontWeight: 700, color, ml: 0.25 }}
                >
                    ×{count}
                </Typography>
            )}
        </Box>
    );

    return reason ? <Tooltip title={reason} arrow>{pill}</Tooltip> : pill;
}
