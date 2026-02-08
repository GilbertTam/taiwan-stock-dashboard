'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress } from '@mui/material';
import { createChart, LineSeries, ColorType, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { ChartDataPoint } from '@/utils/chartUtils';
import { toUTCTimestamp } from '@/utils/lightweightChartsHelpers';
import { useTheme } from '@/app/ThemeProvider';
import type { Area } from '@/types';

interface MiniAreaChartProps {
  data: ChartDataPoint[];
  height: number;
  color?: string;
  darkMode?: boolean;
}

function MiniAreaChart({ data, height, color, darkMode }: MiniAreaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const lineData = useMemo(() => {
    return data
      .filter((p) => p.actualPrice != null && !isNaN(p.actualPrice))
      .map((p) => ({ time: toUTCTimestamp(p.timestamp), value: p.actualPrice as number }));
  }, [data]);

  useEffect(() => {
    if (!containerRef.current || lineData.length === 0) return;
    const chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: darkMode ? '#9ca3af' : '#6b7280',
          fontFamily: 'inherit',
          attributionLogo: false,
        },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: {
        visible: false,
      },
      handleScroll: { vertTouchDrag: false, horzTouchDrag: false },
      handleScale: { pinch: false, axisPressedMouseMove: false },
    });
    chartRef.current = chart;
    const series = chart.addSeries(LineSeries, {
      color: color || 'var(--primary)',
      lineWidth: 2,
    });
    seriesRef.current = series;
    series.setData(lineData);
    chart.timeScale().fitContent();
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [lineData.length, color, darkMode]);

  useEffect(() => {
    if (seriesRef.current && lineData.length > 0) {
      seriesRef.current.setData(lineData);
      chartRef.current?.timeScale().fitContent();
    }
  }, [lineData]);

  if (lineData.length === 0) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontSize: 12 }}>
        無資料
      </Box>
    );
  }

  return <div ref={containerRef} style={{ height, width: '100%' }} />;
}

export interface AreaPricePreviewGridProps {
  areas: Area[];
  allAreasChartData: Record<string, ChartDataPoint[]>;
  loading?: boolean;
}

export function AreaPricePreviewGrid({ areas, allAreasChartData, loading }: AreaPricePreviewGridProps) {
  const router = useRouter();
  const { darkMode } = useTheme();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280, py: 4 }}>
        <CircularProgress size={32} sx={{ color: 'var(--primary)' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2,
      }}
    >
      {areas.map((area) => {
        const chartData = allAreasChartData[area.name] || [];
        const latest = chartData.filter((p) => p.actualPrice != null).slice(-1)[0];
        const latestPrice = latest?.actualPrice;

        return (
          <Box
            key={area.name}
            onClick={() => router.push(`/dashboard/forecast?area=${encodeURIComponent(area.name)}`)}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid var(--card-border)',
              backgroundColor: 'var(--card-bg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'var(--primary)',
                boxShadow: 2,
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold" color="text.primary" noWrap>
                {area.name_ch}
              </Typography>
              {latestPrice != null && (
                <Typography variant="caption" color="var(--primary)" fontWeight="600">
                  ¥{Number(latestPrice).toFixed(0)}
                </Typography>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {area.name}
            </Typography>
            <MiniAreaChart
              data={chartData}
              height={120}
              color="var(--primary)"
              darkMode={darkMode}
            />
          </Box>
        );
      })}
    </Box>
  );
}
