'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Chip, Stack, Alert, Typography } from '@mui/material';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chart-colors';
import { createFullChartOptions, parseToTimestamp, toChartTime } from '@/utils/chartUtils';
import type { IntradayData } from '@/types';

interface IntradayPanelProps {
  data: IntradayData[];
}

// Convert JST datetime string to LWC-compatible UTCTimestamp (fake-UTC so the axis shows JST wall time).
const toTime = (datetime: string): UTCTimestamp =>
  toChartTime(parseToTimestamp(datetime) ?? 0, 'Asia/Tokyo') as UTCTimestamp;

/** 日內市場 OHLC K 線圖 + 成交量直方圖 */
export const IntradayPanel: React.FC<IntradayPanelProps> = ({ data }) => {
  const { t } = useTranslation('forecast');
  const { darkMode } = useTheme();
  const colors = useChartColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const sortedData = useMemo(
    () => [...data].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()),
    [data]
  );

  const candleData = useMemo(
    () =>
      sortedData.map((d) => ({
        time: toTime(d.datetime),
        open: d.opening_price,
        high: d.high_price,
        low: d.low_price,
        close: d.closing_price,
      })),
    [sortedData]
  );

  const volumeData = useMemo(
    () =>
      sortedData.map((d) => ({
        time: toTime(d.datetime),
        value: d.total_contracted_volume,
        color:
          d.closing_price >= d.opening_price
            ? 'rgba(239, 83, 80, 0.35)'
            : 'rgba(38, 166, 154, 0.35)',
      })),
    [sortedData]
  );

  // Summary stats across the full selected period
  const stats = useMemo(() => {
    if (!sortedData.length) return null;
    const allHigh = Math.max(...sortedData.map((d) => d.high_price));
    const allLow = Math.min(...sortedData.map((d) => d.low_price));
    const totalVol = sortedData.reduce((sum, d) => sum + d.total_contracted_volume, 0);
    const totalContracts = sortedData.reduce((sum, d) => sum + d.contract_count, 0);
    const weightedAvg =
      sortedData.reduce((sum, d) => sum + d.average_price * d.total_contracted_volume, 0) /
      (totalVol || 1);
    return { allHigh, allLow, totalVol, totalContracts, weightedAvg };
  }, [sortedData]);

  // Create / destroy chart when theme changes or data first arrives
  useEffect(() => {
    if (!containerRef.current || !candleData.length) return;

    const chart = createChart(
      containerRef.current,
      createFullChartOptions(colors, darkMode, {
        rightPriceScale: {
          borderVisible: false,
          scaleMargins: { top: 0.05, bottom: 0.28 },
        },
        timeScale: { borderVisible: false },
      })
    );
    chartRef.current = chart;

    // Candlestick series (right price scale)
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#ef5350',
      downColor: '#26a69a',
      wickUpColor: '#ef5350',
      wickDownColor: '#26a69a',
      borderVisible: false,
    });
    candle.setData(candleData);
    candleSeriesRef.current = candle;

    // Volume histogram (separate price scale at bottom)
    const vol = chart.addSeries(HistogramSeries, {
      priceScaleId: 'vol',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });
    vol.setData(volumeData);
    volSeriesRef.current = vol;

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volSeriesRef.current = null;
    };
  }, [candleData.length > 0, darkMode]); // recreate on theme flip or data presence change

  // Update data without recreating the chart
  useEffect(() => {
    if (!chartRef.current) return;
    candleSeriesRef.current?.setData(candleData);
    volSeriesRef.current?.setData(volumeData);
    chartRef.current.timeScale().fitContent();
  }, [candleData, volumeData]);

  if (!data.length) {
    return (
      <Alert severity="info" sx={{ borderRadius: 1.5 }}>
        {t('intradayTab.noData')}
      </Alert>
    );
  }

  return (
    <Box>
      {stats && (
        <Stack direction="row" spacing={0.75} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
          <Chip
            size="small"
            label={t('intradayTab.highest', { value: stats.allHigh.toFixed(2) })}
            sx={{ backgroundColor: 'rgba(239,83,80,0.15)', color: '#ef5350', fontWeight: 600 }}
          />
          <Chip
            size="small"
            label={t('intradayTab.lowest', { value: stats.allLow.toFixed(2) })}
            sx={{ backgroundColor: 'rgba(38,166,154,0.15)', color: '#26a69a', fontWeight: 600 }}
          />
          <Chip
            size="small"
            label={t('intradayTab.weightedAvg', { value: stats.weightedAvg.toFixed(2) })}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            size="small"
            label={t('intradayTab.totalVolume', { value: (stats.totalVol / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') })}
          />
          <Chip
            size="small"
            label={t('intradayTab.totalContracts', { count: stats.totalContracts.toLocaleString() })}
            sx={{ color: 'text.secondary' }}
          />
        </Stack>
      )}
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {t('intradayTab.colorHint')}
      </Typography>
      <Box ref={containerRef} sx={{ height: 360, width: '100%' }} />
    </Box>
  );
};

export default IntradayPanel;
