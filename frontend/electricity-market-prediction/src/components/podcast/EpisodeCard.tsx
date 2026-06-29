'use client';

/**
 * 集數卡片 — 頻道詳情頁的單集。
 * 顯示：日期、標題、AI 摘要、題材 chips、提及標的（情緒色標籤）、
 * 可展開的段落時間軸；右上提供原片連結。
 */
import React, { useState } from 'react';
import { Box, Typography, ButtonBase, Collapse, Chip, Link as MuiLink } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from 'react-i18next';
import type { Episode } from '@/types/podcast';
import { MentionTag } from './MentionTag';

interface Props {
    episode: Episode;
}

export function EpisodeCard({ episode }: Props) {
    const { t } = useTranslation('podcast');
    const [open, setOpen] = useState(false);
    const [qaOpen, setQaOpen] = useState(false);

    const date = episode.published ? episode.published.slice(0, 10) : '—';
    const hasTimeline = episode.segments.length > 0;
    const hasQA = episode.qa.length > 0;

    return (
        <Box
            sx={{
                borderRadius: 2, p: 2, mb: 1.5,
                border: '1px solid var(--card-border)',
                background: 'var(--card-bg)',
            }}
        >
            {/* 頭部：日期 + 標題 + 原片 */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, mb: 0.25 }}>
                        {date}
                    </Typography>
                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.3 }}>
                        {episode.title}
                    </Typography>
                </Box>
                {episode.url && (
                    <MuiLink
                        href={episode.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.4,
                            fontSize: 12, color: 'var(--muted)', flexShrink: 0,
                            textDecoration: 'none', '&:hover': { color: 'var(--primary)' },
                        }}
                    >
                        <OpenInNewIcon sx={{ fontSize: 14 }} />
                        {t('detail.watchOriginal')}
                    </MuiLink>
                )}
            </Box>

            {/* AI 摘要 */}
            {episode.summary && (
                <Typography sx={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5, mt: 1 }}>
                    {episode.summary}
                </Typography>
            )}

            {/* 題材 chips */}
            {episode.topics.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.25 }}>
                    {episode.topics.map((tp) => (
                        <Chip
                            key={tp}
                            label={tp}
                            size="small"
                            sx={{
                                height: 22, fontSize: 11, fontWeight: 600,
                                background: 'var(--subtle-bg)', color: 'var(--muted)',
                                border: '1px solid var(--card-border)',
                            }}
                        />
                    ))}
                </Box>
            )}

            {/* 提及標的 */}
            {episode.mentions.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                    <Typography sx={{ fontSize: 11, color: 'var(--muted)', mb: 0.75 }}>
                        {t('detail.mentions')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {episode.mentions.map((m, i) => (
                            <MentionTag key={`${m.target}-${i}`} mention={m} />
                        ))}
                    </Box>
                </Box>
            )}

            {/* 段落時間軸（可展開）*/}
            {hasTimeline && (
                <Box sx={{ mt: 1.5 }}>
                    <ButtonBase
                        onClick={() => setOpen((v) => !v)}
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 0.5,
                            fontSize: 12, fontWeight: 600, color: 'var(--primary)',
                            borderRadius: '6px', px: 0.5, py: 0.25,
                        }}
                    >
                        {t('detail.timeline')}（{episode.segments.length}）
                        <ExpandMoreIcon
                            sx={{
                                fontSize: 18,
                                transform: open ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.2s ease',
                            }}
                        />
                    </ButtonBase>
                    <Collapse in={open}>
                        <Box sx={{ mt: 1, pl: 1, borderLeft: '2px solid var(--card-border)' }}>
                            {episode.segments.map((s, i) => (
                                <Box key={i} sx={{ mb: 1.25 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>
                                            {s.start}{s.end ? `–${s.end}` : ''}
                                        </Typography>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                                            {s.title}
                                        </Typography>
                                        {s.topic && (
                                            <Typography sx={{ fontSize: 11, color: 'var(--muted)' }}>
                                                {s.topic}
                                            </Typography>
                                        )}
                                    </Box>
                                    {s.content && (
                                        <Typography sx={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, mt: 0.25 }}>
                                            {s.content}
                                        </Typography>
                                    )}
                                </Box>
                            ))}
                        </Box>
                    </Collapse>
                </Box>
            )}

            {/* QA 精選（可展開）*/}
            {hasQA && (
                <Box sx={{ mt: 1.5 }}>
                    <ButtonBase
                        onClick={() => setQaOpen((v) => !v)}
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 0.5,
                            fontSize: 12, fontWeight: 600, color: 'var(--primary)',
                            borderRadius: '6px', px: 0.5, py: 0.25,
                        }}
                    >
                        {t('qa.title')}（{episode.qa.length}）
                        <ExpandMoreIcon
                            sx={{
                                fontSize: 18,
                                transform: qaOpen ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.2s ease',
                            }}
                        />
                    </ButtonBase>
                    <Collapse in={qaOpen}>
                        <Box sx={{ mt: 1, pl: 1, borderLeft: '2px solid var(--card-border)' }}>
                            {episode.qa.map((q, i) => (
                                <Box key={i} sx={{ mb: 1.25 }}>
                                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.4 }}>
                                        Q{q.idx ?? i + 1}. {q.question}
                                    </Typography>
                                    {q.answer && (
                                        <Typography sx={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, mt: 0.25 }}>
                                            {q.answer}
                                        </Typography>
                                    )}
                                </Box>
                            ))}
                        </Box>
                    </Collapse>
                </Box>
            )}
        </Box>
    );
}
