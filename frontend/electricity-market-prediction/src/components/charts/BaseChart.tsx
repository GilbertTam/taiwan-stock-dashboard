/**
 * BaseChart Component
 * Wrapper component for ECharts with standardized configuration
 */

import React, { useMemo, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, BoxProps } from '@mui/material';
import { EChartsOption } from 'echarts';
import { useChartColors } from '@/utils/chart-colors';
import { useTheme } from '@/app/ThemeProvider';
import { createBaseEChartsOption } from '@/utils/echartsTheme';

export interface BaseChartProps extends Omit<BoxProps, 'children'> {
  option: EChartsOption;
  height?: number | string;
  onEvents?: Record<string, (params: any) => void>;
  notMerge?: boolean;
  showLoading?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChartReady?: (instance: any) => void;
}

/**
 * BaseChart - Standardized ECharts wrapper component
 */
export const BaseChart: React.FC<BaseChartProps> = ({
  option,
  height = 450,
  onEvents,
  notMerge = true,
  showLoading = false,
  onChartReady,
  sx,
  ...boxProps
}) => {
  const chartRef = useRef<ReactECharts>(null);

  useEffect(() => {
    if (onChartReady && chartRef.current) {
      const instance = chartRef.current.getEchartsInstance();
      if (instance) onChartReady(instance);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const colors = useChartColors();
  const { darkMode } = useTheme();

  // Merge base theme with provided option
  const mergedOption = useMemo(() => {
    const baseOption = createBaseEChartsOption(
      { colors, darkMode },
      {
        animation: false,
      }
    );

    // Deep merge: base option first, then custom option overrides
    return {
      ...baseOption,
      ...option,
      // Ensure series, xAxis, yAxis arrays are properly merged
      series: option.series || baseOption.series,
      xAxis: option.xAxis || baseOption.xAxis,
      yAxis: option.yAxis || baseOption.yAxis,
    };
  }, [option, colors, darkMode]);

  return (
    <Box
      sx={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        ...sx,
      }}
      {...boxProps}
    >
      <ReactECharts
        ref={chartRef}
        option={mergedOption}
        style={{ height: '100%', width: '100%' }}
        notMerge={notMerge}
        onEvents={onEvents}
        showLoading={showLoading}
      />
    </Box>
  );
};

export default BaseChart;
