import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Typography } from '@mui/material';
import { EChartsOption } from 'echarts';
import { useTheme } from '@/app/ThemeProvider';
import { WeatherHourlyData } from '@/types';
import { useChartColors } from '@/utils/chart-colors';
import { createGrid, createTimeAxis, createValueAxis } from '@/utils/echartsHelpers';
import { buildLegendLabel } from '@/constants/weatherCategories';

interface HourlyWeatherChartsProps {
    data: WeatherHourlyData[];
    selectedCategoryIds: Set<string>;
    isPending?: boolean;
}

export const HourlyWeatherCharts: React.FC<HourlyWeatherChartsProps> = ({ data, selectedCategoryIds, isPending = false }) => {
    const { darkMode } = useTheme();
    const colors = useChartColors();

    // Base Time mapping
    const times = useMemo(() => data.map(d => new Date(d.datetime).getTime()), [data]);

    // 1. Temperature & Apparent Temperature & Dew Point (hourly_temperature)
    const tempOption = useMemo<EChartsOption>(() => {
        if (!data.length || !selectedCategoryIds.has('hourly_temperature')) return {};
        const temps = data.map(d => d.temperature_2m !== null ? [new Date(d.datetime).getTime(), d.temperature_2m] : null).filter(Boolean);
        const apparent = data.map(d => d.apparent_temperature !== undefined && d.apparent_temperature !== null ? [new Date(d.datetime).getTime(), d.apparent_temperature] : null).filter(Boolean);
        const dew = data.map(d => d.dew_point_2m !== undefined && d.dew_point_2m !== null ? [new Date(d.datetime).getTime(), d.dew_point_2m] : null).filter(Boolean);

        const tName = buildLegendLabel('temperature_2m', 'none') + ' (°C)';
        const aName = buildLegendLabel('apparent_temperature', 'none') + ' (°C)';
        const dName = buildLegendLabel('dew_point_2m', 'none') + ' (°C)';

        return {
            tooltip: { trigger: 'axis' },
            legend: { data: [tName, aName, dName], textStyle: { color: colors.text } },
            grid: createGrid(),
            xAxis: createTimeAxis(colors),
            yAxis: createValueAxis(colors, { name: '溫度 (°C)' }),
            series: [
                { name: tName, type: 'line', data: temps, smooth: true, itemStyle: { color: '#ff7043' } },
                { name: aName, type: 'line', data: apparent, smooth: true, lineStyle: { type: 'dashed' }, itemStyle: { color: '#ffcc80' } },
                { name: dName, type: 'line', data: dew, smooth: true, itemStyle: { color: '#4caf50' } }
            ],
            dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10, textStyle: { color: colors.text } }]
        };
    }, [data, colors, selectedCategoryIds]);

    // 2. Humidity (hourly_humidity)
    const humidOption = useMemo<EChartsOption>(() => {
        if (!data.length || !selectedCategoryIds.has('hourly_humidity')) return {};
        const humids = data.map(d => d.relative_humidity_2m !== null ? [new Date(d.datetime).getTime(), d.relative_humidity_2m] : null).filter(Boolean);

        const hName = buildLegendLabel('relative_humidity_2m', 'none') + ' (%)';

        return {
            tooltip: { trigger: 'axis' },
            legend: { data: [hName], textStyle: { color: colors.text } },
            grid: createGrid(),
            xAxis: createTimeAxis(colors),
            yAxis: createValueAxis(colors, { name: '濕度 (%)', max: 100 }),
            series: [
                { name: hName, type: 'line', data: humids, smooth: true, itemStyle: { color: '#42a5f5' } }
            ],
            dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10, textStyle: { color: colors.text } }]
        };
    }, [data, colors, selectedCategoryIds]);

    // 3. Precipitation & Snow (hourly_precipitation)
    const precipOption = useMemo<EChartsOption>(() => {
        if (!data.length || !selectedCategoryIds.has('hourly_precipitation')) return {};
        const precips = data.map(d => d.precipitation !== null ? [new Date(d.datetime).getTime(), d.precipitation] : null).filter(Boolean);
        const snows = data.map(d => d.snowfall !== null ? [new Date(d.datetime).getTime(), d.snowfall] : null).filter(Boolean);
        const snowDepths = data.map(d => d.snow_depth !== undefined && d.snow_depth !== null ? [new Date(d.datetime).getTime(), d.snow_depth] : null).filter(Boolean);

        const pName = buildLegendLabel('precipitation', 'none') + ' (mm)';
        const sName = buildLegendLabel('snowfall', 'none') + ' (cm)';
        const sdName = buildLegendLabel('snow_depth', 'none') + ' (m)';

        return {
            tooltip: { trigger: 'axis' },
            legend: { data: [pName, sName, sdName], textStyle: { color: colors.text } },
            grid: createGrid(),
            xAxis: createTimeAxis(colors),
            yAxis: [
                createValueAxis(colors, { name: '降水量/降雪量' }),
                { ...createValueAxis(colors, { name: '積雪深度' }), position: 'right' }
            ] as any,
            series: [
                { name: pName, type: 'bar', data: precips, itemStyle: { color: '#42a5f5' } },
                { name: sName, type: 'bar', data: snows, itemStyle: { color: '#90caf9' }, stack: 'precip' },
                { name: sdName, type: 'line', data: snowDepths, itemStyle: { color: '#e0e0e0' }, yAxisIndex: 1 }
            ],
            dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10, textStyle: { color: colors.text } }]
        };
    }, [data, colors, selectedCategoryIds]);

    // 4. Wind (hourly_wind)
    const windOption = useMemo<EChartsOption>(() => {
        if (!data.length || !selectedCategoryIds.has('hourly_wind')) return {};
        const speeds = data.map(d => d.wind_speed_10m !== null ? [new Date(d.datetime).getTime(), d.wind_speed_10m] : null).filter(Boolean);
        const gusts = data.map(d => d.wind_gusts_10m !== undefined && d.wind_gusts_10m !== null ? [new Date(d.datetime).getTime(), d.wind_gusts_10m] : null).filter(Boolean);

        const wName = buildLegendLabel('wind_speed_10m', 'none') + ' (m/s)';
        const wgName = buildLegendLabel('wind_gusts_10m', 'none') + ' (m/s)';

        return {
            tooltip: { trigger: 'axis' },
            legend: { data: [wName, wgName], textStyle: { color: colors.text } },
            grid: createGrid(),
            xAxis: createTimeAxis(colors),
            yAxis: createValueAxis(colors, { name: '風速 (m/s)' }),
            series: [
                { name: wName, type: 'line', data: speeds, smooth: true, itemStyle: { color: '#66bb6a' } },
                { name: wgName, type: 'line', data: gusts, smooth: true, lineStyle: { type: 'dashed' }, itemStyle: { color: '#81c784' } }
            ],
            dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10, textStyle: { color: colors.text } }]
        };
    }, [data, colors, selectedCategoryIds]);

    // 5. Cloud & Radiation (hourly_cloud_radiation)
    const cloudRadiationOption = useMemo<EChartsOption>(() => {
        if (!data.length || !selectedCategoryIds.has('hourly_cloud_radiation')) return {};
        const clouds = data.map(d => d.cloud_cover !== null ? [new Date(d.datetime).getTime(), d.cloud_cover] : null).filter(Boolean);
        const rads = data.map(d => d.shortwave_radiation !== null ? [new Date(d.datetime).getTime(), d.shortwave_radiation] : null).filter(Boolean);

        const cName = buildLegendLabel('cloud_cover', 'none') + ' (%)';
        const srName = buildLegendLabel('shortwave_radiation', 'none') + ' (W/m²)';

        return {
            tooltip: { trigger: 'axis' },
            legend: { data: [cName, srName], textStyle: { color: colors.text } },
            grid: createGrid(),
            xAxis: createTimeAxis(colors),
            yAxis: [
                createValueAxis(colors, { name: '雲量 (%)', max: 100 }),
                { ...createValueAxis(colors, { name: '短波輻射 (W/m²)' }), position: 'right' }
            ] as any,
            series: [
                { name: cName, type: 'line', data: clouds, smooth: true, itemStyle: { color: '#90a4ae' }, areaStyle: { color: 'rgba(144,164,174,0.3)' } },
                { name: srName, type: 'line', data: rads, smooth: true, yAxisIndex: 1, itemStyle: { color: '#ffca28' }, areaStyle: { color: 'rgba(255,202,40,0.3)' } }
            ],
            dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10, textStyle: { color: colors.text } }]
        };
    }, [data, colors, selectedCategoryIds]);

    // 6. Pressure (hourly_pressure)
    const pressureOption = useMemo<EChartsOption>(() => {
        if (!data.length || !selectedCategoryIds.has('hourly_pressure')) return {};
        const msl = data.map(d => d.pressure_msl !== undefined && d.pressure_msl !== null ? [new Date(d.datetime).getTime(), d.pressure_msl] : null).filter(Boolean);
        const surface = data.map(d => d.surface_pressure !== undefined && d.surface_pressure !== null ? [new Date(d.datetime).getTime(), d.surface_pressure] : null).filter(Boolean);

        const mslName = buildLegendLabel('pressure_msl', 'none') + ' (hPa)';
        const surfName = buildLegendLabel('surface_pressure', 'none') + ' (hPa)';

        return {
            tooltip: { trigger: 'axis' },
            legend: { data: [mslName, surfName], textStyle: { color: colors.text } },
            grid: createGrid(),
            xAxis: createTimeAxis(colors),
            yAxis: { ...createValueAxis(colors, { name: '氣壓 (hPa)' }), scale: true } as any,
            series: [
                { name: mslName, type: 'line', data: msl, smooth: true, itemStyle: { color: '#ab47bc' } },
                { name: surfName, type: 'line', data: surface, smooth: true, itemStyle: { color: '#ce93d8' } }
            ],
            dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10, textStyle: { color: colors.text } }]
        };
    }, [data, colors, selectedCategoryIds]);

    // 7. Soil (hourly_soil)
    const soilOption = useMemo<EChartsOption>(() => {
        if (!data.length || !selectedCategoryIds.has('hourly_soil')) return {};
        const soilTemp = data.map(d => d.soil_temperature_0_to_7cm !== undefined && d.soil_temperature_0_to_7cm !== null ? [new Date(d.datetime).getTime(), d.soil_temperature_0_to_7cm] : null).filter(Boolean);
        const soilMoist = data.map(d => d.soil_moisture_0_to_7cm !== undefined && d.soil_moisture_0_to_7cm !== null ? [new Date(d.datetime).getTime(), d.soil_moisture_0_to_7cm] : null).filter(Boolean);

        const stName = buildLegendLabel('soil_temperature_0_to_7cm', 'none') + ' (°C)';
        const smName = buildLegendLabel('soil_moisture_0_to_7cm', 'none') + ' (m³/m³)';

        return {
            tooltip: { trigger: 'axis' },
            legend: { data: [stName, smName], textStyle: { color: colors.text } },
            grid: createGrid(),
            xAxis: createTimeAxis(colors),
            yAxis: [
                createValueAxis(colors, { name: '溫度 (°C)' }),
                { ...createValueAxis(colors, { name: '濕度' }), position: 'right' }
            ] as any,
            series: [
                { name: stName, type: 'line', data: soilTemp, smooth: true, itemStyle: { color: '#8d6e63' } },
                { name: smName, type: 'line', data: soilMoist, smooth: true, yAxisIndex: 1, itemStyle: { color: '#5d4037' } }
            ],
            dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 10, textStyle: { color: colors.text } }]
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
            <ChartCard title="溫度與體感" option={tempOption} />
            <ChartCard title="濕度" option={humidOption} />
            <ChartCard title="降水與雪" option={precipOption} />
            <ChartCard title="風" option={windOption} />
            <ChartCard title="雲量與輻射" option={cloudRadiationOption} />
            <ChartCard title="氣壓" option={pressureOption} />
            <ChartCard title="土壤" option={soilOption} />
        </Box>
    );
};
