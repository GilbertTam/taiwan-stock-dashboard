'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Collapse,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Assessment
} from '@mui/icons-material';
import { MetricCard } from '@/components/features/overview/MetricCard';
import { ChartDataPoint } from '@/utils/chartUtils';
import { calculateModelMAE } from '@/utils/chartUtils';

interface SidePanelProps {
  selectedModels: Array<{
    id: string | number;
    name: string;
    color: string;
    calculatingDate: string;
  }>;
  chartData: ChartDataPoint[];
  currentPrice?: number | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  showLegend?: boolean;
  legendItems?: Array<{
    name: string;
    color: string;
    visible: boolean;
  }>;
  onLegendToggle?: (name: string, visible: boolean) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  selectedModels,
  chartData,
  currentPrice,
  isCollapsed = false,
  onToggleCollapse,
  showLegend = true,
  legendItems = [],
  onLegendToggle
}) => {
  const [expandedSections, setExpandedSections] = useState({
    models: true,
    metrics: true,
    legend: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Calculate best model MAE
  const bestModelMAE = React.useMemo(() => {
    if (selectedModels.length === 0 || chartData.length === 0) return null;

    const maeResults = selectedModels.map(model => {
      const mae = calculateModelMAE(chartData, model.id, model.name);
      return { model, mae };
    }).filter(result => result.mae > 0);

    if (maeResults.length === 0) return null;

    const best = maeResults.reduce((prev, current) =>
      (prev.mae < current.mae) ? prev : current
    );

    return best;
  }, [selectedModels, chartData]);

  if (isCollapsed) {
    return (
      <Paper
        sx={{
          width: 40,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 1,
          border: '1px solid var(--card-border)',
          backgroundColor: 'var(--card-bg)',
          borderRadius: 0
        }}
      >
        <IconButton
          size="small"
          onClick={onToggleCollapse}
          sx={{ color: 'var(--foreground)' }}
        >
          <ChevronRight fontSize="small" />
        </IconButton>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        width: 300,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--card-border)',
        backgroundColor: 'var(--card-bg)',
        borderRadius: 0,
        overflow: 'auto'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--card-border)'
        }}
      >
        <Typography variant="h6" fontWeight="bold" fontSize="1rem">
          資訊面板
        </Typography>
        <IconButton
          size="small"
          onClick={onToggleCollapse}
          sx={{ color: 'var(--foreground)' }}
        >
          <ChevronLeft fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Model Information */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
              cursor: 'pointer'
            }}
            onClick={() => toggleSection('models')}
          >
            <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment fontSize="small" />
              模型資訊
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {expandedSections.models ? '收起' : '展開'}
            </Typography>
          </Box>
          <Collapse in={expandedSections.models}>
            {selectedModels.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ pl: 3 }}>
                未選擇模型
              </Typography>
            ) : (
              <Box sx={{ pl: 3 }}>
                {selectedModels.map((model, index) => (
                  <Box
                    key={`${model.id}-${model.name}`}
                    sx={{
                      mb: 1.5,
                      p: 1.5,
                      borderRadius: 1,
                      border: `1px solid var(--card-border)`,
                      backgroundColor: 'var(--hover-bg)'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: model.color
                        }}
                      />
                      <Typography variant="body2" fontWeight="medium">
                        {model.name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      計算日期: {model.calculatingDate === 'latest' ? '最新' : model.calculatingDate}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Collapse>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Key Metrics */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
              cursor: 'pointer'
            }}
            onClick={() => toggleSection('metrics')}
          >
            <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info fontSize="small" />
              關鍵指標
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {expandedSections.metrics ? '收起' : '展開'}
            </Typography>
          </Box>
          <Collapse in={expandedSections.metrics}>
            <Box sx={{ pl: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {currentPrice !== null && currentPrice !== undefined && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    當前價格
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    ¥{currentPrice.toFixed(2)}
                  </Typography>
                </Box>
              )}
              {bestModelMAE && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    最佳模型 MAE
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    {bestModelMAE.mae.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {bestModelMAE.model.name}
                  </Typography>
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Legend Control */}
        {showLegend && legendItems.length > 0 && (
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1,
                cursor: 'pointer'
              }}
              onClick={() => toggleSection('legend')}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                圖例控制
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {expandedSections.legend ? '收起' : '展開'}
              </Typography>
            </Box>
            <Collapse in={expandedSections.legend}>
              <List dense sx={{ pl: 3 }}>
                {legendItems.map((item) => (
                  <ListItem key={item.name} disablePadding>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={item.visible}
                          onChange={(e) => {
                            if (onLegendToggle) {
                              onLegendToggle(item.name, e.target.checked);
                            }
                          }}
                          sx={{
                            color: item.color,
                            '&.Mui-checked': {
                              color: item.color
                            }
                          }}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: item.color
                            }}
                          />
                          <Typography variant="body2">{item.name}</Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </Box>
        )}
      </Box>
    </Paper>
  );
};
