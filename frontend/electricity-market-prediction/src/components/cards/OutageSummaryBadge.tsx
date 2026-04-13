'use client';

import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { HjksOutage } from '@/types';
import { useTranslation } from 'react-i18next';

interface OutageSummaryBadgeProps {
    outages: HjksOutage[];
    loading?: boolean;
}

export function OutageSummaryBadge({ outages, loading }: OutageSummaryBadgeProps) {
    const { t } = useTranslation('dashboard');
    // Filter active outages (end_datetime in future or null)
    const now = new Date();
    const activeOutages = outages.filter((o) => {
        if (!o.end_datetime) return true;
        return new Date(o.end_datetime) > now;
    });

    // Calculate total down capacity
    const totalCapacity = activeOutages.reduce((sum, o) => {
        return sum + (o.down_capacity || o.max_capacity || 0);
    }, 0);

    // Find largest outage
    const largestOutage = activeOutages.reduce((max, o) => {
        const capacity = o.down_capacity || o.max_capacity || 0;
        const maxCapacity = max ? (max.down_capacity || max.max_capacity || 0) : 0;
        return capacity > maxCapacity ? o : max;
    }, null as HjksOutage | null);

    const count = activeOutages.length;

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                }}
            >
                <Typography variant="caption" sx={{ color: 'var(--muted)' }}>
                    {t('outage.badge.loading')}
                </Typography>
            </Box>
        );
    }

    if (count === 0) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                }}
            >
                <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 600 }}>
                    ✓ {t('outage.badge.noEvents')}
                </Typography>
            </Box>
        );
    }

    const tooltipContent = largestOutage ? (
        <Box sx={{ p: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {t('outage.badge.largestUnit')}
            </Typography>
            <Typography variant="body2">
                {largestOutage.name} {largestOutage.unit_name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {largestOutage.down_capacity || largestOutage.max_capacity} MW · {largestOutage.area}
            </Typography>
        </Box>
    ) : '';

    return (
        <Tooltip title={tooltipContent} arrow placement="bottom">
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                        backgroundColor: 'rgba(239, 68, 68, 0.25)',
                    },
                }}
            >
                <WarningAmberIcon sx={{ fontSize: 14, color: '#ef4444' }} />
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        color: '#ef4444',
                        fontFamily: 'monospace',
                    }}
                >
                    {t('outage.badge.count', { count })}
                </Typography>
                <Box sx={{ width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        color: '#ef4444',
                        fontFamily: 'monospace',
                    }}
                >
                    {totalCapacity.toLocaleString()} MW
                </Typography>
            </Box>
        </Tooltip>
    );
}
