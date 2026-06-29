'use client';

/**
 * 產業別篩選 chips（橫向）。null = 全部。
 */
import React from 'react';
import { Box, ButtonBase } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface Props {
    industries: string[];
    selected: string | null;
    onSelect: (industry: string | null) => void;
}

export function IndustryChips({ industries, selected, onSelect }: Props) {
    const { t } = useTranslation('revenue');

    const chip = (label: string, value: string | null) => {
        const active = selected === value;
        return (
            <ButtonBase
                key={value ?? '__all__'}
                disableRipple
                onClick={() => onSelect(value)}
                sx={{
                    px: 1.25, height: 28, borderRadius: '999px', fontSize: 12,
                    fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
                    border: '1px solid',
                    borderColor: active ? 'var(--primary)' : 'var(--card-border)',
                    background: active ? 'rgba(0,204,122,0.14)' : 'var(--subtle-bg)',
                    color: active ? 'var(--primary)' : 'var(--muted)',
                    '&:hover': { borderColor: 'var(--primary)' },
                }}
            >
                {label}
            </ButtonBase>
        );
    };

    return (
        <Box
            sx={{
                display: 'flex', gap: 0.75, mb: 1.5, flexWrap: 'wrap',
                maxHeight: 76, overflowY: 'auto',
            }}
        >
            {chip(t('filter.allIndustries'), null)}
            {industries.map((ind) => chip(ind, ind))}
        </Box>
    );
}
