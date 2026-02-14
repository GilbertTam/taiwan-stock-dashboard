'use client';

import React, { useMemo } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import { TimeSlot } from '@/types';
import { getColumnStats, getCellStyle } from './utils';

const SLOT_LABELS: Record<TimeSlot, string> = {
  [TimeSlot.ALL]: 'Overall',
  [TimeSlot.MORNING]: '8–10h',
  [TimeSlot.EVENING]: '17–19h',
  [TimeSlot.NIGHT]: '22–24h',
};

const LegendItem = ({
  color,
  label,
  colors,
}: {
  color: string;
  label: string;
  colors: { subText: string };
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
    <Typography variant="caption" sx={{ color: colors.subText }}>{label}</Typography>
  </Box>
);

interface MaeSummaryTableProps {
  selectedModels: {
    id: string | number;
    name: string;
    color: string;
    calculatingDate: string;
  }[];
  modelTimeSlotMAEs: Record<string, Record<TimeSlot, number>>;
  modelColorMap: Record<string, string>;
}

export const MaeSummaryTable: React.FC<MaeSummaryTableProps> = ({
  selectedModels,
  modelTimeSlotMAEs,
  modelColorMap,
}) => {
  const { darkMode } = useTheme();

  const colors = useMemo(
    () => ({
      grid: darkMode ? '#333' : '#e6e6e6',
      text: darkMode ? '#d9d9d9' : '#000000',
      subText: darkMode ? '#a6a6a6' : '#595959',
    }),
    [darkMode]
  );

  const minMaxValues = useMemo(
    () => getColumnStats(selectedModels, modelTimeSlotMAEs),
    [selectedModels, modelTimeSlotMAEs]
  );

  const slots = [TimeSlot.ALL, TimeSlot.MORNING, TimeSlot.EVENING, TimeSlot.NIGHT] as const;

  return (
    <Box sx={{ mt: 2 }}>
      <Paper
        sx={{
          p: 1.5,
          backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.9)',
          border: `1px solid ${colors.grid}`,
          borderRadius: 1.5,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ color: colors.text, fontWeight: 'bold', mb: 1.25, textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          MAE 依時段（數值越低越好）
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {selectedModels.map((model) => {
            const modelKey = `${model.id}|${model.name}`;
            const maes = modelTimeSlotMAEs[modelKey];
            const modelColor = modelColorMap[modelKey];

            return (
              <Box
                key={`summary-${modelKey}`}
                sx={{
                  p: 1.25,
                  borderRadius: 1.25,
                  borderLeft: `4px solid ${modelColor}`,
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 1.25,
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  sx={{ color: modelColor, minWidth: 72 }}
                >
                  {model.name}
                </Typography>
                {slots.map((slot) => {
                  const value = maes?.[slot];
                  const minMax = minMaxValues[slot === TimeSlot.ALL ? 'all' : slot === TimeSlot.MORNING ? 'morning' : slot === TimeSlot.EVENING ? 'evening' : 'night'];
                  const style = getCellStyle(value ?? 0, minMax, colors, darkMode);
                  return (
                    <Box
                      key={slot}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 1,
                        backgroundColor: style.backgroundColor,
                        border: '1px solid transparent',
                      }}
                    >
                      <Typography variant="caption" sx={{ color: colors.subText }}>
                        {SLOT_LABELS[slot]}
                      </Typography>
                      <Typography variant="body2" fontWeight="600" sx={{ color: style.color }}>
                        {value != null ? value.toFixed(2) : '–'}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>

        <Box sx={{ mt: 1.5, display: 'flex', gap: 1.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <LegendItem
            color={darkMode ? '#52c41a' : '#389e0d'}
            label="最低 MAE（最佳）"
            colors={colors}
          />
          <LegendItem
            color={darkMode ? '#ff4d4f' : '#cf1322'}
            label="最高 MAE（最差）"
            colors={colors}
          />
        </Box>
      </Paper>
    </Box>
  );
};
