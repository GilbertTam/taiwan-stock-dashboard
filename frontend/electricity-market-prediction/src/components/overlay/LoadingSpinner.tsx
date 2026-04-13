/**
 * @fileoverview 共用載入旋轉圈 | Reusable loading spinner with optional text label.
 *
 * 使用純 CSS 動畫實現的旋轉圈組件。
 * A CSS-only animated spinner component.
 *
 * @param label - 顯示在旋轉圈下方的文字 | Text displayed below the spinner
 */

import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
    /** 載入提示文字 | Loading hint text */
    label?: string;
}

export function LoadingSpinner({ label }: LoadingSpinnerProps) {
    const { t } = useTranslation('common');
    const displayLabel = label ?? t('loading');
    return (
        <>
            <Box
                sx={{
                    width: 48,
                    height: 48,
                    position: 'relative',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: '3px solid',
                        borderColor: 'var(--card-border)',
                        opacity: 0.35,
                    },
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: '3px solid transparent',
                        borderTopColor: 'var(--primary)',
                        borderRightColor: 'var(--primary)',
                        animation: 'spinnerSpin 0.75s linear infinite',
                    },
                    '@keyframes spinnerSpin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' },
                    },
                }}
            />
            {displayLabel && (
                <Typography sx={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>
                    {displayLabel}
                </Typography>
            )}
        </>
    );
}
