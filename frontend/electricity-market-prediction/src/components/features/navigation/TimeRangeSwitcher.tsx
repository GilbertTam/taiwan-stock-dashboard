'use client';

import React from 'react';
import { Box } from '@mui/material';

interface TimeRangeSwitcherProps {
  dateRangePreset: string | null;
  onDateRangePreset: (preset: string | null) => void;
}

export const TimeRangeSwitcher: React.FC<TimeRangeSwitcherProps> = ({
  dateRangePreset,
  onDateRangePreset,
}) => {
  // Simplified presets
  const presets = [
    { key: '1D', label: '1天' },
    { key: '3D', label: '3天' },
    { key: 'week', label: '1週' },
    { key: 'twoWeeks', label: '2週' },
    { key: 'month', label: '1月' },
    { key: 'twoMonths', label: '2月' },
    { key: 'threeMonths', label: '3月' },
  ];

  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      {presets.map((preset) => (
        <button
          key={preset.key}
          onClick={() => onDateRangePreset(preset.key)}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${dateRangePreset === preset.key
              ? 'bg-[var(--primary)] text-black'
              : 'bg-[var(--hover-bg)] text-[var(--foreground)] hover:bg-[var(--primary)]/20'
            }`}
        >
          {preset.label}
        </button>
      ))}
    </Box>
  );
};
