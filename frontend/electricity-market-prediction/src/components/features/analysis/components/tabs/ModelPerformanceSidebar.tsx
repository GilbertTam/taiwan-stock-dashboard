'use client';

import React, { useState } from 'react';
import { Box, Typography, Slider } from '@mui/material';
import { SectionHeader } from '../sidebar/shared';
import { useChartColors } from '@/utils/chart-colors';

interface ModelPerformanceSidebarProps {
  topBottomPairs: number;
  setTopBottomPairs: (value: number) => void;
}

export const ModelPerformanceSidebar: React.FC<ModelPerformanceSidebarProps> = ({
  topBottomPairs,
  setTopBottomPairs,
}) => {
  const colors = useChartColors();
  const [expandedSettings, setExpandedSettings] = useState(true);
  const [expandedHelp, setExpandedHelp] = useState(false);

  return (
    <Box
      sx={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'var(--card-bg)',
        borderLeft: '1px solid var(--card-border)',
        '&::-webkit-scrollbar': { width: 6 },
        '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'var(--card-border)',
          borderRadius: 3,
        },
      }}
    >
      <SectionHeader
        expanded={expandedSettings}
        onClick={() => setExpandedSettings((v) => !v)}
      >
        收益分析設定
      </SectionHeader>
      {expandedSettings && (
        <Box sx={{ px: 1.5, py: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
            Top & Bottom Pairs (N)
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
            {topBottomPairs} Pairs（{topBottomPairs * 0.5} 小時）
          </Typography>
          <Slider
            value={topBottomPairs}
            onChange={(_, val) => setTopBottomPairs(val as number)}
            min={1}
            max={12}
            step={1}
            valueLabelDisplay="auto"
            sx={{ color: colors?.actual ?? 'primary.main' }}
          />
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
            每日以預測最低 N 時段買入、最高 N 時段賣出計算收益。
          </Typography>
        </Box>
      )}

      <SectionHeader expanded={expandedHelp} onClick={() => setExpandedHelp((v) => !v)}>
        說明
      </SectionHeader>
      {expandedHelp && (
        <Box sx={{ px: 1.5, py: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            左側可變更地區與模型；選擇後即可在此檢視收益分析與 MAE 指標。
          </Typography>
        </Box>
      )}
    </Box>
  );
};
