'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Alert, CircularProgress, Chip, Stack, Typography } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { fetchTdgc } from '@/services/gridOperationsApi';
import { useTheme } from '@/app/ThemeProvider';
import { TDGC_CATEGORIES } from '@/components/price-chart/constants';
import type { TdgcData } from '@/types';

interface TdgcPanelProps {
  startDate: Date | null;
  endDate: Date | null;
  areaName: string;
}

export default function TdgcPanel({ startDate, endDate, areaName }: TdgcPanelProps) {
  const { darkMode } = useTheme();
  const { t } = useTranslation('forecast');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TdgcData[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(['3200']));

  useEffect(() => {
    if (!startDate || !endDate) return;
    const start = format(startDate, 'yyyyMMdd');
    const end = format(endDate, 'yyyyMMdd');

    setLoading(true);
    fetchTdgc({ start_date: start, end_date: end, area_name: areaName })
      .then((res) => setData(res))
      .catch((err) => { console.error('Failed to fetch TDGC data:', err); setData([]); })
      .finally(() => setLoading(false));
  }, [startDate, endDate, areaName]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    data.forEach((d) => cats.add(d.commodity_category));
    return cats;
  }, [data]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const filteredData = useMemo(
    () => data.filter((d) => selectedCategories.has(d.commodity_category)),
    [data, selectedCategories],
  );

  const stats = useMemo(() => {
    if (!filteredData.length) return null;
    const avgPrice = filteredData.reduce((s, d) => s + d.corrected_unit_price_ave, 0) / filteredData.length;
    const totalContract = filteredData.reduce((s, d) => s + d.total_contract_quantity, 0);
    const totalOffers = filteredData.reduce((s, d) => s + d.offer_count, 0);
    return { avgPrice, totalContract, totalOffers };
  }, [filteredData]);

  const option = useMemo(() => {
    if (!filteredData.length) return null;
    const isDark = darkMode;
    const axisColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const bgColor = isDark ? 'transparent' : '#fff';

    const catArray = Array.from(selectedCategories).sort();

    // Build per-category time-aligned data
    const allTimes = new Set<string>();
    filteredData.forEach((d) => allTimes.add(d.datetime));
    const timeLabels = Array.from(allTimes).sort();

    // Group data by category+time
    const catTimeMap: Record<string, Record<string, TdgcData>> = {};
    catArray.forEach((cat) => { catTimeMap[cat] = {}; });
    filteredData.forEach((d) => {
      if (catTimeMap[d.commodity_category]) {
        catTimeMap[d.commodity_category][d.datetime] = d;
      }
    });

    const displayLabels = timeLabels.map((t) => t.slice(0, 16).replace('T', ' '));

    const series: any[] = [];
    catArray.forEach((cat) => {
      const cfg = TDGC_CATEGORIES[cat];
      const catLabel = cfg ? t(cfg.labelKey) : cat;
      const color = cfg?.color ?? '#999';
      const map = catTimeMap[cat];

      // Price line (corrected_unit_price_ave)
      series.push({
        name: `${catLabel} ${t('tdgcTab.tooltipCorrectedPrice')}`,
        type: 'line',
        yAxisIndex: 0,
        data: timeLabels.map((time) => map[time]?.corrected_unit_price_ave ?? null),
        symbol: 'none',
        lineStyle: { color, width: 1.5 },
        itemStyle: { color },
        z: 10,
      });

      // TSO price line (dashed)
      series.push({
        name: `${catLabel} ${t('tdgcTab.tooltipTsoPrice')}`,
        type: 'line',
        yAxisIndex: 0,
        data: timeLabels.map((time) => map[time]?.tso_price_ave ?? null),
        symbol: 'none',
        lineStyle: { color, width: 1, type: 'dashed' },
        itemStyle: { color },
        z: 9,
      });

      // Contract quantity bar (convert kWh to MWh)
      series.push({
        name: `${catLabel} ${t('tdgcTab.tooltipContract')}`,
        type: 'bar',
        yAxisIndex: 1,
        data: timeLabels.map((time) => {
          const val = map[time]?.total_contract_quantity;
          return val != null ? val / 1000 : null;
        }),
        itemStyle: { color, opacity: 0.4 },
        barMaxWidth: 6,
      });
    });

    return {
      backgroundColor: bgColor,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: isDark ? '#1e2128' : '#fff',
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
        textStyle: { color: isDark ? '#e2e8f0' : '#1a202c', fontSize: 12 },
      },
      legend: {
        bottom: 0,
        textStyle: { color: axisColor, fontSize: 11 },
        itemWidth: 12,
        itemHeight: 8,
        type: 'scroll',
      },
      grid: { left: 65, right: 65, top: 20, bottom: 55 },
      xAxis: {
        type: 'category',
        data: displayLabels,
        axisLabel: {
          color: axisColor,
          fontSize: 10,
          rotate: 30,
          formatter: (v: string) => v.slice(5, 16),
          interval: Math.max(0, Math.floor(displayLabels.length / 24) - 1),
        },
        axisLine: { lineStyle: { color: gridColor } },
        splitLine: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: '円/kWh',
          nameTextStyle: { color: axisColor, fontSize: 10 },
          axisLabel: { color: axisColor, fontSize: 10 },
          axisLine: { lineStyle: { color: gridColor } },
          splitLine: { lineStyle: { color: gridColor } },
        },
        {
          type: 'value',
          name: 'MWh',
          nameTextStyle: { color: axisColor, fontSize: 10 },
          axisLabel: { color: axisColor, fontSize: 10 },
          axisLine: { lineStyle: { color: gridColor } },
          splitLine: { show: false },
        },
      ],
      series,
      animation: false,
    };
  }, [filteredData, darkMode, t, selectedCategories]);

  if (!startDate || !endDate) {
    return <Alert severity="info">{t('tdgcTab.selectDateRange')}</Alert>;
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
        {t('tdgcTab.noData')}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Category selector chips */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
        {Object.entries(TDGC_CATEGORIES).map(([code, cfg]) => {
          const hasData = availableCategories.has(code);
          const selected = selectedCategories.has(code);
          return (
            <Chip
              key={code}
              size="small"
              label={t(cfg.labelKey)}
              disabled={!hasData}
              onClick={() => toggleCategory(code)}
              sx={{
                fontWeight: selected ? 700 : 400,
                backgroundColor: selected ? `${cfg.color}22` : undefined,
                borderColor: selected ? cfg.color : undefined,
                color: selected ? cfg.color : undefined,
              }}
              variant={selected ? 'outlined' : 'filled'}
            />
          );
        })}
      </Stack>

      {/* Summary stats */}
      {stats && (
        <Stack direction="row" spacing={0.75} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
          <Chip
            size="small"
            label={t('tdgcTab.avgPrice', { value: stats.avgPrice.toFixed(2) })}
            sx={{ backgroundColor: 'rgba(255,202,40,0.15)', color: '#ffca28', fontWeight: 600 }}
          />
          <Chip
            size="small"
            label={t('tdgcTab.totalContract', { value: (stats.totalContract / 1000).toFixed(0) })}
          />
          <Chip
            size="small"
            label={t('tdgcTab.offerCount', { value: stats.totalOffers.toLocaleString() })}
          />
        </Stack>
      )}

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {t('tdgcTab.chartHint')}
      </Typography>
      {option && <ReactECharts option={option} style={{ height: 360 }} notMerge />}
    </Box>
  );
}
