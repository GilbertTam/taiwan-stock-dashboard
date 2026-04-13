'use client';

import React, { useMemo } from 'react';
import { Box, Paper, Typography, Divider, Grid, Alert } from '@mui/material';
import type { EChartsOption } from 'echarts';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chart-colors';
import { createTimeAxis, createValueAxis, createGrid } from '@/utils/echartsHelpers';
import { BaseChart } from '@/components/charts/BaseChart';
import { buildLegendLabel, WEATHER_FIELD_DISPLAY } from '@/constants/weatherCategories';

interface ExtendedWeatherData {
  weather_datetime: string;
  temperature_actual: number | null;
  temperature_forecast: number | null;
  rainfall_actual: number | null;
  rainfall_forecast: number | null;
  wind_speed_actual: number | null;
  wind_speed_forecast: number | null;
}

interface WeatherChartSectionProps {
  weatherActual: any[];
  weatherForecast: any[];
  weatherChartData: ExtendedWeatherData[];
}

function getSummaryStats(sortedData: ExtendedWeatherData[]) {
  const tempActual = sortedData.map((d) => d.temperature_actual).filter((v): v is number => v != null);
  const tempForecast = sortedData.map((d) => d.temperature_forecast).filter((v): v is number => v != null);
  const rainActual = sortedData.map((d) => d.rainfall_actual).filter((v): v is number => v != null);
  const rainForecast = sortedData.map((d) => d.rainfall_forecast).filter((v): v is number => v != null);
  const windActual = sortedData.map((d) => d.wind_speed_actual).filter((v): v is number => v != null);
  const windForecast = sortedData.map((d) => d.wind_speed_forecast).filter((v): v is number => v != null);

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const sum = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) : null);
  const min = (arr: number[]) => (arr.length ? Math.min(...arr) : null);
  const max = (arr: number[]) => (arr.length ? Math.max(...arr) : null);

  return {
    temperature: {
      actual: { avg: avg(tempActual), min: min(tempActual), max: max(tempActual) },
      forecast: tempForecast.length ? { avg: avg(tempForecast) } : null,
    },
    rainfall: {
      actual: sum(rainActual),
      forecast: rainForecast.length ? sum(rainForecast) : null,
    },
    wind_speed: {
      actual: { avg: avg(windActual), max: max(windActual) },
      forecast: windForecast.length ? { avg: avg(windForecast) } : null,
    },
  };
}

function computeForecastAccuracy(sortedData: ExtendedWeatherData[]): {
  temperature: { mae: number; count: number };
  rainfall: { mae: number; count: number };
  wind_speed: { mae: number; count: number };
} {
  const pairs = {
    temperature: [] as number[],
    rainfall: [] as number[],
    wind_speed: [] as number[],
  };

  sortedData.forEach((d) => {
    if (d.temperature_actual != null && d.temperature_forecast != null) {
      pairs.temperature.push(Math.abs(d.temperature_actual - d.temperature_forecast));
    }
    if (d.rainfall_actual != null && d.rainfall_forecast != null) {
      pairs.rainfall.push(Math.abs(d.rainfall_actual - d.rainfall_forecast));
    }
    if (d.wind_speed_actual != null && d.wind_speed_forecast != null) {
      pairs.wind_speed.push(Math.abs(d.wind_speed_actual - d.wind_speed_forecast));
    }
  });

  const mae = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  return {
    temperature: { mae: mae(pairs.temperature), count: pairs.temperature.length },
    rainfall: { mae: mae(pairs.rainfall), count: pairs.rainfall.length },
    wind_speed: { mae: mae(pairs.wind_speed), count: pairs.wind_speed.length },
  };
}

/** [timestamp, error] for points that have both actual and forecast */
function getErrorTimeSeries(sortedData: ExtendedWeatherData[]): {
  temperature: [number, number][];
  rainfall: [number, number][];
  wind_speed: [number, number][];
} {
  const temperature: [number, number][] = [];
  const rainfall: [number, number][] = [];
  const wind_speed: [number, number][] = [];
  sortedData.forEach((d) => {
    const ts = new Date(d.weather_datetime).getTime();
    if (d.temperature_actual != null && d.temperature_forecast != null) {
      temperature.push([ts, d.temperature_actual - d.temperature_forecast]);
    }
    if (d.rainfall_actual != null && d.rainfall_forecast != null) {
      rainfall.push([ts, d.rainfall_actual - d.rainfall_forecast]);
    }
    if (d.wind_speed_actual != null && d.wind_speed_forecast != null) {
      wind_speed.push([ts, d.wind_speed_actual - d.wind_speed_forecast]);
    }
  });
  return { temperature, rainfall, wind_speed };
}

