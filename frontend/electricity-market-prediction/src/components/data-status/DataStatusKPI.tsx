'use client';

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CoverageRow } from '@/services/dataStatusApi';

interface DataStatusKPIProps {
    rows: CoverageRow[];
    startDate: string;   // YYYYMMDD
    endDate: string;     // YYYYMMDD
    checkedAt: string | null;
}

interface KPICard {
    label: string;
    value: string | number;
    sub?: string;
    color: string;
}

export const DataStatusKPI: React.FC<DataStatusKPIProps> = ({ rows, startDate, endDate, checkedAt }) => {
    const { t } = useTranslation('dataStatus');
    const stats = React.useMemo(() => {
        if (rows.length === 0) return { total: 0, ok: 0, missing: 0, pct: 0 };

        // Find the most recent date across all rows
        const allDates = [...new Set(rows.map(r => r.date))].sort();
        const latestDate = allDates[allDates.length - 1];

        // Non-system rows on the latest date
        const latestRows = rows.filter(r => r.date === latestDate && r.area !== 'system');
        const total = latestRows.length;
        const ok = latestRows.filter(r => r.doc_count > 0).length;
        const missing = total - ok;
        const pct = total > 0 ? Math.round((ok / total) * 100) : 0;

        return { total, ok, missing, pct, latestDate };
    }, [rows]);

    const cards: KPICard[] = [
        {
            label: t('kpi.monitorCombinations'),
            value: stats.total,
            sub: t('kpi.monitorCombinationsSub'),
            color: 'var(--primary)',
        },
        {
            label: t('kpi.todayNormal'),
            value: `${stats.ok} / ${stats.total}`,
            sub: t('kpi.dataComplete', { pct: stats.pct }),
            color: '#52c41a',
        },
        {
            label: t('kpi.todayMissing'),
            value: stats.missing,
            sub: stats.missing > 0 ? t('kpi.needsConfirmation') : t('kpi.allNormal'),
            color: stats.missing > 0 ? '#ff4d4f' : '#52c41a',
        },
    ];

    return (
        <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0, mb: 1.5 }}>
            {cards.map(card => (
                <Paper
                    key={card.label}
                    elevation={0}
                    sx={{
                        flex: 1,
                        px: 2,
                        py: 1.25,
                        border: '1px solid var(--card-border)',
                        borderLeft: `3px solid ${card.color}`,
                        backgroundColor: 'var(--card-bg)',
                        borderRadius: 1,
                    }}
                >
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        {card.label}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: card.color, fontSize: '1.2rem', lineHeight: 1.2 }}>
                        {card.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                        {card.sub}
                    </Typography>
                </Paper>
            ))}

            {/* Date range info */}
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', ml: 'auto', textAlign: 'right' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                    {t('kpi.queryRange')}{': '}{startDate.slice(0,4)}/{startDate.slice(4,6)}/{startDate.slice(6,8)}
                    {' '}～{' '}
                    {endDate.slice(0,4)}/{endDate.slice(4,6)}/{endDate.slice(6,8)}
                </Typography>
                {checkedAt && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                        {t('kpi.updatedAt')}{': '}{new Date(checkedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};
