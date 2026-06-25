'use client';

/**
 * 頻道卡片 — /dashboard/podcast 的 grid 單元（每個頻道一張卡）。
 * 顯示：頭像 + 名稱、集數、最新一集、情緒分佈條、熱門標的標籤。
 * 整張卡可點，導向 /dashboard/podcast/[channel]。
 */
import React from 'react';
import { Box, Typography, ButtonBase } from '@mui/material';
import PodcastsIcon from '@mui/icons-material/Podcasts';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { ChannelSummary } from '@/types/podcast';
import { SentimentBar } from './SentimentBar';
import { MentionTag } from './MentionTag';

interface Props {
    channel: ChannelSummary;
}

export function ChannelCard({ channel }: Props) {
    const router = useRouter();
    const { t } = useTranslation('podcast');

    const initial = channel.channel.trim().charAt(0).toUpperCase();
    const latestDate = channel.latest_published
        ? channel.latest_published.slice(0, 10)
        : '—';

    return (
        <ButtonBase
            onClick={() => router.push(`/dashboard/podcast/${encodeURIComponent(channel.channel)}`)}
            sx={{
                display: 'block', textAlign: 'left', width: '100%', height: '100%',
                borderRadius: 2, p: 2,
                border: '1px solid var(--card-border)',
                background: 'var(--card-bg)',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.18s ease',
                '&:hover': {
                    borderColor: 'var(--primary)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
                },
            }}
        >
            {/* 頭部：頭像 + 名稱 + 集數 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box
                    sx={{
                        width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,204,122,0.12)',
                        color: 'var(--primary)', fontSize: 18, fontWeight: 800,
                    }}
                >
                    {initial || <PodcastsIcon sx={{ fontSize: 22 }} />}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                        sx={{
                            fontSize: 15, fontWeight: 800, color: 'var(--foreground)',
                            lineHeight: 1.2, whiteSpace: 'nowrap',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                        }}
                    >
                        {channel.channel}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'var(--muted)' }}>
                        {t('card.episodes', { count: channel.episode_count })}
                        　·　{t('card.updated', { date: latestDate })}
                    </Typography>
                </Box>
                <ChevronRightIcon sx={{ color: 'var(--muted)', fontSize: 20 }} />
            </Box>

            {/* 最新一集標題 */}
            {channel.latest_title && (
                <Box sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: 11, color: 'var(--muted)', mb: 0.25 }}>
                        {t('card.latestPrefix')}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 13, color: 'var(--foreground)', lineHeight: 1.35,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {channel.latest_title}
                    </Typography>
                </Box>
            )}

            {/* 情緒分佈條 */}
            <Box sx={{ mb: 1.5 }}>
                <SentimentBar counts={channel.sentiment} />
            </Box>

            {/* 熱門標的 */}
            <Box>
                <Typography sx={{ fontSize: 11, color: 'var(--muted)', mb: 0.75 }}>
                    {t('card.topMentions')}
                </Typography>
                {channel.top_mentions.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {channel.top_mentions.slice(0, 5).map((m) => (
                            <MentionTag key={m.target} topMention={m} />
                        ))}
                    </Box>
                ) : (
                    <Typography sx={{ fontSize: 12, color: 'var(--muted)' }}>
                        {t('card.noMentions')}
                    </Typography>
                )}
            </Box>
        </ButtonBase>
    );
}
