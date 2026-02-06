'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Button,
  ButtonGroup,
  IconButton,
  Tooltip,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  useTheme
} from '@mui/material';
import {
  Settings,
  Fullscreen,
  Download,
  Refresh
} from '@mui/icons-material';
import { ModelSelector } from '@/components/price-chart/ModelSelector';
import { PredictionModel, CalculatingDate } from '@/types';

interface ToolbarProps {
  // Model selection
  selectedModels: Array<{
    id: string | number;
    name: string;
    color: string;
    calculatingDate: string;
  }>;
  availableModels: PredictionModel[];
  calculatingDatesByModel: { [key: string]: CalculatingDate[] };
  onModelToggle: (modelId: string | number, modelName: string) => void;
  onModelCalculatingDateChange: (modelIndex: number, newDate: string) => void;
  
  // Timeframe
  selectedTimeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
  
  // Indicators
  showImbalance?: boolean;
  showIntraday?: boolean;
  showInterconnection?: boolean;
  showOcctoArea?: boolean;
  onIndicatorToggle?: (indicator: string, show: boolean) => void;
  
  // Actions
  onRefresh?: () => void;
  onDownload?: () => void;
  onFullscreen?: () => void;
  onSettings?: () => void;
}

const TIMEFRAMES = [
  { value: '1H', label: '1小時', hours: 1 },
  { value: '4H', label: '4小時', hours: 4 },
  { value: '1D', label: '1天', hours: 24 },
  { value: '1W', label: '1週', hours: 168 },
  { value: '1M', label: '1月', hours: 720 },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedModels,
  availableModels,
  calculatingDatesByModel,
  onModelToggle,
  onModelCalculatingDateChange,
  selectedTimeframe,
  onTimeframeChange,
  showImbalance = false,
  showIntraday = false,
  showInterconnection = false,
  showOcctoArea = false,
  onIndicatorToggle,
  onRefresh,
  onDownload,
  onFullscreen,
  onSettings
}) => {
  const theme = useTheme();
  const [showIndicators, setShowIndicators] = useState(false);

  const handleIndicatorToggle = (indicator: string, checked: boolean) => {
    if (onIndicatorToggle) {
      onIndicatorToggle(indicator, checked);
    }
  };

  return (
    <Paper
      sx={{
        p: 1.5,
        borderRadius: 1,
        boxShadow: 2,
        border: '1px solid var(--card-border)',
        backgroundColor: 'var(--card-bg)',
        mb: 2
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {/* Model Selector - Compact Version */}
        <Box sx={{ flex: '1 1 auto', minWidth: 300 }}>
          <ModelSelector
            models={selectedModels}
            availableModels={availableModels}
            calculatingDatesByModel={calculatingDatesByModel}
            maxSelection={5}
            onModelToggle={onModelToggle}
            onCalculatingDateChange={onModelCalculatingDateChange}
          />
        </Box>

        <Divider orientation="vertical" flexItem sx={{ height: 32 }} />

        {/* Timeframe Selector */}
        {onTimeframeChange && (
          <>
            <ButtonGroup
              size="small"
              variant="outlined"
              sx={{
                '& .MuiButton-root': {
                  textTransform: 'none',
                  minWidth: 50,
                  px: 1.5
                }
              }}
            >
              {TIMEFRAMES.map((tf) => (
                <Button
                  key={tf.value}
                  variant={selectedTimeframe === tf.value ? 'contained' : 'outlined'}
                  onClick={() => onTimeframeChange(tf.value)}
                >
                  {tf.label}
                </Button>
              ))}
            </ButtonGroup>
            <Divider orientation="vertical" flexItem sx={{ height: 32 }} />
          </>
        )}

        {/* Indicator Toggles */}
        {onIndicatorToggle && (
          <>
            <ToggleButtonGroup
              size="small"
              value={[
                showImbalance && 'imbalance',
                showIntraday && 'intraday',
                showInterconnection && 'interconnection',
                showOcctoArea && 'occto'
              ].filter(Boolean)}
              onChange={(_, newValues) => {
                const values = Array.isArray(newValues) ? newValues : [newValues];
                handleIndicatorToggle('imbalance', values.includes('imbalance'));
                handleIndicatorToggle('intraday', values.includes('intraday'));
                handleIndicatorToggle('interconnection', values.includes('interconnection'));
                handleIndicatorToggle('occto', values.includes('occto'));
              }}
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  px: 1.5,
                  fontSize: '0.75rem'
                }
              }}
            >
              <ToggleButton value="imbalance" aria-label="imbalance">
                不平衡
              </ToggleButton>
              <ToggleButton value="intraday" aria-label="intraday">
                盤中
              </ToggleButton>
              <ToggleButton value="interconnection" aria-label="interconnection">
                互連
              </ToggleButton>
              <ToggleButton value="occto" aria-label="occto">
                OCCTO
              </ToggleButton>
            </ToggleButtonGroup>
            <Divider orientation="vertical" flexItem sx={{ height: 32 }} />
          </>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {onRefresh && (
            <Tooltip title="刷新數據">
              <IconButton size="small" onClick={onRefresh}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onDownload && (
            <Tooltip title="下載數據">
              <IconButton size="small" onClick={onDownload}>
                <Download fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onFullscreen && (
            <Tooltip title="全螢幕">
              <IconButton size="small" onClick={onFullscreen}>
                <Fullscreen fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onSettings && (
            <Tooltip title="設定">
              <IconButton size="small" onClick={onSettings}>
                <Settings fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Paper>
  );
};