/** [forecast, actual] for scatter */
function getScatterData(sortedData: ExtendedWeatherData[]): {
  temperature: [number, number][];
  rainfall: [number, number][];
  wind_speed: [number, number][];
} {
  const temperature: [number, number][] = [];
  const rainfall: [number, number][] = [];
  const wind_speed: [number, number][] = [];
  sortedData.forEach((d) => {
    if (d.temperature_actual != null && d.temperature_forecast != null) {
      temperature.push([d.temperature_forecast, d.temperature_actual]);
    }
    if (d.rainfall_actual != null && d.rainfall_forecast != null) {
      rainfall.push([d.rainfall_forecast, d.rainfall_actual]);
    }
    if (d.wind_speed_actual != null && d.wind_speed_forecast != null) {
      wind_speed.push([d.wind_speed_forecast, d.wind_speed_actual]);
    }
  });
  return { temperature, rainfall, wind_speed };
}

const NUM_BINS = 8;

function getErrorHistogram(sortedData: ExtendedWeatherData[]): {
  temperature: { binLabels: string[]; counts: number[] };
  rainfall: { binLabels: string[]; counts: number[] };
  wind_speed: { binLabels: string[]; counts: number[] };
} {
  const toBins = (errors: number[]) => {
    if (errors.length === 0) return { binLabels: [] as string[], counts: [] as number[] };
    const min = Math.min(...errors);
    const max = Math.max(...errors);
    const span = max - min || 1;
    const step = span / NUM_BINS;
    const counts = new Array(NUM_BINS).fill(0);
    const binLabels: string[] = [];
    for (let i = 0; i < NUM_BINS; i++) {
      const lo = min + i * step;
      const hi = min + (i + 1) * step;
      binLabels.push(lo.toFixed(1) + '~' + hi.toFixed(1));
    }
    errors.forEach((v) => {
      const idx = Math.min(Math.floor((v - min) / step), NUM_BINS - 1);
      counts[idx]++;
    });
    return { binLabels, counts };
  };
  const tempErr = sortedData
    .filter((d) => d.temperature_actual != null && d.temperature_forecast != null)
    .map((d) => d.temperature_actual! - d.temperature_forecast!);
  const rainErr = sortedData
    .filter((d) => d.rainfall_actual != null && d.rainfall_forecast != null)
    .map((d) => d.rainfall_actual! - d.rainfall_forecast!);
  const windErr = sortedData
    .filter((d) => d.wind_speed_actual != null && d.wind_speed_forecast != null)
    .map((d) => d.wind_speed_actual! - d.wind_speed_forecast!);
  return {
    temperature: toBins(tempErr),
    rainfall: toBins(rainErr),
    wind_speed: toBins(windErr),
  };
}

const formatNum = (v: number | null, decimals = 1) => (v == null ? '–' : v.toFixed(decimals));

const CHART_HEIGHT = 180;
const SMALL_GRID = { left: 44, right: 20, top: 24, bottom: 36, containLabel: true };

