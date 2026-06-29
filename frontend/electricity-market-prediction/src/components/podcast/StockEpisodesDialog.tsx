'use client';

/**
 * 點個股/族群標籤 → 跨所有頻道列出講過該標的的集數。
 * 自帶抓取與 state,drop-in 各處可用(由 MentionTag 觸發)。
 */
import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, Box, Typography, IconButton,
    CircularProgress, Link as MuiLink,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { fetchStockEpisodes } from '@/services/podcastApi';
import type { StockEpisodesResponse } from '@/types/podcast';
import { SENTIMENT_COLOR, SENTIMENT_EMOJI } from './sentimentUtils';

interface Props {
    open: boolean;
    targetKey: string;       // 代號或名稱
    label: string;           // 顯示用名稱
    onClose: () => void;
}

export function StockEpisodesDialog({ open, targetKey, label, onClose }: Props) {
    const { t } = useTranslation('podcast');
    const router = useRouter();
    const [data, setData] = useState<StockEpisodesResponse | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        let alive = true;
        setLoading(true);
        setData(null);
        fetchStockEpisodes(targetKey)
            .then((r) => { if (alive) setData(r); })
            .catch(() => {})
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [open, targetKey]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { background: 'var(--card-bg)', backgroundImage: 'none', border: '1px solid var(--card-border)' } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Box>
                    <Typography component="span" sx={{ fontSize: 16, fontWeight: 800, color: 'var(--foreground)' }}>
                        {label}{data?.ticker ? ` ${data.ticker}` : ''}
                    </Typography>
                    {data && (
                        <Typography component="span" sx={{ fontSize: 12, color: 'var(--muted)', ml: 1 }}>
                            {t('stockEpisodes.count', { count: data.total })}
                        </Typography>
                    )}
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: 'var(--muted)' }}>
                    <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: 'var(--card-border)' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={22} sx={{ color: 'var(--primary)' }} />
                    </Box>
                ) : !data || data.episodes.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: 'var(--muted)', py: 2, textAlign: 'center' }}>
                        {t('stockEpisodes.empty')}
                    </Typography>
                ) : (
                    data.episodes.map((e, i) => (
                        <Box
                            key={`${e.video_id}-${i}`}
                            sx={{
                                py: 1, borderBottom: '1px solid var(--card-border)',
                                '&:last-of-type': { borderBottom: 'none' },
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                                <Typography component="span" sx={{ fontSize: 13 }}>
                                    {SENTIMENT_EMOJI[e.sentiment]}
                                </Typography>
                                <Typography component="span" sx={{ fontSize: 11, fontWeight: 700, color: SENTIMENT_COLOR[e.sentiment] }}>
                                    {t(`sentiment.${e.sentiment === '樂觀' ? 'bullish' : e.sentiment === '悲觀' ? 'bearish' : 'neutral'}`)}
                                </Typography>
                                <Typography component="span" sx={{ fontSize: 11, color: 'var(--muted)' }}>
                                    {(e.published || '').slice(0, 10)}
                                </Typography>
                                <MuiLink
                                    component="button"
                                    onClick={() => { onClose(); router.push(`/dashboard/podcast/${encodeURIComponent(e.channel)}`); }}
                                    sx={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'none', ml: 'auto' }}
                                >
                                    {e.channel}
                                </MuiLink>
                            </Box>
                            <Typography sx={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.3 }}>
                                {e.title}
                            </Typography>
                            {e.reason && (
                                <Typography sx={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, mt: 0.25 }}>
                                    {e.reason}
                                </Typography>
                            )}
                        </Box>
                    ))
                )}
            </DialogContent>
        </Dialog>
    );
}
