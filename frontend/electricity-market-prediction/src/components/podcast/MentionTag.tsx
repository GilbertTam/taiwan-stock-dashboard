'use client';

/**
 * 標的標籤 — 個股 / 族群的彩色 pill，顏色依主導情緒。
 * 可選顯示提及次數（頻道卡片用）或情緒 emoji（集數列表用）。
 * 點擊 → 跨頻道列出講過該標的的集數（StockEpisodesDialog）。
 */
import React, { useState } from 'react';
import { Box, Typography, Tooltip, ButtonBase } from '@mui/material';
import type { Mention, Sentiment, TopMention } from '@/types/podcast';
import { SENTIMENT_COLOR, SENTIMENT_EMOJI, dominantSentiment } from './sentimentUtils';
import { StockEpisodesDialog } from './StockEpisodesDialog';

interface Props {
    /** 提供 mention（單集表態）或 topMention（跨集彙整）其一。 */
    mention?: Mention;
    topMention?: TopMention;
    /** 預設可點開「哪些集數有講」；設 false 關閉。 */
    clickable?: boolean;
}

export function MentionTag({ mention, topMention, clickable = true }: Props) {
    const [open, setOpen] = useState(false);
    const target = mention?.target ?? topMention?.target ?? '';
    const ticker = mention?.ticker ?? topMention?.ticker ?? null;
    const sentiment: Sentiment = mention
        ? mention.sentiment
        : dominantSentiment(topMention?.sentiment ?? { bullish: 0, bearish: 0, neutral: 0 });
    const color = SENTIMENT_COLOR[sentiment];
    const count = topMention?.count;
    const reason = mention?.reason ?? undefined;
    // 點擊查詢用 key：有代號用代號（同義名聚合），否則用名稱
    const lookupKey = ticker || target;

    const inner = (
        <Box
            sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5,
                px: 1, py: 0.4, borderRadius: '7px',
                border: `1px solid ${color}`,
                background: 'var(--subtle-bg)',
                maxWidth: '100%',
                cursor: clickable ? 'pointer' : 'default',
                transition: 'background 0.15s',
                '&:hover': clickable ? { background: 'var(--hover-bg)' } : undefined,
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
                <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, color, ml: 0.25 }}>
                    ×{count}
                </Typography>
            )}
        </Box>
    );

    const pill = clickable ? (
        <ButtonBase disableRipple onClick={() => setOpen(true)} sx={{ borderRadius: '7px' }}>
            {inner}
        </ButtonBase>
    ) : inner;

    const wrapped = reason ? <Tooltip title={reason} arrow>{pill}</Tooltip> : pill;

    return (
        <>
            {wrapped}
            {clickable && open && (
                <StockEpisodesDialog
                    open={open}
                    targetKey={lookupKey}
                    label={target}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
}
