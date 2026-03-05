import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Typography } from '@mui/material';
import { EChartsOption } from 'echarts';
import { useTheme } from '@/app/ThemeProvider';
import { WeatherDailyData } from '@/types';
import { useChartColors } from '@/utils/chart-colors';
import { createGrid, createTimeAxis, createValueAxis } from '@/utils/echartsHelpers';
import { buildLegendLabel } from '@/constants/weatherCategories';

interface DailyWeatherSummaryProps {
    data: WeatherDailyData[];
    selectedCategoryIds: Set<string>;
    isPending?: boolean;
}

export const DailyWeatherSummary: React.FC<DailyWeatherSummaryProps> = ({ data, selectedCategoryIds, isPending = false }) => {
    const { darkMode } = useTheme();
    const colors = useChartColors();

    // 1. Temperature (daily_temperature)
    const tempOption = useMemo<EChartsOption>(() => {
        if (!data.length || !selectedCategoryIds.has('daily_temperature')) return {};
        const means = data.map(d => d.temperature_2m_mean !== null ? [new Date(d.datetime).getTime(), d.temperature_2m_mean] : null).filter(Boolean);
        const maxs = data.map(d => d.temperature_2m_max !== null ? [new Date(d.datetime).getTime(), d.temperature_2m_max] : null).filter(Boolean);
        const mins = data.map(d => d.temperature_2m_min !== null ? [new Date(d.datetime).getTime(), d.temperature_2m_min] : null).filter(Boolean);

        const maxName = buildLegendLabel('temperature_2m_max', 'none') + ' (°C)';
        const meanName = buildLegendLabel('temperature_2m_mean', 'none') + ' (°C)';
        const minName = buildLegendLabel('temperature_2m_min', 'none') + ' (°C)';

        return {
            tooltip: { trigger: 'axis' },
            legend: { data: [maxName, meanName, minName], textStyle: { color: colors.text } },
            grid: createGrid(),
            xAxis: createTimeAxis(colors),
            yAxis: createValueAxis(colors, { name: '溫度 (°C)' }),
            series: [
                { name: maxName, type: 'line', data: maxs, smooth: true, itemStyle: { color: '#ff5722' } },
                { name: meanName, type: 'line', data: means, smooth: true, lineStyle: { type: 'dashed' }, itemStyle: { color: '#ff9800' } },
                { name: minName, type: 'line', data: mins, smooth: true, itemStyle: { color: '#03a9f4' } }
            ]
        };
    }, [data, colors, selectedCategoryIds]);

    // 2. Precipitation & Radiation (daily_precipitation_radiation)
    const precipRadOption = useMemo<EChartsOption>(() => {
        if (!data.length || !selectedCategoryIds.has('daily_precipitation_radiation')) return {};
        const precipSums = data.map(d => d.precipitation_sum !== null ? [new Date(d.datetime).getTime(), d.precipitation_sum] : null).filter(Boolean);
        const radSums = data.map(d => d.shortwave_radiation_sum !== null ? [new Date(d.datetime).getTime(), d.shortwave_radiation_sum] : null).filter(Boolean);

        const pName = buildLegendLabel('precipitation_sum', 'none') + ' (mm)';
        const srName = buildLegendLabel('shortwave_radiation_sum', 'none') + ' (MJ/m²)';

        return {
            tooltip: { trigger: 'axis' },
            legend: { data: [pName, srName], textStyle: { color: colors.text } },
            grid: createGrid(),
            xAxis: createTimeAxis(colors),
            yAxis: [
                createValueAxis(colors, { name: '降水量 (mm)' }),
                { ...createValueAxis(colors, { name: '輻射 (MJ/m²)' }), position: 'right' }
            ] as any,
            series: [
                { name: pName, type: 'bar', data: precipSums, itemStyle: { color: '#42a5f5' } },
                { name: srName, type: 'line', data: radSums, smooth: true, yAxisIndex: 1, itemStyle: { color: '#ffb74d' } }
            ]
        };
    }, [data, colors, selectedCategoryIds]);

    // 3. Sunshine (daily_sunshine)
    const sunshineOption = useMemo<EChartsOption>(() => {
        if (!data.length || !selectedCategoryIds.has('daily_sunshine')) return {};
        // Convert seconds to hours
        const sunshine = data.map(d => d.sunshine_duration !== null ? [new Date(d.datetime).getTime(), d.sunshine_duration / 3600] : null).filter(Boolean);
        const daylight = data.map(d => d.daylight_duration !== undefined && d.daylight_duration !== null ? [new Date(d.datetime).getTime(), d.daylight_duration / 3600] : null).filter(Boolean);

        const ssName = buildLegendLabel('sunshine_duration', 'none') + ' (h)';
        const dlName = buildLegendLabel('daylight_duration', 'none') + ' (h)';

        return {
            tooltip: { trigger: 'axis' },
            legend: { data: [ssName, dlName], textStyle: { color: colors.text } },
            grid: createGrid(),
            xAxis: createTimeAxis(colors),
            yAxis: createValueAxis(colors, { name: '時數 (h)' }),
            series: [
                { name: ssName, type: 'line', data: sunshine, smooth: true, itemStyle: { color: '#fbc02d' }, areaStyle: { color: 'rgba(251,192,45,0.3)' } },
                { name: dlName, type: 'line', data: daylight, smooth: true, lineStyle: { type: 'dashed' }, itemStyle: { color: '#ffeb3b' } }
            ]
        };
    }, [data, colors, selectedCategoryIds]);

    // 4. Wind (daily_wind)
    const windOption = useMemo<EChartsOption>(() => {
        if (!data.length || !selectedCategoryIds.has('daily_wind')) return {};
        const maxWind = data.map(d => d.wind_speed_10m_max !== undefined && d.wind_speed_10m_max !== null ? [new Date(d.datetime).getTime(), d.wind_speed_10m_max] : null).filter(Boolean);
        const meanWind = data.map(d => d.wind_speed_10m_mean !== undefined && d.wind_speed_10m_mean !== null ? [new Date(d.datetime).getTime(), d.wind_speed_10m_mean] : null).filter(Boolean);
        const maxGusts = data.map(d => d.wind_gusts_10m_max !== undefined && d.wind_gusts_10m_max !== null ? [new Date(d.datetime).getTime(), d.wind_gusts_10m_max] : null).filter(Boolean);

        const maxWName = buildLegendLabel('wind_speed_10m_max', 'none') + ' (m/s)';
        const meanWName = buildLegendLabel('wind_speed_10m_mean', 'none') + ' (m/s)';
        const maxGName = buildLegendLabel('wind_gusts_10m_max', 'none') + ' (m/s)';

        return {
            tooltip: { trigger: 'axis' },
            legend: { data: [maxWName, meanWName, maxGName], textStyle: { color: colors.text } },
            grid: createGrid(),
            xAxis: createTimeAxis(colors),
            yAxis: createValueAxis(colors, { name: '風速 (m/s)' }),
            series: [
                { name: maxWName, type: 'line', data: maxWind, smooth: true, itemStyle: { color: '#00838f' } },
                { name: meanWName, type: 'line', data: meanWind, smooth: true, lineStyle: { type: 'dashed' }, itemStyle: { color: '#4dd0e1' } },
                { name: maxGName, type: 'line', data: maxGusts, smooth: true, itemStyle: { color: '#006064' } }
            ]
        };
    }, [data, colors, selectedCategoryIds]);

    // 5. Humidity (daily_humidity)
    const humidOption = useMemo<EChartsOption>(() => {
        if (!data.length || !selectedCategoryIds.has('daily_humidity')) return {};
        const means = data.map(d => d.relative_humidity_2m_mean !== undefined && d.relative_humidity_2m_mean !== null ? [new Date(d.datetime).getTime(), d.relative_humidity_2m_mean] : null).filter(Boolean);
        const maxs = data.map(d => d.relative_humidity_2m_max !== undefined && d.relative_humidity_2m_max !== null ? [new Date(d.datetime).getTime(), d.relative_humidity_2m_max] : null).filter(Boolean);
        const mins = data.map(d => d.relative_humidity_2m_min !== undefined && d.relative_humidity_2m_min !== null ? [new Date(d.datetime).getTime(), d.relative_humidity_2m_min] : null).filter(Boolean);

        const maxHName = buildLegendLabel('relative_humidity_2m_max', 'none') + ' (%)';
        const meanHName = buildLegendLabel('relative_humidity_2m_mean', 'none') + ' (%)';
        const minHName = buildLegendLabel('relative_humidity_2m_min', 'none') + ' (%)';

        return {
            tooltip: { trigger: 'axis' },
            legend: { data: [maxHName, meanHName, minHName], textStyle: { color: colors.text } },
            grid: createGrid(),
            xAxis: createTimeAxis(colors),
            yAxis: createValueAxis(colors, { name: '濕度 (%)', max: 100 }),
            series: [
                { name: maxHName, type: 'line', data: maxs, smooth: true, itemStyle: { color: '#1976d2' } },
                { name: meanHName, type: 'line', data: means, smooth: true, lineStyle: { type: 'dashed' }, itemStyle: { color: '#64b5f6' } },
                { name: minHName, type: 'line', data: mins, smooth: true, itemStyle: { color: '#bbdefb' } }
            ]
        };
    }, [data, colors, selectedCategoryIds]);

    // 6. Pressure (daily_pressure)
    const pressureOption = useMemo<EChartsOption>(() => {
        if (!data.length || !selectedCategoryIds.has('daily_pressure')) return {};
        const means = data.map(d => d.pressure_msl_mean !== undefined && d.pressure_msl_mean !== null ? [new Date(d.datetime).getTime(), d.pressure_msl_mean] : null).filter(Boolean);
        const maxs = data.map(d => d.pressure_msl_max !== undefined && d.pressure_msl_max !== null ? [new Date(d.datetime).getTime(), d.pressure_msl_max] : null).filter(Boolean);
        const mins = data.map(d => d.pressure_msl_min !== undefined && d.pressure_msl_min !== null ? [new Date(d.datetime).getTime(), d.pressure_msl_min] : null).filter(Boolean);

        const maxPName = buildLegendLabel('pressure_msl_max', 'none') + ' (hPa)';
        const meanPName = buildLegendLabel('pressure_msl_mean', 'none') + ' (hPa)';
        const minPName = buildLegendLabel('pressure_msl_min', 'none') + ' (hPa)';

        return {
            tooltip: { trigger: 'axis' },
            legend: { data: [maxPName, meanPName, minPName], textStyle: { color: colors.text } },
            grid: createGrid(),
            xAxis: createTimeAxis(colors),
            yAxis: { ...createValueAxis(colors, { name: '氣壓 (hPa)' }), scale: true } as any,
            series: [
                { name: maxPName, type: 'line', data: maxs, smooth: true, itemStyle: { color: '#7b1fa2' } },
                { name: meanPName, type: 'line', data: means, smooth: true, lineStyle: { type: 'dashed' }, itemStyle: { color: '#ba68c8' } },
                { name: minPName, type: 'line', data: mins, smooth: true, itemStyle: { color: '#e1bee7' } }
            ]
        };
    }, [data, colors, selectedCategoryIds]);

    const ChartCard = ({ title, option }: { title: string, option: EChartsOption }) => {
        if (Object.keys(option).length === 0 || !Array.isArray(option.series) || option.series.every(s => !(s as any).data || (s as any).data.length === 0)) return null;
        return (
            <Box sx={{ p: 2, bgcolor: 'var(--card-bg)', borderRadius: 2, border: '1px solid var(--card-border)', mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</Typography>
                <ReactECharts option={option} style={{ height: 300, width: '100%' }} opts={{ renderer: 'svg' }} theme={darkMode ? 'dark' : 'light'} showLoading={isPending} />
            </Box>
        );
    }

    if (selectedCategoryIds.size === 0) {
        return <Typography color="text.secondary">尚未選取任何資料類別。</Typography>;
    }

    return (
        <Box>
            <ChartCard title="日溫度" option={tempOption} />
            <ChartCard title="日降水與輻射" option={precipRadOption} />
            <ChartCard title="日照與晝長" option={sunshineOption} />
            <ChartCard title="日風力" option={windOption} />
            <ChartCard title="日濕度" option={humidOption} />
            <ChartCard title="日氣壓" option={pressureOption} />
        </Box>
    );
};
