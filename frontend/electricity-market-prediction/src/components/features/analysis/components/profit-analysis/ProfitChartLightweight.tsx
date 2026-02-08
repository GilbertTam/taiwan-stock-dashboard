'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import {
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useChartLifecycle } from '@/hooks/useChartLifecycle';

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
  const lineSeriesRefs = useRef<ISeriesApi<'Line'>[]>([]);
  const barSeriesRefs = useRef<ISeriesApi<'Histogram'>[]>([]);

  const chartRef = useChartLifecycle({
    containerRef,
    colors,
    darkMode,
    chartOptions: {
      layout: { attributionLogo: false },
      leftPriceScale: {
        visible: true,
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.2 },
        title: '每日收益 (¥)',
      },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.2 },
        title: '累計收益 (¥)',
      },
      timeScale: {
        borderVisible: false,
        secondsVisible: false,
        barSpacing: 6,
        minBarSpacing: 3,
      },
    },
  });

  const toTime = (dateStr: string): UTCTimestamp =>
    Math.floor(new Date(dateStr).getTime() / 1000) as UTCTimestamp;

  /** 同一天內每根柱子間隔（秒），使柱子並排不重疊 */
  const BAR_OFFSET_SECONDS = 2 * 3600; // 2 小時

  // 每日收益（左軸 bar），時間偏移使 Optimal + 各模型並排
  const dailyActualData = useMemo(() => {
    if (!combinedData?.length) return [];
    return combinedData
      .filter((d: any) => d.actualProfit != null && !isNaN(d.actualProfit))
      .map((d: any) => ({
        time: (toTime(d.date) + 0 * BAR_OFFSET_SECONDS) as UTCTimestamp,
        value: Number(d.actualProfit),
      }));
  }, [combinedData]);

  const dailyModelData = useMemo(() => {
    if (!combinedData?.length) return {};
    const out: Record<string, { time: UTCTimestamp; value: number }[]> = {};
    selectedModels.forEach((model, index) => {
      const modelKey = `${model.id}|${model.name}`;
      const offsetIndex = index + 1; // Optimal 佔 0，模型從 1 開始
      out[modelKey] = combinedData
        .filter((d: any) => {
          const v = d[`${modelKey}_profit`];
          return v != null && !isNaN(v);
        })
        .map((d: any) => ({
          time: (toTime(d.date) + offsetIndex * BAR_OFFSET_SECONDS) as UTCTimestamp,
          value: Number(d[`${modelKey}_profit`]),
        }));
    });
    return out;
  }, [combinedData, selectedModels]);

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
    if (!chartRef.current) return;
    const chart = chartRef.current;

    lineSeriesRefs.current = [];
    barSeriesRefs.current = [];

    // 左軸：每日收益 bar（多柱：Optimal + 各模型）
    if (dailyActualData.length > 0) {
      const actualBar = chart.addSeries(HistogramSeries, {
        color: colors.actual ?? '#ff4d4f',
        priceScaleId: 'left',
        title: 'Optimal (Daily)',
      });
      actualBar.setData(dailyActualData);
      barSeriesRefs.current.push(actualBar);
    }
    selectedModels.forEach((model) => {
      const modelKey = `${model.id}|${model.name}`;
      const data = dailyModelData[modelKey];
      if (data?.length) {
        const bar = chart.addSeries(HistogramSeries, {
          color: modelColorMap[modelKey] || model.color,
          priceScaleId: 'left',
          title: `${model.name} (Daily)`,
        });
        bar.setData(data);
        barSeriesRefs.current.push(bar);
      }
    });

    // 右軸：累計收益 line
    if (cumulativeActualData.length > 0) {
      const actualLine = chart.addSeries(LineSeries, {
        color: colors.actual ?? '#ff4d4f',
        lineWidth: 2,
        priceScaleId: 'right',
        title: 'Optimal (Cumulative)',
      });
      actualLine.setData(cumulativeActualData);
      lineSeriesRefs.current.push(actualLine);
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
        lineSeriesRefs.current.push(series);
      }
    });

    chart.timeScale().fitContent();

    return () => {
      lineSeriesRefs.current = [];
      barSeriesRefs.current = [];
    };
  }, [
    selectedModels.length,
    modelColorMap,
    colors.actual,
    darkMode,
    chartRef,
  ]);

  useEffect(() => {
    if (!chartRef.current) return;

    let barIdx = 0;
    if (dailyActualData.length > 0 && barSeriesRefs.current[barIdx]) {
      barSeriesRefs.current[barIdx].setData(dailyActualData);
      barIdx++;
    }
    selectedModels.forEach((model) => {
      const modelKey = `${model.id}|${model.name}`;
      const data = dailyModelData[modelKey];
      if (data?.length && barSeriesRefs.current[barIdx]) {
        barSeriesRefs.current[barIdx].setData(data);
        barIdx++;
      }
    });

    let lineIdx = 0;
    if (cumulativeActualData.length > 0 && lineSeriesRefs.current[lineIdx]) {
      lineSeriesRefs.current[lineIdx].setData(cumulativeActualData);
      lineIdx++;
    }
    selectedModels.forEach((model) => {
      const modelKey = `${model.id}|${model.name}`;
      const data = cumulativeModelData[modelKey];
      if (data?.length && lineSeriesRefs.current[lineIdx]) {
        lineSeriesRefs.current[lineIdx].setData(data);
        lineIdx++;
      }
    });

    chartRef.current?.timeScale().fitContent();
  }, [dailyActualData, dailyModelData, cumulativeActualData, cumulativeModelData, selectedModels]);

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" component="h3" sx={{ color: colors.text, fontWeight: 'bold', mb: 2 }}>
        Profit Analysis (Daily & Cumulative)
      </Typography>
      <div ref={containerRef} style={{ height: 400, width: '100%' }} />
    </Box>
  );
};
