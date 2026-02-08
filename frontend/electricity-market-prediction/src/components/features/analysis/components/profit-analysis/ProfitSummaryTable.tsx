'use client';

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface ProfitSummaryTableProps {
  totalProfits: any;
  selectedModels: {
    id: string | number;
    name: string;
    color: string;
    calculatingDate: string;
  }[];
  modelColorMap: Record<string, string>;
  colors: any;
  darkMode: boolean;
}

export const ProfitSummaryTable: React.FC<ProfitSummaryTableProps> = ({
  totalProfits,
  selectedModels,
  modelColorMap,
  colors,
  darkMode,
}) => {
  const optimal = totalProfits?.cumulativeActual ?? 0;

  return (
    <Paper
      sx={{
        p: 1.5,
        backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.9)',
        border: `1px solid ${colors.grid}`,
        borderRadius: 1.5,
      }}
    >
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.25, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        總收益摘要
      </Typography>

      {/* Optimal 基準卡 */}
      <Box
        sx={{
          p: 1.25,
          borderRadius: 1.25,
          borderLeft: `4px solid ${colors.actual}`,
          backgroundColor: darkMode ? 'rgba(255,77,79,0.08)' : 'rgba(255,77,79,0.06)',
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2" fontWeight="bold" sx={{ color: colors.actual }}>
            Optimal（實際）
          </Typography>
          <Typography variant="h6" fontWeight="bold" sx={{ color: colors.text }}>
            ¥{optimal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: colors.subText }}>基準 100%</Typography>
      </Box>

      {/* 各模型：條狀比較 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {selectedModels.map((model) => {
          const modelKey = `${model.id}|${model.name}`;
          const profit = totalProfits?.[`${modelKey}_cumulative`];
          const value = typeof profit === 'number' ? profit : 0;
          const percent = optimal > 0 ? Math.min(100, (value / optimal) * 100) : 0;
          const barColor = modelColorMap[modelKey] || colors.text;

          return (
            <Box
              key={modelKey}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                py: 0.5,
                borderBottom: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                '&:last-of-type': { borderBottom: 'none' },
              }}
            >
              <Box sx={{ width: 80, flexShrink: 0 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: barColor,
                    display: 'inline-block',
                    mr: 0.75,
                    verticalAlign: 'middle',
                  }}
                />
                <Typography variant="body2" fontWeight="600" sx={{ color: colors.text, display: 'inline' }}>
                  {model.name}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    height: 8,
                    borderRadius: 1,
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${percent}%`,
                      minWidth: percent > 0 ? 4 : 0,
                      borderRadius: 1,
                      backgroundColor: barColor,
                      opacity: 0.85,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </Box>
              </Box>
              <Box sx={{ width: 72, flexShrink: 0, textAlign: 'right' }}>
                <Typography variant="body2" fontWeight="600" sx={{ color: colors.text }}>
                  ¥{value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Typography>
                <Typography variant="caption" sx={{ color: colors.subText }}>
                  {optimal > 0 ? (value / optimal * 100).toFixed(1) : '-'}%
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};
