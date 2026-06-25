'use client';

/**
 * 財經節目頁 | /dashboard/podcast
 *
 * 每個頻道 / 財經節目一張卡的 grid。資料來自 /api/podcast/channels，
 * 由 backend/scripts/podcast_agent.py 爬蟲（YouTube RSS / 股癌逐字稿 →
 * Claude 抽取摘要 / 題材 / 個股族群情緒）寫入。
 * 點卡進入 /dashboard/podcast/[channel] 看該頻道集數與標的情緒。
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, ButtonBase, CircularProgress } from '@mui/material';
import PodcastsIcon from '@mui/icons-material/Podcasts';
import { useTranslation } from 'react-i18next';
import { fetchChannels } from '@/services/podcastApi';
import type { ChannelSummary } from '@/types/podcast';
import { ChannelCard } from '@/components/podcast/ChannelCard';

export default function PodcastPage() {
    const { t } = useTranslation('podcast');
    const [channels, setChannels] = useState<ChannelSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchChannels();
            setChannels(res.channels);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : t('page.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { load(); }, [load]);

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100vh', background: 'var(--background)' }}>
            {/* 標頭 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box
                    sx={{
                        width: 36, height: 36, borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,204,122,0.12)',
                    }}
                >
                    <PodcastsIcon sx={{ color: 'var(--primary)', fontSize: 20 }} />
                </Box>
                <Box>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.1 }}>
                        {t('page.title')}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.2 }}>
                        {t('page.subtitle')}
                    </Typography>
                </Box>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={28} sx={{ color: 'var(--primary)' }} />
                </Box>
            ) : error ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography sx={{ color: '#FF6B6B', fontSize: 14, mb: 1 }}>{error}</Typography>
                    <ButtonBase
                        onClick={load}
                        sx={{
                            px: 2, py: 0.75, borderRadius: '8px',
                            border: '1px solid var(--primary)', color: 'var(--primary)', fontSize: 13,
                        }}
                    >
                        {t('page.retry')}
                    </ButtonBase>
                </Box>
            ) : channels.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography sx={{ color: 'var(--muted)', fontSize: 14 }}>
                        {t('page.empty')}
                    </Typography>
                </Box>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            lg: 'repeat(3, 1fr)',
                        },
                        gap: 2,
                    }}
                >
                    {channels.map((c) => (
                        <ChannelCard key={c.channel} channel={c} />
                    ))}
                </Box>
            )}
        </Box>
    );
}