const WeatherChartSection = ({
  weatherActual,
  weatherForecast,
  weatherChartData,
}: WeatherChartSectionProps) => {
  const { darkMode } = useTheme();
  const colors = useChartColors();
  const { t } = useTranslation('forecast');

  const sortedData = useMemo(() => {
    if (!weatherChartData) return [];
    return [...weatherChartData].sort(
      (a, b) =>
        new Date(a.weather_datetime).getTime() - new Date(b.weather_datetime).getTime()
    );
  }, [weatherChartData]);

  const hasData =
    weatherActual.length > 0 ||
    weatherForecast.length > 0 ||
    (sortedData && sortedData.length > 0);

  const summary = useMemo(() => getSummaryStats(sortedData), [sortedData]);
  const accuracy = useMemo(() => computeForecastAccuracy(sortedData), [sortedData]);
  const errorTimeSeries = useMemo(() => getErrorTimeSeries(sortedData), [sortedData]);
  const scatterData = useMemo(() => getScatterData(sortedData), [sortedData]);
  const histogramData = useMemo(() => getErrorHistogram(sortedData), [sortedData]);

  const errorTimeOptions = useMemo(() => {
    const build = (
      data: [number, number][],
      title: string,
      unit: string,
      color: string
    ): EChartsOption => {
      if (!data.length) return {};
      const times = data.map((d) => d[0]);
      const minT = Math.min(...times);
      const maxT = Math.max(...times);
      const tooltipFormatter = (params: any) => {
        const list = Array.isArray(params) ? params : [params];
        const p = list[0];
        const t_ = p?.value?.[0];
        const err = p?.value?.[1];
        if (t_ == null || err == null) return '';
        const timeStr = new Date(t_).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        return `
        <div style="background:${colors.tooltipBg};border:1px solid ${colors.tooltipBorder};color:${colors.text};padding:8px 10px;border-radius:6px;font-size:12px;pointer-events:none;">
          <div style="font-weight:700;margin-bottom:4px;">${timeStr}</div>
          <div>${t('weatherTab.errorTooltip', { field: title })}<strong>${Number(err).toFixed(2)} ${unit}</strong></div>
        </div>`;
      };
      return {
        grid: createGrid(SMALL_GRID),
        xAxis: createTimeAxis(colors, minT, maxT),
        yAxis: createValueAxis(colors, { name: t('weatherTab.error'), unit }),
        tooltip: { trigger: 'axis' as const, formatter: tooltipFormatter as any, backgroundColor: 'transparent', borderWidth: 0, extraCssText: 'pointer-events:none;' },
        series: [
          {
            type: 'line' as const,
            name: t('weatherTab.errorLabel', { field: title }),
            data,
            showSymbol: true,
            symbolSize: 6,
            lineStyle: { width: 2, color },
            itemStyle: { color },
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color: colors.dividerLine, type: 'dashed' as const, width: 1 },
              data: [{ yAxis: 0 }],
            },
          } as any,
        ],
        animation: false,
      };
    };
    const tName = WEATHER_FIELD_DISPLAY['temperature_2m']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['temperature_2m'].shortLabelKey) : t('weatherTab.tempFallback');
    const rName = WEATHER_FIELD_DISPLAY['precipitation']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['precipitation'].shortLabelKey) : t('weatherTab.rainFallback');
    const wName = WEATHER_FIELD_DISPLAY['wind_speed_10m']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['wind_speed_10m'].shortLabelKey) : t('weatherTab.windFallback');

    return {
      temperature: build(errorTimeSeries.temperature, tName, '°C', colors.tempActual),
      rainfall: build(errorTimeSeries.rainfall, rName, 'mm', colors.rainActual),
      wind_speed: build(errorTimeSeries.wind_speed, wName, 'm/s', colors.windActual),
    };
  }, [errorTimeSeries, colors, t]);

  const scatterOptions = useMemo(() => {
    const build = (
      data: [number, number][],
      title: string,
      unit: string,
      color: string
    ): EChartsOption => {
      if (!data.length) return {};
      const all = data.flat();
      const lo = Math.min(...all);
      const hi = Math.max(...all);
      const pad = (hi - lo) * 0.05 || 0.5;
      const range = [lo - pad, hi + pad];
      const tooltipFormatter = (params: any) => {
        const list = Array.isArray(params) ? params : [params];
        const p = list[0];
        const fc = p?.value?.[0];
        const act = p?.value?.[1];
        if (fc == null || act == null) return '';
        return `
        <div style="background:${colors.tooltipBg};border:1px solid ${colors.tooltipBorder};color:${colors.text};padding:8px 10px;border-radius:6px;font-size:12px;pointer-events:none;">
          <div style="font-weight:700;margin-bottom:4px;">${title}</div>
          <div>${t('weatherTab.tooltipForecast')}<strong>${Number(fc).toFixed(2)} ${unit}</strong></div>
          <div>${t('weatherTab.tooltipActual')}<strong>${Number(act).toFixed(2)} ${unit}</strong></div>
        </div>`;
      };
      return {
        grid: createGrid(SMALL_GRID),
        xAxis: { type: 'value' as const, name: t('weatherTab.forecast'), nameTextStyle: { color: colors.text, fontSize: 11 }, min: range[0], max: range[1], axisLabel: { color: colors.text, fontSize: 11 }, splitLine: { lineStyle: { color: colors.grid, type: 'dashed' as const } }, axisLine: { lineStyle: { color: colors.text } } },
        yAxis: { type: 'value' as const, name: t('weatherTab.actual'), nameTextStyle: { color: colors.text, fontSize: 11 }, min: range[0], max: range[1], axisLabel: { color: colors.text, fontSize: 11 }, splitLine: { lineStyle: { color: colors.grid, type: 'dashed' as const } }, axisLine: { lineStyle: { color: colors.text } } },
        tooltip: { trigger: 'item' as const, formatter: tooltipFormatter as any, backgroundColor: 'transparent', borderWidth: 0, extraCssText: 'pointer-events:none;' },
        series: [
          { type: 'scatter' as const, name: title, data, symbolSize: 8, itemStyle: { color }, emphasis: { scale: 1.2 } } as any,
          { type: 'line' as const, name: '45°', data: [[range[0], range[0]], [range[1], range[1]]], showSymbol: false, lineStyle: { color: colors.dividerLine, type: 'dashed' as const, width: 1 }, silent: true } as any,
        ],
        animation: false,
      };
    };
    const tName = WEATHER_FIELD_DISPLAY['temperature_2m']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['temperature_2m'].shortLabelKey) : t('weatherTab.tempFallback');
    const rName = WEATHER_FIELD_DISPLAY['precipitation']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['precipitation'].shortLabelKey) : t('weatherTab.rainFallback');
    const wName = WEATHER_FIELD_DISPLAY['wind_speed_10m']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['wind_speed_10m'].shortLabelKey) : t('weatherTab.windFallback');

    return {
      temperature: build(scatterData.temperature, tName, '°C', colors.tempActual),
      rainfall: build(scatterData.rainfall, rName, 'mm', colors.rainActual),
      wind_speed: build(scatterData.wind_speed, wName, 'm/s', colors.windActual),
    };
  }, [scatterData, colors, t]);

  const histogramOptions = useMemo(() => {
    const build = (
      binLabels: string[],
      counts: number[],
      title: string
    ): EChartsOption => {
      if (!binLabels.length || !counts.length) return {};
      return {
        grid: createGrid(SMALL_GRID),
        xAxis: { type: 'category' as const, data: binLabels, axisLabel: { color: colors.text, fontSize: 10, rotate: 45 }, axisLine: { lineStyle: { color: colors.text } }, splitLine: { show: false } },
        yAxis: createValueAxis(colors, { name: t('weatherTab.count') }),
        tooltip: { trigger: 'axis' as const, backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, borderWidth: 1, textStyle: { color: colors.text, fontSize: 12 } },
        series: [{ type: 'bar' as const, name: t('weatherTab.errorLabel', { field: title }), data: counts, barMaxWidth: 28, itemStyle: { color: colors.rainActual } } as any],
        animation: false,
      };
    };
    const tName = WEATHER_FIELD_DISPLAY['temperature_2m']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['temperature_2m'].shortLabelKey) : t('weatherTab.tempFallback');
    const rName = WEATHER_FIELD_DISPLAY['precipitation']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['precipitation'].shortLabelKey) : t('weatherTab.rainFallback');
    const wName = WEATHER_FIELD_DISPLAY['wind_speed_10m']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['wind_speed_10m'].shortLabelKey) : t('weatherTab.windFallback');

    return {
      temperature: build(histogramData.temperature.binLabels, histogramData.temperature.counts, tName),
      rainfall: build(histogramData.rainfall.binLabels, histogramData.rainfall.counts, rName),
      wind_speed: build(histogramData.wind_speed.binLabels, histogramData.wind_speed.counts, wName),
    };
  }, [histogramData, colors, t]);

  if (!hasData) {
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {t('weatherTab.title')}
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Alert severity="info">{t('weatherTab.noData')}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {t('weatherTab.title')}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* 1. 時段摘要 */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
        {t('weatherTab.periodSummary')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              borderColor: darkMode ? '#333' : '#e0e0e0',
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {(WEATHER_FIELD_DISPLAY['temperature_2m']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['temperature_2m'].shortLabelKey) : t('weatherTab.tempFallback'))} (°C)
            </Typography>
            <Typography variant="body2" sx={{ color: colors.tempActual }}>
              {t('weatherTab.tempActualSummary', { avg: formatNum(summary.temperature.actual.avg), max: formatNum(summary.temperature.actual.max), min: formatNum(summary.temperature.actual.min) })}
            </Typography>
            {summary.temperature.forecast && (
              <Typography variant="body2" sx={{ color: colors.tempForecast, mt: 0.5 }}>
                {t('weatherTab.forecastAvgSummary', { avg: formatNum(summary.temperature.forecast.avg) })}
              </Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              borderColor: darkMode ? '#333' : '#e0e0e0',
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {(WEATHER_FIELD_DISPLAY['precipitation']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['precipitation'].shortLabelKey) : t('weatherTab.rainFallback'))} (mm)
            </Typography>
            <Typography variant="body2" sx={{ color: colors.rainActual }}>
              {t('weatherTab.actualCumulative', { value: formatNum(summary.rainfall.actual, 2) })}
            </Typography>
            {summary.rainfall.forecast != null && (
              <Typography variant="body2" sx={{ color: colors.rainForecast, mt: 0.5 }}>
                {t('weatherTab.forecastCumulative', { value: formatNum(summary.rainfall.forecast, 2) })}
              </Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              borderColor: darkMode ? '#333' : '#e0e0e0',
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {(WEATHER_FIELD_DISPLAY['wind_speed_10m']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['wind_speed_10m'].shortLabelKey) : t('weatherTab.windFallback'))} (m/s)
            </Typography>
            <Typography variant="body2" sx={{ color: colors.windActual }}>
              {t('weatherTab.windActualSummary', { avg: formatNum(summary.wind_speed.actual.avg), max: formatNum(summary.wind_speed.actual.max) })}
            </Typography>
            {summary.wind_speed.forecast && (
              <Typography variant="body2" sx={{ color: colors.windForecast, mt: 0.5 }}>
                {t('weatherTab.forecastAvgSummary', { avg: formatNum(summary.wind_speed.forecast.avg) })}
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* 2. 預報準確度 */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
        {t('weatherTab.forecastAccuracy')}
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          mb: 3,
          bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
          borderColor: darkMode ? '#333' : '#e0e0e0',
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">{t('weatherTab.tempMae')}</Typography>
            <Typography variant="body1" fontWeight="600">{accuracy.temperature.count ? accuracy.temperature.mae.toFixed(3) : '–'}</Typography>
            <Typography variant="caption" color="text.secondary">{t('weatherTab.sampleCount', { count: accuracy.temperature.count })}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">{t('weatherTab.rainMae')}</Typography>
            <Typography variant="body1" fontWeight="600">{accuracy.rainfall.count ? accuracy.rainfall.mae.toFixed(3) : '–'}</Typography>
            <Typography variant="caption" color="text.secondary">{t('weatherTab.sampleCount', { count: accuracy.rainfall.count })}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">{t('weatherTab.windMae')}</Typography>
            <Typography variant="body1" fontWeight="600">{accuracy.wind_speed.count ? accuracy.wind_speed.mae.toFixed(3) : '–'}</Typography>
            <Typography variant="caption" color="text.secondary">{t('weatherTab.sampleCount', { count: accuracy.wind_speed.count })}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* 3. 預報誤差時序（實際 − 預報） */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
        {t('weatherTab.errorTimeSeries')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: darkMode ? '#333' : '#e0e0e0' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('weatherTab.errorLabel', { field: WEATHER_FIELD_DISPLAY['temperature_2m']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['temperature_2m'].shortLabelKey) : t('weatherTab.tempFallback') })} (°C)</Typography>
            {errorTimeSeries.temperature.length > 0 ? (
              <BaseChart option={errorTimeOptions.temperature} height={CHART_HEIGHT} />
            ) : (
              <Box sx={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">{t('weatherTab.noComparableData')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: darkMode ? '#333' : '#e0e0e0' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('weatherTab.errorLabel', { field: WEATHER_FIELD_DISPLAY['precipitation']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['precipitation'].shortLabelKey) : t('weatherTab.rainFallback') })} (mm)</Typography>
            {errorTimeSeries.rainfall.length > 0 ? (
              <BaseChart option={errorTimeOptions.rainfall} height={CHART_HEIGHT} />
            ) : (
              <Box sx={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">{t('weatherTab.noComparableData')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: darkMode ? '#333' : '#e0e0e0' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('weatherTab.errorLabel', { field: WEATHER_FIELD_DISPLAY['wind_speed_10m']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['wind_speed_10m'].shortLabelKey) : t('weatherTab.windFallback') })} (m/s)</Typography>
            {errorTimeSeries.wind_speed.length > 0 ? (
              <BaseChart option={errorTimeOptions.wind_speed} height={CHART_HEIGHT} />
            ) : (
              <Box sx={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">{t('weatherTab.noComparableData')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* 4. 實際 vs 預測散點 */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
        {t('weatherTab.actualVsForecast')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: darkMode ? '#333' : '#e0e0e0' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{(WEATHER_FIELD_DISPLAY['temperature_2m']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['temperature_2m'].shortLabelKey) : t('weatherTab.tempFallback'))} (°C)</Typography>
            {scatterData.temperature.length > 0 ? (
              <BaseChart option={scatterOptions.temperature} height={CHART_HEIGHT} />
            ) : (
              <Box sx={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">{t('weatherTab.noComparableData')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: darkMode ? '#333' : '#e0e0e0' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{(WEATHER_FIELD_DISPLAY['precipitation']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['precipitation'].shortLabelKey) : t('weatherTab.rainFallback'))} (mm)</Typography>
            {scatterData.rainfall.length > 0 ? (
              <BaseChart option={scatterOptions.rainfall} height={CHART_HEIGHT} />
            ) : (
              <Box sx={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">{t('weatherTab.noComparableData')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: darkMode ? '#333' : '#e0e0e0' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{(WEATHER_FIELD_DISPLAY['wind_speed_10m']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['wind_speed_10m'].shortLabelKey) : t('weatherTab.windFallback'))} (m/s)</Typography>
            {scatterData.wind_speed.length > 0 ? (
              <BaseChart option={scatterOptions.wind_speed} height={CHART_HEIGHT} />
            ) : (
              <Box sx={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">{t('weatherTab.noComparableData')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* 5. 誤差分布 */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
        {t('weatherTab.errorDistribution')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: darkMode ? '#333' : '#e0e0e0' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('weatherTab.errorLabel', { field: WEATHER_FIELD_DISPLAY['temperature_2m']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['temperature_2m'].shortLabelKey) : t('weatherTab.tempFallback') })} (°C)</Typography>
            {histogramData.temperature.binLabels.length > 0 ? (
              <BaseChart option={histogramOptions.temperature} height={CHART_HEIGHT} />
            ) : (
              <Box sx={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">{t('weatherTab.noComparableData')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: darkMode ? '#333' : '#e0e0e0' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('weatherTab.errorLabel', { field: WEATHER_FIELD_DISPLAY['precipitation']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['precipitation'].shortLabelKey) : t('weatherTab.rainFallback') })} (mm)</Typography>
            {histogramData.rainfall.binLabels.length > 0 ? (
              <BaseChart option={histogramOptions.rainfall} height={CHART_HEIGHT} />
            ) : (
              <Box sx={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">{t('weatherTab.noComparableData')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: darkMode ? '#333' : '#e0e0e0' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('weatherTab.errorLabel', { field: WEATHER_FIELD_DISPLAY['wind_speed_10m']?.shortLabelKey ? t(WEATHER_FIELD_DISPLAY['wind_speed_10m'].shortLabelKey) : t('weatherTab.windFallback') })} (m/s)</Typography>
            {histogramData.wind_speed.binLabels.length > 0 ? (
              <BaseChart option={histogramOptions.wind_speed} height={CHART_HEIGHT} />
            ) : (
              <Box sx={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">{t('weatherTab.noComparableData')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* 6. 在圖表上疊加天氣指引 */}
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        <Typography variant="body2">
          {t('weatherTab.overlayHint')}
        </Typography>
      </Alert>
    </Box>
  );
};

export default WeatherChartSection;
