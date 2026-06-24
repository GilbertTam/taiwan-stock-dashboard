'use client';

/**
 * 族群篩選 chips — 依目前分類模式（基礎分類 / 子產業）顯示對應的族群清單，
 * 每個 chip 帶該族群的漲停檔數。
 */

import React from 'react';
import { Box, Typography, ButtonBase } from '@mui/material';
import type { ClassifyMode, SectorOption } from '@/types/stock';

interface Props {
    mode: ClassifyMode;
    sectors: SectorOption[];
    selected: string | null;
    onSelect: (name: string | null) => void;
    total: number;
}

export function SectorChips({ mode, sectors, selected, onSelect, total }: Props) {
    const renderChip = (label: string, count: number, value: string | null) => {
        const active = selected === value;
        return (
            <ButtonBase
                key={label}
                disableRipple
                onClick={() => onSelect(value)}
                sx={{
                    px: 1.25, height: 28, borderRadius: '14px',
                    fontSize: 12, fontWeight: active ? 700 : 500,
                    border: '1px solid',
                    borderColor: active ? 'var(--primary)' : 'var(--card-border)',
                    color: active ? 'var(--primary)' : 'var(--muted)',
                    backgroundColor: active ? 'rgba(0,204,122,0.12)' : 'transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': { borderColor: 'var(--primary)', color: 'var(--primary)' },
                }}
            >
                {label}
                <Box component="span" sx={{ ml: 0.5, opacity: 0.7, fontWeight: 400 }}>{count}</Box>
            </ButtonBase>
        );
    };

    return (
        <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 11, color: 'var(--muted)', mb: 0.75 }}>
                {mode === 'base' ? '基礎分類（TWSE 官方產業別）' : '子產業細分（MoneyDJ）'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {renderChip('全部', total, null)}
                {sectors.map((s) => renderChip(s.name, s.count, s.name))}
            </Box>
        </Box>
    );
}
