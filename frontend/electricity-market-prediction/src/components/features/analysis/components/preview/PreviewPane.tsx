'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Minimize,
  Maximize,
  Close
} from '@mui/icons-material';
import ReactECharts from 'echarts-for-react';
import { EChartsOption } from 'echarts';
import { ChartDataPoint } from '@/utils/chartUtils';
import { format } from 'date-fns';
import { useTheme } from '@/app/ThemeProvider';

interface PreviewPaneProps {
  chartData: ChartDataPoint[];
  selectedModels: Array<{
    id: string | number;
    name: string;
    color: string;
    calculatingDate: string;
  }>;
  mainChartTimeRange?: {
    start: number;
    end: number;
  };
  onTimeRangeChange?: (start: number, end: number) => void;
  height?: number;
  onHeightChange?: (height: number) => void;
  minimized?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  chartData,
  selectedModels,
  mainChartTimeRange,
  onTimeRangeChange,
  height = 200,
  onHeightChange,
  minimized = false,
  onMinimize,
  onClose
}) => {
  const { darkMode } = useTheme();
  const chartRef = useRef<ReactECharts>(null);
  const isDraggingRef = useRef(false);

  // Prepare preview data - show all data points
  const previewData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];

    try {
      return chartData
        .filter(point => {
          if (!point || !point.timestamp) return false;
          return point.actualPrice !== null && point.actualPrice !== undefined;
        })
        .sort((a, b) => {
          const tsA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
          const tsB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
          return tsA - tsB;
        })
        .map(point => {
          const timestamp = typeof point.timestamp === 'number' ? point.timestamp : new Date(point.timestamp).getTime();
          return {
            timestamp,
            price: point.actualPrice as number,
            predictions: point.modelPredictions || []
          };
        });
    } catch (error) {
      console.error('Error processing preview data:', error);
      return [];
    }
  }, [chartData]);

  const chartOption = useMemo<EChartsOption>(() => {
    if (previewData.length === 0) return {};

    const textColor = darkMode ? '#d9d9d9' : '#000000';
    const gridColor = darkMode ? '#333' : '#e6e6e6';
    const primaryColor = 'var(--primary)';

    const series: any[] = [
      {
        name: '現貨實際價格',
        type: 'line' as const,
        data: previewData.map(d => [d.timestamp, d.price]),
        smooth: false,
        symbol: 'none',
        lineStyle: {
          color: '#ff4d4f',
          width: 1.5
        },
        emphasis: {
          focus: 'series'
        }
      }
    ];

    // Add model predictions
    selectedModels.forEach(model => {
      const modelData = previewData.map(d => {
        const pred = d.predictions.find(p => p.modelId === model.id && p.modelName === model.name);
        return [d.timestamp, pred ? pred.predictedPrice : null];
      }).filter(d => d[1] !== null);

      if (modelData.length > 0) {
        series.push({
          name: model.name,
          type: 'line' as const,
          data: modelData,
          smooth: false,
          symbol: 'none',
          lineStyle: {
            color: model.color,
            width: 1
          },
          emphasis: {
            focus: 'series'
          }
        });
      }
    });

    // Calculate brush range based on main chart
    let brushStart = 0;
    let brushEnd = 100;
    if (mainChartTimeRange && previewData.length > 0) {
      const dataStart = previewData[0].timestamp;
      const dataEnd = previewData[previewData.length - 1].timestamp;
      const dataRange = dataEnd - dataStart;
      
      if (dataRange > 0) {
        brushStart = ((mainChartTimeRange.start - dataStart) / dataRange) * 100;
        brushEnd = ((mainChartTimeRange.end - dataStart) / dataRange) * 100;
        brushStart = Math.max(0, Math.min(100, brushStart));
        brushEnd = Math.max(0, Math.min(100, brushEnd));
      }
    }

    return {
      backgroundColor: 'transparent',
      grid: {
        left: '5%',
        right: '5%',
        top: '10%',
        bottom: '15%',
        containLabel: false
      },
      xAxis: {
        type: 'time' as const,
        boundaryGap: [0, 0],
        axisLine: {
          lineStyle: {
            color: gridColor
          }
        },
        axisLabel: {
          color: textColor,
          fontSize: 9,
          show: !minimized
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value' as const,
        axisLine: {
          lineStyle: {
            color: gridColor
          }
        },
        axisLabel: {
          color: textColor,
          fontSize: 9,
          show: !minimized,
          formatter: (value: number) => `¥${value.toFixed(0)}`
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: gridColor,
            type: 'dashed' as const
          }
        }
      },
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: darkMode ? 'rgba(33, 33, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: darkMode ? '#444' : '#d9d9d9',
        textStyle: {
          color: textColor,
          fontSize: 11
        },
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const param = params[0];
          const time = param.axisValue;
          let result = `<div style="padding: 4px 0;"><div style="font-weight: bold; margin-bottom: 4px;">${format(new Date(time), 'yyyy-MM-dd HH:mm')}</div>`;
          params.forEach((p: any) => {
            if (p.value !== null && p.value !== undefined) {
              result += `<div><span style="color: ${p.color};">●</span> ${p.seriesName}: ¥${Number(p.value).toFixed(2)}</div>`;
            }
          });
          result += '</div>';
          return result;
        }
      },
      dataZoom: [
        {
          type: 'slider' as const,
          show: !minimized,
          xAxisIndex: 0,
          start: brushStart,
          end: brushEnd,
          height: 20,
          bottom: 5,
          borderColor: gridColor,
          textStyle: {
            color: textColor,
            fontSize: 9
          },
          handleStyle: {
            color: primaryColor
          },
          dataBackground: {
            areaStyle: {
              color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
            }
          },
          selectedDataBackground: {
            areaStyle: {
              color: darkMode ? 'rgba(0, 204, 122, 0.3)' : 'rgba(0, 204, 122, 0.2)'
            }
          }
        },
        {
          type: 'inside' as const,
          xAxisIndex: 0,
          start: brushStart,
          end: brushEnd
        }
      ],
      series,
      animation: false
    };
  }, [previewData, selectedModels, mainChartTimeRange, darkMode, minimized]);

  // Handle brush change to sync with main chart
  useEffect(() => {
    if (!chartRef.current || !onTimeRangeChange) return;

    const chartInstance = chartRef.current.getEchartsInstance();
    
    const handleBrush = () => {
      const option = chartInstance.getOption() as any;
      const dataZoom = option.dataZoom;
      if (dataZoom && dataZoom[0] && previewData.length > 0) {
        const startPercent = dataZoom[0].start || 0;
        const endPercent = dataZoom[0].end || 100;
        
        const dataStart = previewData[0].timestamp;
        const dataEnd = previewData[previewData.length - 1].timestamp;
        const dataRange = dataEnd - dataStart;
        
        const start = dataStart + (dataRange * startPercent / 100);
        const end = dataStart + (dataRange * endPercent / 100);
        
        onTimeRangeChange(start, end);
      }
    };

    chartInstance.on('datazoom', handleBrush);
    
    return () => {
      chartInstance.off('datazoom', handleBrush);
    };
  }, [previewData, onTimeRangeChange]);

  if (minimized) {
    return (
      <Paper
        sx={{
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          border: '1px solid var(--card-border)',
          backgroundColor: 'var(--card-bg)',
          borderRadius: 0
        }}
      >
        <Typography variant="caption" color="text.secondary">
          預覽圖表（已最小化）
        </Typography>
        <Box>
          {onMinimize && (
            <Tooltip title="展開">
              <IconButton size="small" onClick={onMinimize}>
                <Maximize fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onClose && (
            <Tooltip title="關閉">
              <IconButton size="small" onClick={onClose}>
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        height: height,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--card-border)',
        backgroundColor: 'var(--card-bg)',
        borderRadius: 0
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--card-border)'
        }}
      >
        <Typography variant="caption" fontWeight="bold">
          預覽圖表
        </Typography>
        <Box>
          {onMinimize && (
            <Tooltip title="最小化">
              <IconButton size="small" onClick={onMinimize}>
                <Minimize fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onClose && (
            <Tooltip title="關閉">
              <IconButton size="small" onClick={onClose}>
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Chart */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        {previewData.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              無資料可顯示
            </Typography>
          </Box>
        ) : (
          <ReactECharts
            ref={chartRef}
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        )}
      </Box>
    </Paper>
  );
};
