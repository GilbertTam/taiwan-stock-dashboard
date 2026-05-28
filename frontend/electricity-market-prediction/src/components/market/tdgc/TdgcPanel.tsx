'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Alert, CircularProgress, Chip, Stack, Switch, Typography } from '@mui/material';
import ReactECharts from 'echarts-for-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { fetchTdgc } from '@/services/gridOperationsApi';
import { useTheme } from '@/app/ThemeProvider';
import { TDGC_CATEGORIES, TDGC_FIELDS, TDGC_DEFAULT_FIELDS } from '@/components/price-chart/constants';
import type { TdgcData } from '@/types';

interface TdgcPanelProps {
  startDate: Date | null;
  endDate: Date | null;
  areaName: string;
}

type TdgcGroup = 'origin' | 'tso';

// Helpers
const fmtNum = (n: number | null | undefined, digits = 2) =>
  n == null || !isFinite(n) ? '–' : n.toFixed(digits);

export default function TdgcPanel({ startDate, endDate, areaName }: TdgcPanelProps) {
  const { darkMode } = useTheme();
  const { t } = useTranslation('forecast');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TdgcData[]>([]);

  // Selection state — defaults aligned with PriceChartContext
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(['3200']));
  const [selectedGroups, setSelectedGroups] = useState<Set<TdgcGroup>>(new Set(['origin']));
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(TDGC_DEFAULT_FIELDS));
  const [stackBars, setStackBars] = useState(false);

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

  const toggleGroup = (g: TdgcGroup) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) {
        if (next.size > 1) next.delete(g);
      } else {
        next.add(g);
      }
      return next;
    });
  };

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filteredData = useMemo(
    () => data.filter((d) => selectedCategories.has(d.commodity_category)),
    [data, selectedCategories],
  );

  const visibleFields = useMemo(
    () => TDGC_FIELDS.filter(f => selectedGroups.has(f.group as TdgcGroup) && selectedFields.has(f.key)),
    [selectedGroups, selectedFields],
  );

  const stats = useMemo(() => {
    if (!filteredData.length) return null;
    // Pick representative metrics from the currently selected group.
    const isOrigin = selectedGroups.has('origin');
    const priceField = isOrigin ? 'corrected_unit_price_ave' : 'tso_price_ave';
    const priceMaxField = isOrigin ? 'corrected_unit_price_max' : 'tso_price_max';
    const priceMinField = isOrigin ? 'corrected_unit_price_min' : 'tso_price_min';
    const awardQtyField = isOrigin ? 'offer_id_count_quantity_in_total' : 'total_contract_quantity';
    const offerCountField = 'offer_count';

    const safe = (key: string) => filteredData.map(d => (d as any)[key]).filter((v): v is number => typeof v === 'number');
    const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);
    const avg = (arr: number[]) => arr.length ? sum(arr) / arr.length : null;
    const max = (arr: number[]) => arr.length ? Math.max(...arr) : null;
    const min = (arr: number[]) => arr.length ? Math.min(...arr) : null;

    return {
      avgPrice: avg(safe(priceField)),
      maxPrice: max(safe(priceMaxField)),
      minPrice: min(safe(priceMinField)),
      totalAwardedMWh: sum(safe(awardQtyField)) / 1000,
      offerCount: sum(safe(offerCountField)),
    };
  }, [filteredData, selectedGroups]);

  const option = useMemo(() => {
    if (!filteredData.length) return null;
    const isDark = darkMode;
    const axisColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const bgColor = isDark ? 'transparent' : '#fff';

    const catArray = Array.from(selectedCategories).sort();

    // Time axis = union of all datetimes.
    const allTimes = new Set<string>();
    filteredData.forEach((d) => allTimes.add(d.datetime));
    const timeLabels = Array.from(allTimes).sort();
    const displayLabels = timeLabels.map((tt) => tt.slice(0, 16).replace('T', ' '));

    // Per category → datetime → record
    const catTimeMap: Record<string, Record<string, TdgcData>> = {};
    catArray.forEach((cat) => { catTimeMap[cat] = {}; });
    filteredData.forEach((d) => {
      if (catTimeMap[d.commodity_category]) {
        catTimeMap[d.commodity_category][d.datetime] = d;
      }
    });

    const series: any[] = [];
    const useCountAxis = visibleFields.some(f => f.type === 'quantity' && !f.isMwh);

    // Field convenience accessors
    const priceFields = visibleFields.filter(f => f.type === 'price');
    const qtyFields   = visibleFields.filter(f => f.type === 'quantity');

    catArray.forEach((cat) => {
      const cfg = TDGC_CATEGORIES[cat];
      const catLabel = cfg ? t(cfg.labelKey) : cat;
      const color = cfg?.color ?? '#999';
      const map = catTimeMap[cat];

      // ── Price band trios ────────────────────────────────────────────────
      // Look for bandKey pairs present in selection (per group).
      const bandKeys = Array.from(new Set(priceFields.filter(f => f.bandKey).map(f => f.bandKey!)));
      bandKeys.forEach(bandKey => {
        const minF = priceFields.find(f => f.bandKey === bandKey && f.bandRole === 'min');
        const maxF = priceFields.find(f => f.bandKey === bandKey && f.bandRole === 'max');
        const aveF = priceFields.find(f => f.bandKey === bandKey && f.bandRole === 'ave');
        const groupLabel = bandKey.startsWith('tso')
          ? t('tdgcTab.groups.tso')
          : t('tdgcTab.groups.origin');

        if (minF && maxF) {
          // Invisible bottom (min)
          series.push({
            name: `__band_lo_${cat}_${bandKey}`,
            type: 'line',
            yAxisIndex: 0,
            stack: `band_${cat}_${bandKey}`,
            data: timeLabels.map((tt) => {
              const v = (map[tt] as any)?.[minF.key];
              return typeof v === 'number' ? v : null;
            }),
            lineStyle: { opacity: 0 },
            areaStyle: { opacity: 0 },
            symbol: 'none',
            silent: true,
            tooltip: { show: false },
            legendHoverLink: false,
            z: 1,
          });
          // Visible top (max - min as stack delta)
          series.push({
            name: `${catLabel} ${t('tdgcTab.priceRange')} (${groupLabel})`,
            type: 'line',
            yAxisIndex: 0,
            stack: `band_${cat}_${bandKey}`,
            data: timeLabels.map((tt) => {
              const rec = map[tt] as any;
              const mn = rec?.[minF.key];
              const mx = rec?.[maxF.key];
              return (typeof mn === 'number' && typeof mx === 'number') ? mx - mn : null;
            }),
            lineStyle: { opacity: 0 },
            symbol: 'none',
            areaStyle: { color, opacity: 0.18 },
            z: 2,
          });
        }

        if (aveF) {
          series.push({
            name: `${catLabel} ${t(aveF.labelKey)}`,
            type: 'line',
            yAxisIndex: 0,
            data: timeLabels.map((tt) => {
              const v = (map[tt] as any)?.[aveF.key];
              return typeof v === 'number' ? v : null;
            }),
            symbol: 'none',
            lineStyle: { color, width: 1.5 },
            itemStyle: { color },
            z: 10,
          });
        }
      });

      // Solo price fields without a bandKey (rare — defensive)
      priceFields.filter(f => !f.bandKey).forEach(f => {
        series.push({
          name: `${catLabel} ${t(f.labelKey)}`,
          type: 'line',
          yAxisIndex: 0,
          data: timeLabels.map((tt) => {
            const v = (map[tt] as any)?.[f.key];
            return typeof v === 'number' ? v : null;
          }),
          symbol: 'none',
          lineStyle: { color, width: 1 },
          z: 9,
        });
      });

      // ── Quantity bars ──────────────────────────────────────────────────
      qtyFields.forEach(f => {
        const yAxis = f.isMwh ? 1 : (useCountAxis ? 2 : 1);
        series.push({
          name: `${catLabel} ${t(f.labelKey)}`,
          type: 'bar',
          yAxisIndex: yAxis,
          stack: stackBars ? `vol_${f.key}` : undefined,
          data: timeLabels.map((tt) => {
            const v = (map[tt] as any)?.[f.key];
            if (typeof v !== 'number') return null;
            return f.isMwh ? v / 1000 : v;
          }),
          itemStyle: { color, opacity: 0.55 },
          barMaxWidth: 8,
        });
      });
    });

    const yAxes: any[] = [
      {
        type: 'value',
        name: t('tdgcTab.yAxisPrice'),
        nameTextStyle: { color: axisColor, fontSize: 10 },
        axisLabel: { color: axisColor, fontSize: 10 },
        axisLine: { lineStyle: { color: gridColor } },
        splitLine: { lineStyle: { color: gridColor } },
      },
      {
        type: 'value',
        name: t('tdgcTab.yAxisQty'),
        nameTextStyle: { color: axisColor, fontSize: 10 },
        axisLabel: { color: axisColor, fontSize: 10 },
        axisLine: { lineStyle: { color: gridColor } },
        splitLine: { show: false },
      },
    ];
    if (useCountAxis) {
      yAxes.push({
        type: 'value',
        name: t('tdgcTab.yAxisCount'),
        nameTextStyle: { color: axisColor, fontSize: 10 },
        axisLabel: { color: axisColor, fontSize: 10 },
        axisLine: { lineStyle: { color: gridColor } },
        splitLine: { show: false },
        offset: 50,
        position: 'right',
      });
    }

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
        // Hide the invisible-bottom band helper series in the legend.
        formatter: (name: string) => name.startsWith('__band_lo_') ? '' : name,
        selectedMode: 'multiple' as const,
      },
      grid: { left: 65, right: useCountAxis ? 110 : 65, top: 20, bottom: 55 },
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
      yAxis: yAxes,
      series,
      animation: false,
    };
  }, [filteredData, darkMode, t, selectedCategories, visibleFields, stackBars]);

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
      {/* Group + Stacking controls */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
        {([
          { key: 'origin' as TdgcGroup, label: t('tdgcTab.groups.origin'), color: '#e91e63' },
          { key: 'tso' as TdgcGroup,    label: t('tdgcTab.groups.tso'),    color: '#5c6bc0' },
        ]).map(({ key, label, color }) => {
          const sel = selectedGroups.has(key);
          return (
            <Chip
              key={key}
              size="small"
              label={label}
              onClick={() => toggleGroup(key)}
              sx={{
                fontWeight: sel ? 700 : 400,
                backgroundColor: sel ? `${color}22` : undefined,
                borderColor: sel ? color : undefined,
                color: sel ? color : undefined,
              }}
              variant={sel ? 'outlined' : 'filled'}
            />
          );
        })}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: 1 }}>
          <Switch size="small" checked={stackBars} onChange={(_, v) => setStackBars(v)} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('tdgcTab.stackBars')}</Typography>
        </Box>
      </Stack>

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

      {/* Field selector chips (filtered by selected groups) */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
        {TDGC_FIELDS.filter(f => selectedGroups.has(f.group as TdgcGroup)).map(f => {
          const sel = selectedFields.has(f.key);
          return (
            <Chip
              key={f.key}
              size="small"
              label={t(f.labelKey)}
              onClick={() => toggleField(f.key)}
              sx={{
                fontSize: '0.68rem',
                fontWeight: sel ? 600 : 400,
                backgroundColor: sel ? `${f.color}22` : undefined,
                borderColor: sel ? f.color : undefined,
                color: sel ? f.color : undefined,
              }}
              variant={sel ? 'outlined' : 'filled'}
            />
          );
        })}
      </Stack>

      {/* Summary stats */}
      {stats && (
        <Stack direction="row" spacing={0.75} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
          {stats.avgPrice != null && (
            <Chip size="small" label={t('tdgcTab.avgPrice', { value: fmtNum(stats.avgPrice) })}
              sx={{ backgroundColor: 'rgba(255,202,40,0.15)', color: '#ffca28', fontWeight: 600 }} />
          )}
          {stats.maxPrice != null && (
            <Chip size="small" label={t('tdgcTab.maxPrice', { value: fmtNum(stats.maxPrice) })} />
          )}
          {stats.minPrice != null && (
            <Chip size="small" label={t('tdgcTab.minPrice', { value: fmtNum(stats.minPrice) })} />
          )}
          <Chip size="small" label={t('tdgcTab.totalAwarded', { value: fmtNum(stats.totalAwardedMWh, 0) })} />
          <Chip size="small" label={t('tdgcTab.offerCount', { value: stats.offerCount.toLocaleString() })} />
        </Stack>
      )}

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {t('tdgcTab.chartHint')}
      </Typography>
      {option && <ReactECharts option={option} style={{ height: 400 }} notMerge />}
    </Box>
  );
}
