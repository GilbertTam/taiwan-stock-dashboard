'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { createChart, LineSeries, ColorType, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import { TimeSlot, TimeSlotDescription } from '@/types';
import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chartColors';

interface MaeChartLightweightProps {
  dailyMAEs: any[];
  selectedModels: { id: string | number; name: string; color: string; calculatingDate: string }[];
  modelColorMap: Record<string, string>;
  selectedTimeSlot: TimeSlot;
  onTimeSlotChange: (slot: TimeSlot) => void;
}

export const MaeChartLightweight: React.FC<MaeChartLightweightProps> = ({
  dailyMAEs,
  selectedModels,
  modelColorMap,
  selectedTimeSlot,
  onTimeSlotChange,
}) => {
  const { darkMode } = useTheme();
  const colors = useChartColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<ISeriesApi<'Line'>[]>([]);

  const toTime = (dateStr: string): UTCTimestamp =>
    Math.floor(new Date(dateStr).getTime() / 1000) as UTCTimestamp;

  const dataKey = selectedTimeSlot === TimeSlot.ALL ? '_mae' : `_${selectedTimeSlot}_mae`;

  const seriesData = useMemo(() => {
    if (!dailyMAEs?.length) return {};
    const out: Record<string, { time: UTCTimestamp; value: number }[]> = {};
    selectedModels.forEach((model) => {
      const modelKey = `${model.id}|${model.name}`;
      const key = `${modelKey}${dataKey}`;
      out[modelKey] = dailyMAEs
        .filter((d: any) => {
          const v = d[key];
          return v != null && !isNaN(v);
        })
        .map((d: any) => ({ time: toTime(d.date), value: Number(d[key]) }));
    });
    return out;
  }, [dailyMAEs, selectedModels, dataKey]);

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

    selectedModels.forEach((model) => {
      const modelKey = `${model.id}|${model.name}`;
      const data = seriesData[modelKey];
      if (data?.length) {
        const series = chart.addSeries(LineSeries, {
          color: modelColorMap[modelKey] || model.color,
          lineWidth: 2,
          priceScaleId: 'right',
          title: model.name,
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
  }, [selectedModels.length, modelColorMap, darkMode]);

  useEffect(() => {
    if (!chartRef.current || seriesRefs.current.length === 0) return;
    let idx = 0;
    selectedModels.forEach((model) => {
      const modelKey = `${model.id}|${model.name}`;
      const data = seriesData[modelKey];
      if (data?.length && seriesRefs.current[idx]) {
        seriesRefs.current[idx].setData(data);
        idx++;
      }
    });
    chartRef.current?.timeScale().fitContent();
  }, [seriesData, selectedModels]);

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" component="h3" sx={{ color: colors.text, fontWeight: 'bold' }}>
          MAE Indicators
        </Typography>
        <ToggleButtonGroup
          value={selectedTimeSlot}
          exclusive
          onChange={(_, newValue) => {
            if (newValue !== null) onTimeSlotChange(newValue);
          }}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: colors.text,
              borderColor: colors.tooltipBorder,
              '&.Mui-selected': {
                backgroundColor: 'rgba(24, 144, 255, 0.2)',
                color: darkMode ? '#36cfc9' : '#13a8a8',
                fontWeight: 'bold',
              },
            },
          }}
        >
          <ToggleButton value={TimeSlot.ALL}>{TimeSlotDescription.ALL}</ToggleButton>
          <ToggleButton value={TimeSlot.MORNING}>{TimeSlotDescription.MORNING}</ToggleButton>
          <ToggleButton value={TimeSlot.EVENING}>{TimeSlotDescription.EVENING}</ToggleButton>
          <ToggleButton value={TimeSlot.NIGHT}>{TimeSlotDescription.NIGHT}</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <div ref={containerRef} style={{ height: 250, width: '100%' }} />
    </Box>
  );
};
