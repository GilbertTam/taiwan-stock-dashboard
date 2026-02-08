'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { ResizableLayout } from '@/shared/components/layout/ResizableLayout';
import ProfitAnalysis from '../profit-analysis/ProfitAnalysis';
import MaeAnalysis from '../mae-analysis/MaeAnalysis';
import { ModelPerformanceSidebar } from './ModelPerformanceSidebar';

interface ModelPerformanceTabProps {
  chartData: any[];
  selectedArea?: string;
  selectedModels: any[];
  isLoading: boolean;
}

export const ModelPerformanceTab: React.FC<ModelPerformanceTabProps> = ({
  chartData,
  selectedArea = '',
  selectedModels,
  isLoading,
}) => {
  const theme = useTheme();
  const [topBottomPairs, setTopBottomPairs] = useState(2);
  const isDark = theme.palette.mode === 'dark';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const cardBg = isDark ? alpha(theme.palette.background.paper, 0.6) : theme.palette.background.paper;

  const contextLabel = selectedArea
    ? selectedModels.length
      ? `地區：${selectedArea} · 模型：${selectedModels.map((m) => m.name).join('、')}`
      : `地區：${selectedArea} · 請在左側選擇預測模型`
    : '請在左側選擇地區與預測模型';

  const chartSection = (
    <Box
      sx={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
        {contextLabel}
      </Typography>
      {!selectedModels.length ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          請在左側選擇地區與預測模型，即可在此檢視收益分析與 MAE 指標。
        </Alert>
      ) : isLoading ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 280,
            color: 'text.secondary',
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 2,
              borderColor: 'divider',
              borderTopColor: 'primary.main',
              animation: 'spin 0.8s linear infinite',
              '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
            }}
          />
          <Typography sx={{ mt: 2, fontSize: 14 }}>載入模型效能資料...</Typography>
        </Box>
      ) : (
        <>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: `1px solid ${borderColor}`,
              backgroundColor: cardBg,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <TrendingUpIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                收益分析
              </Typography>
            </Box>
            <ProfitAnalysis
              chartData={chartData}
              selectedModels={selectedModels}
              topBottomPairs={topBottomPairs}
              setTopBottomPairs={setTopBottomPairs}
              embedded
              hideControls
            />
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: `1px solid ${borderColor}`,
              backgroundColor: cardBg,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <AssessmentIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                MAE 分析
              </Typography>
            </Box>
            <MaeAnalysis chartData={chartData} selectedModels={selectedModels} embedded />
          </Paper>
        </>
      )}
    </Box>
  );

  const sidebarSection = (
    <Box sx={{ height: '100%', minWidth: 0 }}>
      <ModelPerformanceSidebar
        topBottomPairs={topBottomPairs}
        setTopBottomPairs={setTopBottomPairs}
      />
    </Box>
  );

  return (
    <ResizableLayout
      direction="horizontal"
      defaultSizes={[75, 25]}
      minSizes={[50, 20]}
      storageKey="model-performance-layout"
    >
      {chartSection}
      {sidebarSection}
    </ResizableLayout>
  );
};
