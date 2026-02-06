'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Paper, Typography, Box, CircularProgress } from '@mui/material';
import { useRouter } from 'next/navigation';
import ReactECharts from 'echarts-for-react';
import { EChartsOption } from 'echarts';
import { ChartDataPoint } from '@/utils/chartUtils';
import { format, subDays } from 'date-fns';
import { useTheme } from '@/app/ThemeProvider';

interface PriceTrendPreviewProps {
  chartData: ChartDataPoint[];
  selectedArea: string;
}

interface HoveredDataPoint {
  timestamp: number;
  price: number;
  timeLabel: string;
}

export const PriceTrendPreview: React.FC<PriceTrendPreviewProps> = ({
  chartData,
  selectedArea
}) => {
  const router = useRouter();
  const { darkMode } = useTheme();
  const chartRef = useRef<ReactECharts>(null);
  const [hoveredData, setHoveredData] = useState<HoveredDataPoint | null>(null);

  // Get last 7 days of data with proper validation
  const previewData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    
    try {
      const sevenDaysAgo = subDays(new Date(), 7).getTime();
      const now = Date.now();
      
      // Filter and validate data
      const filtered = chartData
        .filter(point => {
          if (!point || !point.timestamp) return false;
          
          // Validate timestamp
          const timestamp = typeof point.timestamp === 'number' ? point.timestamp : new Date(point.timestamp).getTime();
          if (isNaN(timestamp)) return false;
          
          // Validate actualPrice - must be a valid number
          const price = typeof point.actualPrice === 'number' ? point.actualPrice : Number(point.actualPrice);
          if (isNaN(price) || price === null || price === undefined) return false;
          
          return timestamp >= sevenDaysAgo && timestamp <= now;
        })
        .sort((a, b) => {
          const tsA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
          const tsB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
          return tsA - tsB;
        })
        .slice(-96); // Last 96 data points (approximately 7 days with 30-min intervals)
      
      return filtered.map(point => {
        const timestamp = typeof point.timestamp === 'number' ? point.timestamp : new Date(point.timestamp).getTime();
        // Ensure price is a valid number
        const price = typeof point.actualPrice === 'number' 
          ? point.actualPrice 
          : Number(point.actualPrice);
        
        // Final validation to prevent NaN
        if (isNaN(price) || price === null || price === undefined) {
          console.warn('Invalid price value:', point.actualPrice, 'for point:', point);
          return null;
        }
        
        return {
          timestamp,
          price: price,
          timeLabel: format(new Date(timestamp), 'MM/dd HH:mm')
        };
      }).filter((item): item is { timestamp: number; price: number; timeLabel: string } => item !== null);
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

    return {
      backgroundColor: 'transparent',
      grid: {
        left: '10%',
        right: '5%',
        top: '15%',
        bottom: '20%',
        containLabel: false
      },
      xAxis: {
        type: 'time',
        boundaryGap: [0, 0],
        axisLine: {
          lineStyle: {
            color: gridColor
          }
        },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          rotate: -45,
          formatter: (value: number) => {
            try {
              return format(new Date(value), 'MM/dd HH:mm');
            } catch {
              return '';
            }
          }
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: gridColor,
            type: 'dashed'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '價格 (¥)',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: textColor,
          fontSize: 11
        },
        axisLine: {
          lineStyle: {
            color: gridColor
          }
        },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          formatter: (value: number) => `¥${value.toFixed(0)}`
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: gridColor,
            type: 'dashed'
          }
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            show: true,
            backgroundColor: darkMode ? 'rgba(33, 33, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            color: textColor
          }
        },
        backgroundColor: darkMode ? 'rgba(33, 33, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: darkMode ? '#444' : '#d9d9d9',
        textStyle: {
          color: textColor
        },
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const param = Array.isArray(params) ? params[0] : params;
          const time = param.axisValue;
          const price = param.value;
          
          // Validate price value - try to get from data array if value is array
          let priceNum: number;
          if (Array.isArray(price)) {
            priceNum = price[1] || price[0];
          } else {
            priceNum = typeof price === 'number' ? price : Number(price);
          }
          
          if (isNaN(priceNum) || !isFinite(priceNum)) {
            // Try to find price from data point
            const timestamp = typeof time === 'number' ? time : new Date(time).getTime();
            const dataPoint = previewData.find(d => Math.abs(d.timestamp - timestamp) < 1800000); // Within 30 min
            if (dataPoint) {
              priceNum = dataPoint.price;
            } else {
              return '';
            }
          }
          
          return `
            <div style="padding: 4px 0;">
              <div style="font-weight: bold; margin-bottom: 4px;">${format(new Date(time), 'yyyy-MM-dd HH:mm')}</div>
              <div>價格: <span style="color: ${primaryColor}; font-weight: bold;">¥${priceNum.toFixed(2)}</span></div>
            </div>
          `;
        }
      },
      series: [
        {
          name: '實際價格',
          type: 'line',
          data: previewData
            .filter(d => !isNaN(d.price) && isFinite(d.price) && d.price !== null && d.price !== undefined)
            .map(d => [d.timestamp, d.price]),
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: primaryColor,
            width: 2
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: darkMode ? 'rgba(0, 204, 122, 0.3)' : 'rgba(0, 204, 122, 0.1)' },
                { offset: 1, color: 'transparent' }
              ]
            }
          },
          emphasis: {
            focus: 'series'
          }
        }
      ],
      animation: false
    };
  }, [previewData, darkMode]);

  // Handle mouse move to track hovered data point
  useEffect(() => {
    if (!chartRef.current || previewData.length === 0) return;

    const chartInstance = chartRef.current.getEchartsInstance();
    
    const findNearestDataPoint = (targetTimestamp: number): HoveredDataPoint | null => {
      if (previewData.length === 0) return null;
      
      let nearest = previewData[0];
      let minDiff = Math.abs(previewData[0].timestamp - targetTimestamp);
      
      for (const point of previewData) {
        const diff = Math.abs(point.timestamp - targetTimestamp);
        if (diff < minDiff) {
          minDiff = diff;
          nearest = point;
        }
      }
      
      return nearest;
    };
    
    const handleMouseMove = (params: any) => {
      if (!params) return;
      
      let timestamp: number | null = null;
      let price: number | null = null;
      
      // Try to get timestamp from axisValue (from axisPointer)
      if (params.axisValue !== undefined && params.axisValue !== null) {
        timestamp = typeof params.axisValue === 'number' 
          ? params.axisValue 
          : new Date(params.axisValue).getTime();
      }
      
      // Try to get price from value
      if (params.value !== undefined && params.value !== null) {
        if (Array.isArray(params.value)) {
          // Value is [timestamp, price] array
          timestamp = params.value[0];
          price = params.value[1];
        } else if (typeof params.value === 'number') {
          price = params.value;
        }
      }
      
      // If we have timestamp, find nearest data point
      if (timestamp !== null && !isNaN(timestamp)) {
        const nearest = findNearestDataPoint(timestamp);
        if (nearest) {
          setHoveredData(nearest);
          return;
        }
      }
      
      // If we have both timestamp and price, use them directly
      if (timestamp !== null && price !== null && !isNaN(price) && !isNaN(timestamp)) {
        setHoveredData({
          timestamp,
          price,
          timeLabel: format(new Date(timestamp), 'MM/dd HH:mm')
        });
      }
    };

    // Also listen to axisPointer events
    const handleAxisPointer = (params: any) => {
      if (params && params.axisValue !== undefined) {
        const timestamp = typeof params.axisValue === 'number' 
          ? params.axisValue 
          : new Date(params.axisValue).getTime();
        
        if (!isNaN(timestamp)) {
          const nearest = findNearestDataPoint(timestamp);
          if (nearest) {
            setHoveredData(nearest);
          }
        }
      }
    };

    chartInstance.on('mousemove', handleMouseMove);
    chartInstance.on('axisPointer', handleAxisPointer);

    return () => {
      chartInstance.off('mousemove', handleMouseMove);
      chartInstance.off('axisPointer', handleAxisPointer);
    };
  }, [previewData]);

  // Set default to latest data point if available
  useEffect(() => {
    if (previewData.length > 0 && !hoveredData) {
      const latest = previewData[previewData.length - 1];
      setHoveredData(latest);
    }
  }, [previewData]);

  if (previewData.length === 0) {
    return (
      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          boxShadow: 2,
          border: '1px solid var(--card-border)',
          backgroundColor: 'var(--card-bg)',
          cursor: 'pointer',
          '&:hover': {
            boxShadow: 4,
            borderColor: 'var(--primary)',
          }
        }}
        onClick={() => router.push('/dashboard/price-prediction')}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            價格趨勢預覽
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <Typography variant="body2" color="text.secondary">
            無資料可顯示
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 2,
        boxShadow: 2,
        border: '1px solid var(--card-border)',
        backgroundColor: 'var(--card-bg)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
          borderColor: 'var(--primary)',
        }
      }}
      onClick={() => router.push('/dashboard/price-prediction')}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          價格趨勢預覽
        </Typography>
        <Typography variant="caption" color="text.secondary">
          最近 7 天 · 點擊查看詳細
        </Typography>
      </Box>
      
      {/* Hovered Data Display - TradingView style */}
      {hoveredData && (
        <Box
          sx={{
            mb: 1,
            p: 1,
            borderRadius: 1,
            backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            border: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              {selectedArea}
            </Typography>
            <Typography variant="caption" color="text.primary" fontWeight="bold">
              {hoveredData.timeLabel}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              pl: 1.5,
              borderLeft: '1px solid var(--card-border)'
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'var(--primary)'
              }}
            />
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              價格:
            </Typography>
            <Typography variant="caption" color="var(--primary)" fontWeight="bold">
              ¥{hoveredData.price.toFixed(2)}
            </Typography>
          </Box>
        </Box>
      )}
      
      <Box sx={{ width: '100%', height: 200 }}>
        <ReactECharts
          ref={chartRef}
          option={chartOption}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </Box>
    </Paper>
  );
};
