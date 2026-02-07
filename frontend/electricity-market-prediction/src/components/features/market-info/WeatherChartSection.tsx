'use client';

import React, { useMemo } from 'react';
import { Box, Paper, Typography, Divider, Grid, Alert } from '@mui/material';
import { format } from 'date-fns';
import type { EChartsOption } from 'echarts';

import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chartColors';
import BaseChart from '@/components/charts/BaseChart';

// Extended weather data shape (merged actual + forecast)
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

const formatTime = (ts: number) => format(new Date(ts), 'MM/dd HH:mm');

const WeatherChartSection = ({
  weatherActual,
  weatherForecast,
  weatherChartData,
}: WeatherChartSectionProps) => {
  const { darkMode } = useTheme();
  const colors = useChartColors();

  const sortedData = useMemo(() => {
    if (!weatherChartData) return [];
    return [...weatherChartData].sort(
      (a, b) =>
        new Date(a.weather_datetime).getTime() -
        new Date(b.weather_datetime).getTime()
    );
  }, [weatherChartData]);

  const timestamps = useMemo(
    () => sortedData.map((d) => new Date(d.weather_datetime).getTime()),
    [sortedData]
  );

  const dataMinTime = timestamps[0];
  const dataMaxTime = timestamps[timestamps.length - 1];

  const predictionStartTime = useMemo(() => {
    if (!sortedData || sortedData.length === 0) return null;

    let lastActualIndex = -1;
    for (let i = sortedData.length - 1; i >= 0; i--) {
      const val = sortedData[i].temperature_actual;
      if (val !== null && val !== undefined) {
        lastActualIndex = i;
        break;
      }
    }

    if (lastActualIndex === -1) {
      return sortedData.length > 0
        ? new Date(sortedData[0].weather_datetime).getTime()
        : null;
    }
    if (lastActualIndex === sortedData.length - 1) return null;

    return new Date(sortedData[lastActualIndex].weather_datetime).getTime();
  }, [sortedData]);

  const hasData =
    weatherActual.length > 0 ||
    weatherForecast.length > 0 ||
    (sortedData && sortedData.length > 0);

  const forecastMarkArea = useMemo(() => {
    if (!predictionStartTime || !dataMaxTime) return undefined;
    return {
      silent: true,
      itemStyle: {
        color: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      },
      data: [[{ xAxis: predictionStartTime }, { xAxis: dataMaxTime }]],
    };
  }, [predictionStartTime, dataMaxTime, darkMode]);

  const forecastMarkLine = useMemo(() => {
    if (!predictionStartTime) return undefined;
    return {
      silent: true,
      symbol: 'none',
      lineStyle: {
        color: colors.dividerLine,
        type: 'dashed',
        width: 2,
      },
      label: { show: false },
      data: [{ xAxis: predictionStartTime }],
    };
  }, [predictionStartTime, colors.dividerLine]);

  const tempRainOption = useMemo<EChartsOption>(() => {
    if (!sortedData.length) return {};

    const tooltipFormatter = (params: any) => {
      const list = Array.isArray(params) ? params : [params];
      const ts = list?.[0]?.value?.[0];
      const header = ts ? formatTime(ts) : '';

      const rows: Array<{ label: string; value: any; unit: string; color: string }> =
        [];

      const find = (name: string) => list.find((p: any) => p?.seriesName === name);

      const tempAct = find('實際溫度')?.value?.[1];
      const tempFc = find('預報溫度')?.value?.[1];
      const rainAct = find('實際降雨')?.value?.[1];
      const rainFc = find('預報降雨')?.value?.[1];

      if (tempAct != null) rows.push({ label: '實際溫度', value: tempAct, unit: '°C', color: colors.tempActual });
      if (tempFc != null) rows.push({ label: '預報溫度', value: tempFc, unit: '°C', color: colors.tempForecast });
      if (rainAct != null) rows.push({ label: '實際降雨', value: rainAct, unit: 'mm', color: colors.rainActual });
      if (rainFc != null) rows.push({ label: '預報降雨', value: rainFc, unit: 'mm', color: colors.rainForecast });

      const body = rows
        .map(
          (r) => `
          <div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${r.color};"></span>
              <span style="color:${darkMode ? '#ccc' : '#666'};font-size:12px;">${r.label}:</span>
            </div>
            <span style="color:${darkMode ? '#fff' : '#000'};font-weight:700;font-size:12px;">${Number(r.value).toFixed(2)} ${r.unit}</span>
          </div>`
        )
        .join('');

      return `
        <div style="
          padding:12px;
          border:1px solid ${colors.tooltipBorder};
          background:${colors.tooltipBg};
          color:${colors.text};
          box-shadow:0 4px 10px rgba(0,0,0,0.5);
          min-width:180px;
          max-width:260px;
          pointer-events:none;
        ">
          <div style="font-weight:800;margin-bottom:8px;border-bottom:1px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};padding-bottom:6px;">
            ${header}
          </div>
          ${body}
        </div>
      `;
    };

    return {
      grid: { left: 50, right: 55, top: 45, bottom: 40, containLabel: true },
      legend: {
        top: 8,
        textStyle: { color: colors.text, fontSize: 12 },
      },
      xAxis: {
        type: 'time',
        min: dataMinTime,
        max: dataMaxTime,
        axisLabel: { color: colors.text, fontSize: 11, hideOverlap: true },
        axisLine: { lineStyle: { color: colors.grid } },
        splitLine: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: '°C',
          position: 'left',
          axisLabel: { color: colors.text, fontSize: 11 },
          splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } },
        },
        {
          type: 'value',
          name: 'mm',
          position: 'right',
          axisLabel: { color: colors.text, fontSize: 11 },
          splitLine: { show: false },
        },
      ],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'transparent',
        borderWidth: 0,
        extraCssText: 'pointer-events:none;',
        formatter: tooltipFormatter as any,
        axisPointer: { type: 'cross' },
      },
      series: [
        // Forecast range
        ...(forecastMarkArea
          ? [
              {
                name: '預測區間',
                type: 'line',
                data: [
                  [dataMinTime, 0],
                  [dataMaxTime, 0],
                ],
                showSymbol: false,
                lineStyle: { opacity: 0 },
                itemStyle: { opacity: 0 },
                silent: true,
                markArea: forecastMarkArea,
                markLine: forecastMarkLine,
                z: 0,
              } as any,
            ]
          : []),
        {
          name: '預報降雨',
          type: 'bar',
          yAxisIndex: 1,
          barWidth: 14,
          itemStyle: { color: colors.rainForecast, opacity: 0.3 },
          data: sortedData.map((d) => [
            new Date(d.weather_datetime).getTime(),
            d.rainfall_forecast,
          ]),
        },
        {
          name: '實際降雨',
          type: 'bar',
          yAxisIndex: 1,
          barWidth: 14,
          itemStyle: { color: colors.rainActual, opacity: 0.9 },
          data: sortedData.map((d) => [
            new Date(d.weather_datetime).getTime(),
            d.rainfall_actual,
          ]),
        },
        {
          name: '預報溫度',
          type: 'line',
          yAxisIndex: 0,
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 2, color: colors.tempForecast, type: 'dashed' },
          itemStyle: { color: colors.tempForecast },
          data: sortedData.map((d) => [
            new Date(d.weather_datetime).getTime(),
            d.temperature_forecast,
          ]),
        },
        {
          name: '實際溫度',
          type: 'line',
          yAxisIndex: 0,
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 2, color: colors.tempActual },
          itemStyle: { color: colors.tempActual },
          data: sortedData.map((d) => [
            new Date(d.weather_datetime).getTime(),
            d.temperature_actual,
          ]),
        },
      ],
      animation: false,
    };
  }, [
    sortedData,
    colors,
    darkMode,
    dataMinTime,
    dataMaxTime,
    forecastMarkArea,
    forecastMarkLine,
  ]);

  const windOption = useMemo<EChartsOption>(() => {
    if (!sortedData.length) return {};

    const tooltipFormatter = (params: any) => {
      const list = Array.isArray(params) ? params : [params];
      const ts = list?.[0]?.value?.[0];
      const header = ts ? formatTime(ts) : '';

      const rows: Array<{ label: string; value: any; unit: string; color: string }> =
        [];

      const find = (name: string) => list.find((p: any) => p?.seriesName === name);
      const windAct = find('實際風速')?.value?.[1];
      const windFc = find('預報風速')?.value?.[1];

      if (windAct != null) rows.push({ label: '實際風速', value: windAct, unit: 'm/s', color: colors.windActual });
      if (windFc != null) rows.push({ label: '預報風速', value: windFc, unit: 'm/s', color: colors.windForecast });

      const body = rows
        .map(
          (r) => `
          <div style="display:flex;justify-content:space-between;gap:16px;margin:4px 0;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${r.color};"></span>
              <span style="color:${darkMode ? '#ccc' : '#666'};font-size:12px;">${r.label}:</span>
            </div>
            <span style="color:${darkMode ? '#fff' : '#000'};font-weight:700;font-size:12px;">${Number(r.value).toFixed(2)} ${r.unit}</span>
          </div>`
        )
        .join('');

      return `
        <div style="
          padding:12px;
          border:1px solid ${colors.tooltipBorder};
          background:${colors.tooltipBg};
          color:${colors.text};
          box-shadow:0 4px 10px rgba(0,0,0,0.5);
          min-width:180px;
          max-width:260px;
          pointer-events:none;
        ">
          <div style="font-weight:800;margin-bottom:8px;border-bottom:1px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};padding-bottom:6px;">
            ${header}
          </div>
          ${body}
        </div>
      `;
    };

    return {
      grid: { left: 50, right: 20, top: 25, bottom: 35, containLabel: true },
      legend: {
        top: 0,
        textStyle: { color: colors.text, fontSize: 12 },
      },
      xAxis: {
        type: 'time',
        min: dataMinTime,
        max: dataMaxTime,
        axisLabel: { color: colors.text, fontSize: 11, hideOverlap: true },
        axisLine: { lineStyle: { color: colors.grid } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'm/s',
        axisLabel: { color: colors.text, fontSize: 11 },
        splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'transparent',
        borderWidth: 0,
        extraCssText: 'pointer-events:none;',
        formatter: tooltipFormatter as any,
        axisPointer: { type: 'cross' },
      },
      series: [
        ...(forecastMarkArea
          ? [
              {
                name: '預測區間',
                type: 'line',
                data: [
                  [dataMinTime, 0],
                  [dataMaxTime, 0],
                ],
                showSymbol: false,
                lineStyle: { opacity: 0 },
                itemStyle: { opacity: 0 },
                silent: true,
                markArea: forecastMarkArea,
                markLine: forecastMarkLine,
                z: 0,
              } as any,
            ]
          : []),
        {
          name: '預報風速',
          type: 'line',
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 2, color: colors.windForecast, type: 'dashed' },
          areaStyle: { color: colors.windForecast, opacity: 0.08 },
          data: sortedData.map((d) => [
            new Date(d.weather_datetime).getTime(),
            d.wind_speed_forecast,
          ]),
        },
        {
          name: '實際風速',
          type: 'line',
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 2, color: colors.windActual },
          areaStyle: { color: colors.windActual, opacity: 0.15 },
          data: sortedData.map((d) => [
            new Date(d.weather_datetime).getTime(),
            d.wind_speed_actual,
          ]),
        },
      ],
      animation: false,
    };
  }, [
    sortedData,
    colors,
    darkMode,
    dataMinTime,
    dataMaxTime,
    forecastMarkArea,
    forecastMarkLine,
  ]);

  if (!hasData) {
    return (
      <Box sx={{ mt: 3 }}>
        <Typography
          variant="h6"
          gutterBottom
          fontWeight="bold"
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          天氣資訊 (Weather Information)
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Alert severity="info">
          該時段無天氣資料 (No weather data available for this period)
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography
        variant="h6"
        gutterBottom
        fontWeight="bold"
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        天氣資訊 (Weather Information)
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          p: 3,
          borderRadius: 2,
          bgcolor: darkMode ? '#141414' : '#fff',
          borderColor: darkMode ? '#333' : '#e0e0e0',
        }}
      >
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{ color: colors.tempActual, mb: 1 }}
            >
              氣溫與降雨趨勢 (Temperature and Rainfall Trend)
            </Typography>
            <BaseChart option={tempRainOption} height={300} />
          </Grid>

          <Grid item xs={12}>
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{ color: colors.windActual, mb: 1 }}
            >
              風速變化 (Wind Speed Trend)
            </Typography>
            <BaseChart option={windOption} height={180} />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default WeatherChartSection;