/**
 * ECharts Theme Configuration
 * Provides unified theme configuration for all ECharts instances
 */

import { ChartColors } from './chart-colors';
import {
  createTimeAxis,
  createValueAxis,
  createGrid,
  createTooltip,
} from './echartsHelpers';

export interface EChartsThemeConfig {
  colors: ChartColors;
  darkMode: boolean;
}

/**
 * Creates a base ECharts option with standardized configuration
 */
export const createBaseEChartsOption = (
  config: EChartsThemeConfig,
  customOptions: {
    grid?: any;
    xAxis?: any;
    yAxis?: any | any[];
    tooltip?: any;
    series?: any[];
    dataZoom?: any[];
    animation?: boolean;
  } = {}
): any => {
  const { colors, darkMode } = config;
  const {
    grid,
    xAxis,
    yAxis,
    tooltip,
    series = [],
    dataZoom,
    animation = false,
  } = customOptions;

  return {
    backgroundColor: 'transparent',
    color: [
      colors.actual,
      colors.predicted,
      colors.imbalance,
      colors.interconnection,
      colors.intraday,
      colors.occtoArea,
      colors.tempActual,
      colors.tempForecast,
      colors.rainActual,
      colors.rainForecast,
      colors.windActual,
      colors.windForecast,
    ],
    grid: grid || createGrid(),
    xAxis: xAxis || createTimeAxis(colors),
    yAxis: yAxis || createValueAxis(colors),
    tooltip: tooltip || createTooltip(colors),
    series,
    ...(dataZoom && { dataZoom }),
    animation,
    textStyle: {
      color: colors.text,
      fontSize: 12,
    },
  };
};

/**
 * Standard grid configuration
 */
export const getStandardGrid = (rightMargin = 40) => {
  return createGrid({
    left: 50,
    right: rightMargin,
    top: 40,
    bottom: 60,
    containLabel: true,
  });
};

/**
 * Standard tooltip configuration (empty formatter for custom tooltips)
 */
export const getStandardTooltip = (colors: ChartColors) => {
  return {
    show: true,
    trigger: 'axis' as const,
    axisPointer: {
      type: 'cross' as const,
      show: true,
      label: {
        show: true,
        backgroundColor: colors.tooltipHeaderBg,
        color: colors.text,
      },
      animation: false,
    },
    formatter: () => '', // Empty content for custom tooltips
    backgroundColor: 'transparent',
    borderWidth: 0,
    textStyle: { fontSize: 0 },
    triggerOn: 'mousemove' as const,
    extraCssText: 'pointer-events: none;',
  };
};

/**
 * Standard data zoom configuration
 */
export const getStandardDataZoom = (colors: ChartColors) => {
  return [
    {
      type: 'slider',
      show: true,
      xAxisIndex: 0,
      start: 0,
      end: 100,
      height: 25,
      bottom: 10,
      borderColor: colors.grid,
      textStyle: { color: colors.text },
    },
    {
      type: 'inside',
      xAxisIndex: 0,
      start: 0,
      end: 100,
    },
  ];
};
