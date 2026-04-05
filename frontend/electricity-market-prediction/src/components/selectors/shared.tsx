
import React from 'react';
import { Box, Typography } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

// 1. 定義統一的顏色映射，與圖表 (chart-colors) 一致
export const SOURCE_COLORS = {
    imbalance: '#8884d8', // 與圖表不平衡量線一致
    intraday: '#9c27b0',
    interconnection: '#00bcd4',
    battery: '#7e57c2',
    bidPlans: '#e91e63',
    weather: '#2196f3', // 統一天氣主色
    weatherActual: '#ffc107',
    weatherForecast: '#ff9800',
    occto: '#009688',
    primary: 'var(--primary)',
    text: 'var(--text-primary)',
    textSec: 'var(--text-secondary)',
};

export function SectionHeader({
    children,
    onClick,
    expanded,
    step,
    description,
    icon,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    expanded?: boolean;
    step?: number;
    description?: string;
    icon?: React.ReactNode;
}) {
    return (
        <Box
            onClick={onClick}
            sx={{
                px: 1.5,
                py: 1,
                borderBottom: '1px solid var(--card-border)',
                backgroundColor: 'var(--background)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                '&:hover': onClick ? {
                    backgroundColor: 'var(--background)',
                } : {},
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                    {onClick && (
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            color: expanded ? 'var(--primary)' : 'var(--text-secondary)',
                            transition: 'transform 0.2s ease',
                            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                        }}>
                            <ExpandMore sx={{ fontSize: '1.2rem' }} />
                        </Box>
                    )}
                    {icon && (
                        <Box sx={{ display: 'flex', alignItems: 'center', color: expanded ? 'var(--primary)' : 'text.secondary' }}>
                            {icon}
                        </Box>
                    )}
                    <Typography
                        variant="subtitle2"
                        sx={{
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            color: expanded ? 'var(--primary)' : 'var(--text-primary)',
                        }}
                    >
                        {step != null ? `${step}. ` : ''}{children}
                    </Typography>
                </Box>
            </Box>
            {description && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.25, ml: 3.5, fontSize: '0.7rem', color: 'text.secondary' }}>
                    {description}
                </Typography>
            )}
        </Box>
    );
}

// Helper: SubHeader used in Data Sources
export function SubHeader({ label }: { label: string }) {
    return (
        <Box sx={{ px: 2, py: 0.75, mt: 1, bgcolor: 'var(--hover-bg)', borderTop: '1px solid var(--card-border)', borderBottom: '1px solid var(--card-border)' }}>
            <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
            </Typography>
        </Box>
    );
}
