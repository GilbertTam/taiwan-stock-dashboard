/**
 * ECharts Helper Functions
 * Provides reusable configuration functions for common chart elements
 */

import { EChartsOption } from 'echarts';
import { startOfDay } from 'date-fns';
import { ChartColors } from './chart-colors';

/**
 * Creates a standardized time axis configuration
 */
export const createTimeAxis = (
  colors: ChartColors,
  dataMinTime?: number,
  dataMaxTime?: number
): EChartsOption['xAxis'] => {
  return {
    type: 'time',
    axisLabel: {
      formatter: {
        year: '{yyyy}',
        month: '{MMM}',
        day: '{d}',
        hour: '{HH}:{mm}',
        minute: '{HH}:{mm}',
      },
      color: colors.text,
      hideOverlap: true,
      fontSize: 11,
    },
    axisPointer: {
      show: true,
      type: 'line',
      label: {
        show: true,
        backgroundColor: colors.tooltipHeaderBg,
        color: colors.text,
      },
      snap: true,
    },
    axisLine: { lineStyle: { color: colors.text } },
    splitLine: { show: false },
    ...(dataMinTime && { min: dataMinTime }),
    ...(dataMaxTime && { max: dataMaxTime }),
  };
};

/**
 * Creates a standardized value axis configuration
 */
export const createValueAxis = (
  colors: ChartColors,
  options: {
    name?: string;
    position?: 'left' | 'right';
    offset?: number;
    unit?: string;
    min?: number;
    max?: number;
    nameLocation?: 'start' | 'middle' | 'end';
    nameGap?: number;
    nameRotate?: number;
  } = {}
): EChartsOption['yAxis'] => {
  const {
    name,
    position = 'left',
    offset = 0,
    unit,
    min,
    max,
    nameLocation = 'start',
    nameGap = 20,
    nameRotate = 0,
  } = options;

  return {
    type: 'value',
    name: name ? (unit ? `${name} (${unit})` : name) : undefined,
    nameTextStyle: name
      ? {
        color: colors.text,
        padding: [0, 0, 0, 20],
      }
      : undefined,
    nameLocation,
    nameGap,
    nameRotate,
    position,
    offset: offset !== 0 ? offset : undefined,
    axisLabel: {
      color: colors.text,
      fontSize: 11,
      ...(unit && { formatter: `{value} ${unit}` }),
    },
    splitLine: {
      lineStyle: {
        color: colors.grid,
        type: 'dashed',
      },
    },
    axisLine: {
      lineStyle: { color: colors.text },
      ...(position === 'right' && { show: true }),
    },
    ...(min !== undefined && { min }),
    ...(max !== undefined && { max }),
  };
};

/**
 * Creates a standardized grid configuration
 */
export const createGrid = (
  options: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    containLabel?: boolean;
  } = {}
): EChartsOption['grid'] => {
  const {
    left = 50,
    right = 40,
    top = 40,
    bottom = 60,
    containLabel = true,
  } = options;

  return {
    left,
    right,
    top,
    bottom,
    containLabel,
  };
};

/**
 * Creates a standardized tooltip configuration
 */
export const createTooltip = (
  colors: ChartColors,
  options: {
    formatter?: string | ((params: any) => string);
    trigger?: 'item' | 'axis' | 'none';
    show?: boolean;
  } = {}
): EChartsOption['tooltip'] => {
  const { formatter, trigger = 'axis', show = true } = options;

  return {
    show,
    trigger,
    backgroundColor: colors.tooltipBg,
    borderColor: colors.tooltipBorder,
    borderWidth: 1,
    textStyle: {
      color: colors.text,
      fontSize: 12,
    },
    ...(formatter && { formatter }),
    axisPointer: {
      type: 'cross',
      label: {
        backgroundColor: colors.tooltipHeaderBg,
      },
    },
  };
};

/**
 * Creates mark area data for alternating day shading
 */
export const createMarkArea = (
  timestamps: number[],
  darkMode: boolean
): any[] => {
  if (timestamps.length === 0) return [];

  const markAreaData: any[] = [];
  const currentStart = timestamps[0];
  const endTimestamp = timestamps[timestamps.length - 1];
  let iterTime = startOfDay(new Date(currentStart)).getTime();
  const dayMillis = 24 * 60 * 60 * 1000;
  let dayIndex = 0;

  while (iterTime < endTimestamp) {
    if (dayIndex % 2 !== 0) {
      markAreaData.push([
        { xAxis: Math.max(iterTime, currentStart) },
        { xAxis: Math.min(iterTime + dayMillis, endTimestamp) },
      ]);
    }
    iterTime += dayMillis;
    dayIndex++;
  }

  return markAreaData;
};

/**
 * Creates a ghost series for mark area (background shading)
 */
export const createGhostSeries = (
  timestamps: number[],
  yValue: number,
  markAreaData: any[],
  darkMode: boolean
): any => {
  if (timestamps.length === 0) return null;

  return {
    name: 'Ghost',
    type: 'line',
    data: timestamps.map((ts) => [ts, yValue]),
    itemStyle: { opacity: 0 },
    lineStyle: { opacity: 0 },
    showSymbol: false,
    silent: true,
    z: 0,
    animation: false,
    markArea: {
      silent: true,
      itemStyle: {
        color: darkMode ? '#444444' : '#e0e0e0',
        opacity: 0.4,
      },
      data: markAreaData,
    },
  };
};

/**
 * Creates a reference line configuration
 */
export const createReferenceLine = (
  value: number,
  colors: ChartColors,
  options: {
    label?: string;
    lineStyle?: {
      type?: 'solid' | 'dashed' | 'dotted';
      width?: number;
    };
  } = {}
): any => {
  const { label, lineStyle = { type: 'dashed', width: 1 } } = options;

  return {
    type: 'line',
    markLine: {
      silent: true,
      symbol: 'none',
      label: label
        ? {
          formatter: label,
          position: 'end',
          color: colors.warning,
        }
        : { show: false },
      lineStyle: {
        color: colors.text,
        opacity: 0.5,
        ...lineStyle,
      },
      data: [{ yAxis: value }],
    },
  };
};
