/**
 * 台股觀測站首頁 placeholder | Taiwan stock watchlist dashboard placeholder.
 */
'use client';

import { Box, Typography } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';

export default function Dashboard() {
    const { user } = useAuth();
    const { t } = useTranslation('dashboard');

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
            }}
        >
            <Box
                sx={{
                    maxWidth: 560,
                    width: '100%',
                    p: 4,
                    borderRadius: 2,
                    border: '1px solid var(--card-border)',
                    background: 'var(--card-bg)',
                    backdropFilter: 'blur(12px)',
                    textAlign: 'center',
                }}
            >
                <ShowChartIcon sx={{ fontSize: 48, color: 'var(--primary)', mb: 2 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--foreground)', mb: 1 }}>
                    {t('home.title', '台股觀測站')}
                </Typography>
                <Typography variant="body1" sx={{ color: 'var(--muted)', mb: 3 }}>
                    {t('home.welcome', { name: user ?? 'Guest', defaultValue: '歡迎,{{name}}' })}
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--muted)' }}>
                    {t('home.comingSoon', 'Dashboard 內容開發中,敬請期待。')}
                </Typography>
            </Box>
        </Box>
    );
}
