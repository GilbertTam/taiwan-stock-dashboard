'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Alert, CircularProgress, Chip, Stack, Typography } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { fetchJepxSystem } from '@/services/api';
import { useTheme } from '@/app/ThemeProvider';
import type { JepxSystemData } from '@/types';

interface SupplyDemandChartProps {
  startDate: Date | null;
  endDate: Date | null;
}

/** 需給バランス — JEPX 系統層賣出/買入量直方圖 + 系統價格折線 */
export default function SupplyDemandChart({ startDate, endDate }: SupplyDemandChartProps) {
  const { darkMode } = useTheme();
  const { t } = useTranslation('forecast');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<JepxSystemData[]>([]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    const start = format(startDate, 'yyyyMMdd');
    const end   = format(endDate,   'yyyyMMdd');

    setLoading(true);
    fetchJepxSystem({ start_date: start, end_date: end })
      .then((res) => setData(res))
      .catch((err) => { console.error('Failed to fetch JEPX system data:', err); setData([]); })
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  const sorted = useMemo(
    () => [...data].sort((a, b) => a.datetime.localeCompare(b.datetime)),
    [data]
  );

  const timeLabels = useMemo(
    () => sorted.map((d) => d.datetime.slice(0, 16).replace('T', ' ')),
    [sorted]
  );

  // Summary stats
  const stats = useMemo(() => {
    if (!sorted.length) return null;
    const avgPrice = sorted.reduce((s, d) => s + d.system_price, 0) / sorted.length;
    const maxSell  = Math.max(...sorted.map((d) => d.sell_quantity));
    const maxBuy   = Math.max(...sorted.map((d) => d.buy_quantity));
    const totalVol = sorted.reduce((s, d) => s + d.contract_quantity, 0);
    const avgImbalance = sorted.reduce((s, d) => s + (d.sell_quantity - d.buy_quantity), 0) / sorted.length;
    return { avgPrice, maxSell, maxBuy, totalVol, avgImbalance };
  }, [sorted]);

  const option = useMemo(() => {
    if (!sorted.length) return null;
    const isDark = darkMode;
    const axisColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const bgColor   = isDark ? 'transparent' : '#fff';

    const sellData = sorted.map((d) => d.sell_quantity / 1000); // convert to MWh
    const buyData  = sorted.map((d) => -d.buy_quantity / 1000); // negative bar downward
    const priceData = sorted.map((d) => d.system_price);

    return {
      backgroundColor: bgColor,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: isDark ? '#1e2128' : '#fff',
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
        textStyle: { color: isDark ? '#e2e8f0' : '#1a202c', fontSize: 12 },
        formatter: (params: any[]) => {
          const time = params[0]?.axisValue ?? '';
          const sell = params.find((p: any) => p.seriesName === t('supplyDemandTab.sellVolume'));
          const buy  = params.find((p: any) => p.seriesName === t('supplyDemandTab.buyVolume'));
          const price = params.find((p: any) => p.seriesName === t('supplyDemandTab.systemPrice'));
          return `<div style="font-size:11px;font-family:monospace">${time}<br/>
            ${sell?.marker ?? ''}${t('supplyDemandTab.tooltipSell')}: <b>${Math.abs(sell?.value ?? 0).toFixed(1)} MWh</b><br/>
            ${buy?.marker ?? ''}${t('supplyDemandTab.tooltipBuy')}: <b>${Math.abs(buy?.value ?? 0).toFixed(1)} MWh</b><br/>
            ${price?.marker ?? ''}${t('supplyDemandTab.tooltipSystemPrice')}: <b>${(price?.value ?? 0).toFixed(2)} 円/kWh</b>
          </div>`;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: axisColor, fontSize: 11 },
        itemWidth: 12,
        itemHeight: 8,
      },
      grid: { left: 65, right: 65, top: 20, bottom: 55 },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLabel: {
          color: axisColor,
          fontSize: 10,
          rotate: 30,
          formatter: (v: string) => v.slice(5, 16),
          interval: Math.max(0, Math.floor(timeLabels.length / 24) - 1),
        },
        axisLine: { lineStyle: { color: gridColor } },
        splitLine: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: 'MWh',
          nameTextStyle: { color: axisColor, fontSize: 10 },
          axisLabel: {
            color: axisColor,
            fontSize: 10,
            formatter: (v: number) => v === 0 ? '0' : `${Math.abs(v).toFixed(0)}`,
          },
          axisLine: { lineStyle: { color: gridColor } },
          splitLine: { lineStyle: { color: gridColor } },
        },
        {
          type: 'value',
          name: '円/kWh',
          nameTextStyle: { color: axisColor, fontSize: 10 },
          axisLabel: { color: axisColor, fontSize: 10 },
          axisLine: { lineStyle: { color: gridColor } },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: t('supplyDemandTab.sellVolume'),
          type: 'bar',
          stack: 'vol',
          data: sellData,
          itemStyle: { color: 'rgba(239,83,80,0.7)' },
          barMaxWidth: 6,
        },
        {
          name: t('supplyDemandTab.buyVolume'),
          type: 'bar',
          stack: 'vol',
          data: buyData,
          itemStyle: { color: 'rgba(38,166,154,0.7)' },
          barMaxWidth: 6,
        },
        {
          name: t('supplyDemandTab.systemPrice'),
          type: 'line',
          yAxisIndex: 1,
          data: priceData,
          symbol: 'none',
          lineStyle: { color: '#ffca28', width: 1.5 },
          itemStyle: { color: '#ffca28' },
          z: 10,
        },
      ],
      animation: false,
    };
  }, [sorted, timeLabels, darkMode, t]);

  if (!startDate || !endDate) {
    return <Alert severity="info">{t('supplyDemandTab.selectDateRange')}</Alert>;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!data.length) {
    return (
      <Alert severity="info" sx={{ borderRadius: 1.5 }}>
        {t('supplyDemandTab.noData')}
      </Alert>
    );
  }

  return (
    <Box>
      {stats && (
        <Stack direction="row" spacing={0.75} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
          <Chip
            size="small"
            label={t('supplyDemandTab.avgPrice', { value: stats.avgPrice.toFixed(2) })}
            sx={{ backgroundColor: 'rgba(255,202,40,0.15)', color: '#ffca28', fontWeight: 600 }}
          />
          <Chip
            size="small"
            label={t('supplyDemandTab.totalVolume', { value: (stats.totalVol / 1000).toFixed(0) })}
          />
          <Chip
            size="small"
            label={t('supplyDemandTab.excessAvg', { value: `${stats.avgImbalance >= 0 ? '+' : ''}${(stats.avgImbalance / 1000).toFixed(0)}` })}
            sx={{
              backgroundColor: stats.avgImbalance > 0
                ? 'rgba(239,83,80,0.12)' : 'rgba(38,166,154,0.12)',
              color: stats.avgImbalance > 0 ? '#ef5350' : '#26a69a',
              fontWeight: 600,
            }}
          />
        </Stack>
      )}
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {t('supplyDemandTab.chartHint')}
      </Typography>
      {option && <ReactECharts option={option} style={{ height: 360 }} notMerge />}
    </Box>
  );
}
