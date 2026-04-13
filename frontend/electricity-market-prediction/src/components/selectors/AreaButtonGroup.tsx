'use client';

import React from 'react';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { Area } from '@/types';
import { useTranslation } from 'react-i18next';
import { getAreaName } from '@/utils/areaI18n';

interface AreaButtonGroupProps {
    areas: Area[];
    selectedArea: string;
    onAreaChange: (event: SelectChangeEvent) => void;
}

export const AreaButtonGroup: React.FC<AreaButtonGroupProps> = ({
    areas,
    selectedArea,
    onAreaChange,
}) => {
    const { t } = useTranslation('common');
    return (
        <ToggleButtonGroup
            value={selectedArea}
            exclusive
            size="small"
            onChange={(_, value) => {
                if (value) onAreaChange({ target: { value } } as SelectChangeEvent);
            }}
            sx={{
                flexShrink: 0,
                '& .MuiToggleButtonGroup-grouped': {
                    border: '1px solid var(--card-border) !important',
                    borderRadius: '3px !important',
                    mx: '1px',
                },
                '& .MuiToggleButton-root': {
                    height: 26,
                    px: 1,
                    py: 0,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    textTransform: 'none',
                    lineHeight: 1,
                    fontFamily: 'inherit',
                    '&.Mui-selected': {
                        color: 'var(--primary)',
                        bgcolor: 'rgba(0,204,122,0.12)',
                        borderColor: 'var(--primary) !important',
                        fontWeight: 700,
                        '&:hover': {
                            bgcolor: 'rgba(0,204,122,0.2)',
                        },
                    },
                    '&:hover:not(.Mui-selected)': {
                        bgcolor: 'var(--hover-bg)',
                    },
                },
            }}
        >
            {areas.map((area) => (
                <Tooltip key={area.id} title={area.name} placement="bottom" enterDelay={600} arrow>
                    <ToggleButton value={area.name} aria-label={area.name}>
                        {getAreaName(t, area.name)}
                    </ToggleButton>
                </Tooltip>
            ))}
        </ToggleButtonGroup>
    );
};
