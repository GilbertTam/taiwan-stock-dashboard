'use client';

/**
 * 頻道詳情頁 | /dashboard/podcast/[channel]
 *
 * 版面對標 aistockmap influencer 頁，但用本專案 MUI 元件：
 *   1. 頻道頭部（頭像 + 名稱 + 集數 + 整體情緒條 + 熱門標的）
 *   2. 集數列表（EpisodeCard：摘要 / 題材 / 標的情緒 / 可展開時間軸）
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Typography, ButtonBase, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import { fetchChannelDetail } from '@/services/podcastApi';
import type { ChannelDetailResponse } from '@/types/podcast';
import { SentimentBar } from '@/components/podcast/SentimentBar';
import { MentionTag } from '@/components/podcast/MentionTag';
import { EpisodeCard } from '@/components/podcast/EpisodeCard';

export default function PodcastChannelPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation('podcast');

    const channelParam = Array.isArray(params.channel) ? params.channel[0] : params.channel;
    const channel = channelParam ? decodeURIComponent(channelParam) : '';

    const [data, setData] = useState<ChannelDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!channel) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetchChannelDetail(channel);
            setData(res);
        } catch (e: unknown) {
            const status = (e as { response?: { status?: number } })?.response?.status;
            setError(status === 404 ? t('detail.noEpisodes') : (e instanceof Error ? e.message : t('page.error')));
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [channel, t]);

    useEffect(() => { load(); }, [load]);

    const initial = channel.trim().charAt(0).toUpperCase();

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100vh', background: 'var(--background)' }}>
            {/* 返回 */}
            <ButtonBase
                onClick={() => router.push('/dashboard/podcast')}
                sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 2,
                    fontSize: 13, color: 'var(--muted)', borderRadius: '6px', px: 0.5, py: 0.25,
                    '&:hover': { color: 'var(--primary)' },
                }}
            >
                <ArrowBackIcon sx={{ fontSize: 18 }} />
                {t('detail.back')}
            </ButtonBase>

            {/* 頻道頭部 */}
            <Box
                sx={{
                    display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center',
                    p: 2, mb: 2, borderRadius: 2,
                    border: '1px solid var(--card-border)', background: 'var(--card-bg)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <Box
                    sx={{
                        width: 56, height: 56, borderRadius: '14px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,204,122,0.12)', color: 'var(--primary)',
                        fontSize: 24, fontWeight: 800,
                    }}
                >
                    {initial}
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.2 }}>
                        {channel}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--muted)', mb: 1 }}>
                        {t('card.episodes', { count: data?.episode_count ?? 0 })}
                    </Typography>
                    {data && <SentimentBar counts={data.sentiment} />}
                </Box>
            </Box>

            {/* 熱門標的 */}
            {data && data.top_mentions.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: 12, color: 'var(--muted)', mb: 0.75 }}>
                        {t('detail.topMentions')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {data.top_mentions.map((m) => (
                            <MentionTag key={m.target} topMention={m} />
                        ))}
                    </Box>
                </Box>
            )}

            {/* 內容 */}
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
            ) : (
                <Box>
                    {data?.episodes.map((ep) => (
                        <EpisodeCard key={ep.video_id} episode={ep} />
                    ))}
                </Box>
            )}
        </Box>
    );
}
