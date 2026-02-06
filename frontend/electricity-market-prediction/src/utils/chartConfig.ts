/**
 * Chart Configuration Utilities
 * Common configuration patterns and utilities for charts
 */

import { EChartsOption } from 'echarts';
import { ChartColors } from './chartColors';
import {
  createTimeAxis,
  createValueAxis,
  createGrid,
  createTooltip,
} from './echartsHelpers';

/**
 * Standard chart configuration presets
 */
export const ChartConfig = {
  /**
   * Creates a standard line chart configuration
   */
  createLineChart: (
    colors: ChartColors,
    options: {
      dataMinTime?: number;
      dataMaxTime?: number;
      yAxisName?: string;
      yAxisUnit?: string;
      yAxisMin?: number;
      yAxisMax?: number;
      grid?: any;
    } = {}
  ): Partial<EChartsOption> => {
    const {
      dataMinTime,
      dataMaxTime,
      yAxisName = 'Value',
      yAxisUnit,
      yAxisMin,
      yAxisMax,
      grid,
    } = options;

    return {
      grid: grid || createGrid(),
      xAxis: createTimeAxis(colors, dataMinTime, dataMaxTime),
      yAxis: createValueAxis(colors, {
        name: yAxisName,
        unit: yAxisUnit,
        min: yAxisMin,
        max: yAxisMax,
      }),
      tooltip: createTooltip(colors),
    };
  },

  /**
   * Creates a standard bar chart configuration
   */
  createBarChart: (
    colors: ChartColors,
    options: {
      dataMinTime?: number;
      dataMaxTime?: number;
      yAxisName?: string;
      yAxisUnit?: string;
      grid?: any;
    } = {}
  ): Partial<EChartsOption> => {
    return ChartConfig.createLineChart(colors, options);
  },

  /**
   * Creates a standard area chart configuration
   */
  createAreaChart: (
    colors: ChartColors,
    options: {
      dataMinTime?: number;
      dataMaxTime?: number;
      yAxisName?: string;
      yAxisUnit?: string;
      grid?: any;
    } = {}
  ): Partial<EChartsOption> => {
    return ChartConfig.createLineChart(colors, options);
  },

  /**
   * Creates a multi-axis chart configuration
   */
  createMultiAxisChart: (
    colors: ChartColors,
    axes: Array<{
      name: string;
      unit?: string;
      position: 'left' | 'right';
      offset?: number;
      min?: number;
      max?: number;
    }>,
    options: {
      dataMinTime?: number;
      dataMaxTime?: number;
      grid?: any;
    } = {}
  ): Partial<EChartsOption> => {
    const { dataMinTime, dataMaxTime, grid } = options;

    // `createValueAxis` is typed as `EChartsOption['yAxis']` which is a union.
    // Here we know we are creating one axis per entry, so treat each as a single axis option.
    const yAxes = axes.map((axis, index) =>
      createValueAxis(colors, {
        name: axis.name,
        unit: axis.unit,
        position: axis.position,
        offset: axis.offset || (index > 0 ? (index - 1) * 50 : 0),
        min: axis.min,
        max: axis.max,
      })
    ) as any[];

    // Calculate right margin based on number of right axes
    const rightAxesCount = axes.filter((a) => a.position === 'right').length;
    const rightMargin = rightAxesCount > 0 ? 40 + (rightAxesCount - 1) * 50 : 40;

    return {
      grid: grid || createGrid({ right: rightMargin }),
      xAxis: createTimeAxis(colors, dataMinTime, dataMaxTime),
      yAxis: yAxes.length === 1 ? yAxes[0] : yAxes,
      tooltip: createTooltip(colors),
    };
  },
};
