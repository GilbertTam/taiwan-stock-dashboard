'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { createChart, LineSeries, AreaSeries, LineStyle, ColorType, type IChartApi, type UTCTimestamp } from 'lightweight-charts';
import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chart-colors';
import type { InterconnectionFlow } from '@/types';

interface InterconnectionChartLightweightProps {
  data: InterconnectionFlow[];
}

const downsampleData = (data: any[], threshold = 500) => {
  if (data.length <= threshold) return data;
  const rate = Math.ceil(data.length / threshold);
  return data.filter((_, i) => i % rate === 0);
};

const toTime = (datetime: string): UTCTimestamp =>
  Math.floor(new Date(datetime).getTime() / 1000) as UTCTimestamp;

export const InterconnectionChartLightweight: React.FC<InterconnectionChartLightweightProps> = ({ data }) => {
  const { darkMode } = useTheme();
  const colors = useChartColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<{ setData: (data: { time: UTCTimestamp; value: number }[]) => void }[]>([]);

  const processedData = useMemo(() => {
    // 1. Sort by datetime first
    const sorted = [...data].sort((a, b) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    // 2. Deduplicate by timestamp (lightweight-charts requires strictly ascending, unique times)
    const seen = new Set<number>();
    const unique = sorted.filter(item => {
      const ts = new Date(item.datetime).getTime();
      if (seen.has(ts)) return false;
      seen.add(ts);
      return true;
    });

    // 3. Map to display values
    const mapped = unique.map((item) => ({
      ...item,
      display_forward_capacity: -Math.abs(item.forward_available_capacity),
      display_reverse_capacity: Math.abs(item.reverse_available_capacity),
      display_forward_flow: -Math.abs(item.forward_planned_flow || 0),
      display_reverse_flow: Math.abs(item.reverse_planned_flow || 0),
      net_flow: (item.reverse_planned_flow || 0) - (item.forward_planned_flow || 0),
    }));

    return downsampleData(mapped, 500);
  }, [data]);

  const reverseCapacityData = useMemo(
    () =>
      processedData.map((d: any) => ({ time: toTime(d.datetime), value: d.display_reverse_capacity })),
    [processedData]
  );
  const forwardCapacityData = useMemo(
    () =>
      processedData.map((d: any) => ({ time: toTime(d.datetime), value: d.display_forward_capacity })),
    [processedData]
  );
  const reverseFlowData = useMemo(
    () =>
      processedData.map((d: any) => ({ time: toTime(d.datetime), value: d.display_reverse_flow })),
    [processedData]
  );
  const forwardFlowData = useMemo(
    () =>
      processedData.map((d: any) => ({ time: toTime(d.datetime), value: d.display_forward_flow })),
    [processedData]
  );

  useEffect(() => {
    if (!containerRef.current || processedData.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: darkMode ? '#1a1a1a' : '#ffffff' },
        textColor: darkMode ? '#d9d9d9' : '#000000',
        attributionLogo: false,
      },
      grid: { vertLines: { color: darkMode ? '#333' : '#e6e6e6' }, horzLines: { color: darkMode ? '#333' : '#e6e6e6' } },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { vertLine: { labelVisible: true }, horzLine: { labelVisible: true } },
    });
    chartRef.current = chart;

    seriesRefs.current = [];
    if (reverseCapacityData.length) {
      const s = chart.addSeries(LineSeries, {
        color: colors.rainActual ?? '#2196f3',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'Reverse 容量',
      });
      s.setData(reverseCapacityData);
      seriesRefs.current.push(s);
    }
    if (forwardCapacityData.length) {
      const s = chart.addSeries(LineSeries, {
        color: colors.imbalance ?? '#f44336',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'Forward 容量',
      });
      s.setData(forwardCapacityData);
      seriesRefs.current.push(s);
    }
    if (reverseFlowData.length) {
      const s = chart.addSeries(AreaSeries, {
        topColor: (colors.rainActual ?? '#2196f3') + '40',
        bottomColor: (colors.rainActual ?? '#2196f3') + '00',
        lineColor: colors.rainActual ?? '#2196f3',
        lineWidth: 2,
        title: 'Reverse 流進',
      });
      s.setData(reverseFlowData);
      seriesRefs.current.push(s);
    }
    if (forwardFlowData.length) {
      const s = chart.addSeries(AreaSeries, {
        topColor: (colors.imbalance ?? '#f44336') + '40',
        bottomColor: (colors.imbalance ?? '#f44336') + '00',
        lineColor: colors.imbalance ?? '#f44336',
        lineWidth: 2,
        title: 'Forward 流出',
      });
      s.setData(forwardFlowData);
      seriesRefs.current.push(s);
    }

    chart.timeScale().fitContent();
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRefs.current = [];
    };
  }, [processedData.length, darkMode, colors.rainActual, colors.imbalance]);

  useEffect(() => {
    if (!chartRef.current || seriesRefs.current.length === 0) return;
    const series = seriesRefs.current;
    let idx = 0;
    if (reverseCapacityData.length && series[idx]) {
      series[idx].setData(reverseCapacityData);
      idx++;
    }
    if (forwardCapacityData.length && series[idx]) {
      series[idx].setData(forwardCapacityData);
      idx++;
    }
    if (reverseFlowData.length && series[idx]) {
      series[idx].setData(reverseFlowData);
      idx++;
    }
    if (forwardFlowData.length && series[idx]) {
      series[idx].setData(forwardFlowData);
    }
    chartRef.current.timeScale().fitContent();
  }, [reverseCapacityData, forwardCapacityData, reverseFlowData, forwardFlowData]);

  if (processedData.length === 0) {
    return (
      <Box sx={{ width: '100%', height: 350, mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
        無互連流量資料
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 350, mt: 2 }}>
      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
        連系線流量與容量分析
      </Typography>
      <div ref={containerRef} style={{ height: 320, width: '100%' }} />
    </Box>
  );
};
