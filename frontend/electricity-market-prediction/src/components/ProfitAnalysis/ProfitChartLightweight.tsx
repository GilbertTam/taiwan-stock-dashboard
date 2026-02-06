'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { createChart, LineSeries, ColorType, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';

interface ProfitChartLightweightProps {
  combinedData: any[];
  selectedModels: { id: string | number; name: string; color: string; calculatingDate: string }[];
  modelColorMap: Record<string, string>;
  colors: any;
  darkMode: boolean;
}

export const ProfitChartLightweight: React.FC<ProfitChartLightweightProps> = ({
  combinedData,
  selectedModels,
  modelColorMap,
  colors,
  darkMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<ISeriesApi<'Line'>[]>([]);

  const toTime = (dateStr: string): UTCTimestamp =>
    Math.floor(new Date(dateStr).getTime() / 1000) as UTCTimestamp;

  const cumulativeActualData = useMemo(() => {
    if (!combinedData?.length) return [];
    return combinedData
      .filter((d: any) => d.cumulativeActual != null && !isNaN(d.cumulativeActual))
      .map((d: any) => ({ time: toTime(d.date), value: Number(d.cumulativeActual) }));
  }, [combinedData]);

  const cumulativeModelData = useMemo(() => {
    if (!combinedData?.length) return {};
    const out: Record<string, { time: UTCTimestamp; value: number }[]> = {};
    selectedModels.forEach((model) => {
      const modelKey = `${model.id}|${model.name}`;
      out[modelKey] = combinedData
        .filter((d: any) => {
          const v = d[`${modelKey}_cumulative`];
          return v != null && !isNaN(v);
        })
        .map((d: any) => ({ time: toTime(d.date), value: Number(d[`${modelKey}_cumulative`]) }));
    });
    return out;
  }, [combinedData, selectedModels]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: darkMode ? '#1a1a1a' : '#ffffff' },
        textColor: darkMode ? '#d9d9d9' : '#000000',
      },
      grid: { vertLines: { color: darkMode ? '#333' : '#e6e6e6' }, horzLines: { color: darkMode ? '#333' : '#e6e6e6' } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.2 } },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { vertLine: { labelVisible: true }, horzLine: { labelVisible: true } },
    });
    chartRef.current = chart;
    seriesRefs.current = [];

    if (cumulativeActualData.length > 0) {
      const actualSeries = chart.addSeries(LineSeries, {
        color: colors.actual ?? '#ff4d4f',
        lineWidth: 2,
        priceScaleId: 'right',
        title: 'Optimal (Cumulative)',
      });
      actualSeries.setData(cumulativeActualData);
      seriesRefs.current.push(actualSeries);
    }

    selectedModels.forEach((model) => {
      const modelKey = `${model.id}|${model.name}`;
      const data = cumulativeModelData[modelKey];
      if (data?.length) {
        const series = chart.addSeries(LineSeries, {
          color: modelColorMap[modelKey] || model.color,
          lineWidth: 2,
          priceScaleId: 'right',
          title: `${model.name} (Cumulative)`,
        });
        series.setData(data);
        seriesRefs.current.push(series);
      }
    });

    chart.timeScale().fitContent();
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRefs.current = [];
    };
  }, [selectedModels.length, modelColorMap, colors.actual, darkMode]);

  useEffect(() => {
    if (!chartRef.current || seriesRefs.current.length === 0) return;
    if (cumulativeActualData.length > 0 && seriesRefs.current[0]) {
      seriesRefs.current[0].setData(cumulativeActualData);
    }
    let idx = cumulativeActualData.length > 0 ? 1 : 0;
    selectedModels.forEach((model) => {
      const modelKey = `${model.id}|${model.name}`;
      const data = cumulativeModelData[modelKey];
      if (data?.length && seriesRefs.current[idx]) {
        seriesRefs.current[idx].setData(data);
        idx++;
      }
    });
    chartRef.current?.timeScale().fitContent();
  }, [cumulativeActualData, cumulativeModelData, selectedModels]);

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" component="h3" sx={{ color: colors.text, fontWeight: 'bold', mb: 2 }}>
        Profit Analysis (Cumulative)
      </Typography>
      <div ref={containerRef} style={{ height: 400, width: '100%' }} />
    </Box>
  );
};
