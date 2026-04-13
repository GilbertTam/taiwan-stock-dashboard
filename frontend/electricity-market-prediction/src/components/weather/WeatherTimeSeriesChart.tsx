'use client';

import React, { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { EChartsOption } from 'echarts';
import { BaseChart } from '@/components/charts/BaseChart';
import { createTimeAxis, createValueAxis, createGrid, createTooltip } from '@/utils/echartsHelpers';
import { useTranslation } from 'react-i18next';
import { WEATHER_FIELD_DISPLAY, weatherColors } from '@/constants/weatherCategories';
import { parseToTimestamp, formatInTimezone, formatDateTimeJST } from '@/utils/chart/dates';

// Map fields to their corresponding color sets
const getFieldColors = (fieldKey: string) => {
    if (fieldKey.includes('apparent_temperature')) {
        return { actual: weatherColors.apparentActual, forecast: weatherColors.apparentForecast };
    }
    if (fieldKey.includes('dew_point')) {
        return { actual: weatherColors.dewActual, forecast: weatherColors.dewForecast };
    }
    if (fieldKey.includes('temperature')) {
        return { actual: weatherColors.tempActual, forecast: weatherColors.tempForecast };
    }
    if (fieldKey.includes('snow')) {
        return { actual: weatherColors.snowActual, forecast: weatherColors.snowForecast };
    }
    if (fieldKey.includes('precipitation') || fieldKey.includes('rain')) {
        return { actual: weatherColors.precipActual, forecast: weatherColors.precipForecast };
    }
    if (fieldKey.includes('gust')) {
        return { actual: weatherColors.gustActual, forecast: weatherColors.gustForecast };
    }
    if (fieldKey.includes('wind')) {
        return { actual: weatherColors.windActual, forecast: weatherColors.windForecast };
    }
    if (fieldKey.includes('humidity')) {
        return { actual: weatherColors.humidityActual, forecast: weatherColors.humidityForecast };
    }
    if (fieldKey.includes('cloud')) {
        return { actual: weatherColors.cloudActual, forecast: weatherColors.cloudForecast };
    }
    if (fieldKey.includes('sunshine')) {
        return { actual: weatherColors.sunshineActual, forecast: weatherColors.sunshineForecast };
    }
    if (fieldKey.includes('daylight')) {
        return { actual: weatherColors.daylightActual, forecast: weatherColors.daylightForecast };
    }
    if (fieldKey.includes('radiation')) {
        return { actual: weatherColors.radiationActual, forecast: weatherColors.radiationForecast };
    }
    if (fieldKey.includes('surface_pressure')) {
        return { actual: weatherColors.pressureSurfaceActual, forecast: weatherColors.pressureSurfaceForecast };
    }
    if (fieldKey.includes('pressure')) {
        return { actual: weatherColors.pressureMslActual, forecast: weatherColors.pressureMslForecast };
    }
    if (fieldKey.includes('soil_moisture')) {
        return { actual: weatherColors.soilMoistActual, forecast: weatherColors.soilMoistForecast };
    }
    if (fieldKey.includes('soil')) {
        return { actual: weatherColors.soilTempActual, forecast: weatherColors.soilTempForecast };
    }
    return { actual: '#888888', forecast: '#cccccc' }; // fallback
};

export interface WeatherTimeSeriesChartProps {
    actualData: any[];
    forecastData: any[];
    selectedFields: Set<string>;
    weatherHeightByField: Record<string, string>;
    darkMode?: boolean;
    colors?: any;
}

export const WeatherTimeSeriesChart: React.FC<WeatherTimeSeriesChartProps> = ({
    actualData,
    forecastData,
    selectedFields,
    weatherHeightByField,
    darkMode = false,
    colors,
}) => {
    const { t } = useTranslation('forecast');
    const activeFields = useMemo(() => Array.from(selectedFields), [selectedFields]);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipContent, setTooltipContent] = useState<string>('');

    const eChartsOption = useMemo<EChartsOption>(() => {
        if (!colors || activeFields.length === 0) return {};

        // 1. Determine dynamic Y axes based on active fields directly
        const axisOffsetSpacing = 85;

        const yAxis: EChartsOption['yAxis'] = activeFields.map((field, index) => {
            const isLeft = index % 2 === 1; // 0: Right, 1: Left, 2: Right, 3: Left
            const sideIndex = Math.floor(index / 2);
            const offset = sideIndex * axisOffsetSpacing;
            const fieldInfo = WEATHER_FIELD_DISPLAY[field] || { shortLabelKey: '', unit: '' };
            const fieldLabel = fieldInfo.shortLabelKey ? t(fieldInfo.shortLabelKey) : field;
            const fieldColors = getFieldColors(field);

            const baseAxis = createValueAxis(colors, {
                position: isLeft ? 'left' : 'right',
                offset: offset,
                name: `${fieldLabel}${fieldInfo.unit ? ` (${fieldInfo.unit})` : ''}`,
                alignTicks: true,
                nameLocation: 'middle',
                nameRotate: isLeft ? 90 : -90,
                nameGap: 50,
                ...(index > 0 ? { splitLine: { show: false } } as any : {})
            }) as any;

            // Override colors to match the specific field
            baseAxis.axisLine = { ...baseAxis.axisLine, show: true, lineStyle: { ...baseAxis.axisLine?.lineStyle, color: fieldColors.actual } };
            baseAxis.axisLabel = { ...baseAxis.axisLabel, color: fieldColors.actual };
            baseAxis.nameTextStyle = {
                ...baseAxis.nameTextStyle,
                color: fieldColors.actual,
                padding: [0, 0, 0, 0] // Reset padding that was designed for 'start' location
            };

            return baseAxis;
        });

        const numLeft = Math.floor(activeFields.length / 2);
        const numRight = Math.ceil(activeFields.length / 2);
        const gridLeft = Math.max(numLeft * axisOffsetSpacing, 50);
        const gridRight = Math.max(numRight * axisOffsetSpacing, 50);

        // 2. Build Series
        const series: any[] = [];
        let minTime = Infinity;
        let maxTime = -Infinity;

        activeFields.forEach((field, index) => {
            const yAxisIndex = index;
            const fieldInfo = WEATHER_FIELD_DISPLAY[field] || { shortLabelKey: '', unit: '' };
            const fieldLabel = fieldInfo.shortLabelKey ? t(fieldInfo.shortLabelKey) : field;
            const isPrecipitation = field.includes('precipitation') || field.includes('rain') || field.includes('snow');
            const isDaily = field.includes('_max') || field.includes('_min') || field.includes('_mean') || field.includes('_sum') || field === 'sunshine_duration' || field === 'daylight_duration';
            const isWindDirection = field.includes('wind_direction');

            const fieldColors = getFieldColors(field);
            const unitSuffix = fieldInfo.unit ? ` (${fieldInfo.unit})` : '';

            // Resolve the actual field path if it has multiple heights (e.g., wind_speed_10m -> wind_speed_100m based on UI dropdown)
            // The sidebar provides activeFields using the default base strings. However, we check weatherHeightByField to see if the user swapped it.
            const match = field.match(/^(.+?)_(\d+m?)$/);
            const baseGroup = match ? match[1] : null;
            const fieldToFetch = (baseGroup && weatherHeightByField[baseGroup]) ? weatherHeightByField[baseGroup] : field;

            // Helper to process data points
            const processPoints = (dataArray: any[]) => {
                return dataArray
                    .filter(d => d[fieldToFetch] != null) // Fetch utilizing resolving height variable mapping
                    .map(d => {
                        const t = parseToTimestamp(d.datetime);
                        if (t === null) return null;
                        if (t < minTime) minTime = t;
                        if (t > maxTime) maxTime = t;

                        let val = d[fieldToFetch];

                        // If it's wind direction, we can use an SVG arrow pointing up (0 degrees), and let ECharts rotate it by `val` degrees
                        if (isWindDirection) {
                            return {
                                value: [t, val],
                                symbolRotate: val, // ECharts natively rotates the symbol by positive degrees (clockwise)
                            };
                        }

                        return [t, val];
                    })
                    .filter(Boolean) as any[];
            };

            const suffix = isDaily ? t('chartPanel.dailySuffix') : t('chartPanel.hourlySuffix');
            const windArrowSVG = 'path://M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z';

            const actualPoints = processPoints(actualData);
            if (actualPoints.length > 0) {
                // Label dynamic resolving including the applied height directly inside legend
                const heightTitleSuffix = (fieldToFetch !== field && fieldToFetch.includes('100m')) ? ' (100m)' : '';
                series.push({
                    name: `${fieldLabel}${heightTitleSuffix} (${t('weatherCategories.actual')}${suffix})`,
                    type: isPrecipitation ? 'bar' : isWindDirection ? 'scatter' : 'line',
                    step: (isPrecipitation || isWindDirection) ? undefined : 'end',
                    yAxisIndex,
                    data: actualPoints,
                    itemStyle: { color: fieldColors.actual },
                    lineStyle: (isPrecipitation || isWindDirection) ? undefined : { type: 'solid', width: 2 },
                    showSymbol: isDaily || isWindDirection,
                    symbol: isWindDirection ? windArrowSVG : (isDaily ? 'circle' : 'emptyCircle'),
                    symbolSize: isWindDirection ? 14 : (isDaily ? 6 : 4),
                    barMaxWidth: 20,
                    z: isPrecipitation ? 1 : isWindDirection ? 3 : 2 // Ensure lines appear over bars, scatter over lines
                });
            }

            const forecastPoints = processPoints(forecastData);
            if (forecastPoints.length > 0) {
                const heightTitleSuffix = (fieldToFetch !== field && fieldToFetch.includes('100m')) ? ' (100m)' : '';
                series.push({
                    name: `${fieldLabel}${heightTitleSuffix} (${t('weatherCategories.forecast')}${suffix})`,
                    type: isPrecipitation ? 'bar' : isWindDirection ? 'scatter' : 'line',
                    step: (isPrecipitation || isWindDirection) ? undefined : 'end',
                    yAxisIndex,
                    data: forecastPoints,
                    itemStyle: { color: fieldColors.forecast },
                    lineStyle: (isPrecipitation || isWindDirection) ? undefined : { type: 'dashed', width: 2 },
                    showSymbol: isDaily || isWindDirection,
                    symbol: isWindDirection ? windArrowSVG : (isDaily ? 'diamond' : 'emptyCircle'),
                    symbolSize: isWindDirection ? 14 : (isDaily ? 6 : 4),
                    barMaxWidth: 20,
                    z: isPrecipitation ? 1 : isWindDirection ? 3 : 2
                });
            }
        });

        // Create Mark Area for background intervals (JST daily)
        let jstMinStart = minTime;
        if (minTime !== Infinity && maxTime !== -Infinity) {
            const markAreaData = [];
            const JST_OFFSET = 9 * 3600 * 1000; // +09:00
            let jstMin = minTime + JST_OFFSET;
            let currentDayJst = Math.floor(jstMin / 86400000) * 86400000;
            jstMinStart = currentDayJst - JST_OFFSET;
            let dayIndex = 0;

            while (currentDayJst - JST_OFFSET <= maxTime) {
                if (dayIndex % 2 !== 0) {
                    markAreaData.push([
                        { xAxis: Math.max(currentDayJst - JST_OFFSET, minTime) },
                        { xAxis: Math.min(currentDayJst + 86400000 - JST_OFFSET, maxTime) }
                    ]);
                }
                currentDayJst += 86400000;
                dayIndex++;
            }

            if (markAreaData.length > 0) {
                series.push({
                    name: 'DayBackground',
                    type: 'line',
                    data: [],
                    markArea: {
                        silent: true,
                        itemStyle: {
                            color: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
                        },
                        data: markAreaData
                    }
                });
            }
        }

        // ECharts creates splitLine internally if show is not explicitly false. I manually disabled it for y2.
        const xAxis = createTimeAxis(colors, minTime !== Infinity ? jstMinStart : undefined, maxTime !== -Infinity ? maxTime : undefined);
        if (xAxis && !Array.isArray(xAxis)) {
            xAxis.axisLabel = {
                ...xAxis.axisLabel,
                formatter: (value: number | string) => {
                    const num = Number(value);
                    const ms = (num > 0 && num < 1e12) ? num * 1000 : num;
                    const jstStr = formatDateTimeJST(ms); // "YYYY-MM-DD HH:mm"
                    const timeOnly = jstStr.substring(11, 16);
                    if (timeOnly === '00:00') {
                        return `${jstStr.substring(5, 10).replace('-', '/')}\n${timeOnly}`;
                    }
                    return timeOnly;
                }
            };

            // Fix the hover label on the X-axis (axisPointer)
            if (xAxis.axisPointer) {
                xAxis.axisPointer.label = {
                    ...(xAxis.axisPointer.label || {}),
                    formatter: (params: any) => {
                        const num = Number(params.value);
                        const ms = (num > 0 && num < 1e12) ? num * 1000 : num;
                        return formatDateTimeJST(ms);
                    }
                };
            }
        }

        return {
            grid: createGrid({ top: 40, bottom: 80, left: gridLeft, right: gridRight }),
            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: 0,
                    filterMode: 'none',
                    startValue: minTime !== Infinity ? jstMinStart : undefined,
                    endValue: maxTime !== -Infinity ? maxTime : undefined
                },
                {
                    type: 'slider',
                    xAxisIndex: 0,
                    bottom: 25,
                    height: 20,
                    filterMode: 'none',
                    startValue: minTime !== Infinity ? jstMinStart : undefined,
                    endValue: maxTime !== -Infinity ? maxTime : undefined
                }
            ],
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                borderWidth: 0,
                padding: 0,
                position: function () {
                    return [-9999, -9999];
                },
                axisPointer: {
                    type: 'cross',
                    label: { backgroundColor: colors.tooltipHeaderBg }
                },
                formatter: (params: any) => {
                    if (!params || !params.length) return '';

                    const num = Number(params[0].value[0]);
                    const ms = (num > 0 && num < 1e12) ? num * 1000 : num;

                    const isDailyOnly = params.every((p: any) => p.seriesName === 'DayBackground' || (p.seriesName && p.seriesName.includes(t('chartPanel.dailySuffix'))));
                    const timeStr = isDailyOnly ? formatDateTimeJST(ms).split(' ')[0] + t('chartPanel.dailyDateMarker') : formatDateTimeJST(ms);

                    // Build the custom fixed tooltip content (HTML)
                    let html = `<div style="display:flex;align-items:center;gap:12px;font-size:12px;overflow-x:auto;">`;
                    html += `<div style="font-weight:700;color:${colors.text};white-space:nowrap;">${timeStr}</div>`;
                    html += `<div style="display:flex;gap:16px;flex-wrap:nowrap;">`;

                    params.forEach((p: any) => {
                        if (p.seriesName === 'DayBackground') return;
                        const val = p.value[1];
                        if (val == null) return;
                        const marker = p.marker || '';

                        const seriesNameStr = p.seriesName as string;
                        let unit = '';
                        for (const field of activeFields) {
                            const fieldInfo = WEATHER_FIELD_DISPLAY[field];
                            if (fieldInfo) {
                                const translatedLabel = fieldInfo.shortLabelKey ? t(fieldInfo.shortLabelKey) : field;
                                if (seriesNameStr.includes(translatedLabel)) {
                                    unit = fieldInfo.unit || '';
                                    if (field === 'sunshine_duration' && unit === 'h') {
                                        unit = 's'; // Force "s" rendering for sunshine_duration since values are in seconds
                                    }
                                    break;
                                }
                            }
                        }

                        html += `<div style="display:flex;align-items:center;gap:4px;white-space:nowrap;">
                            <span>${marker} <span style="opacity:0.8">${p.seriesName}</span></span>
                            <strong style="color:${colors.text}">${Number(val).toFixed(1)}${unit ? ' ' + unit : ''}</strong>
                        </div>`;
                    });

                    html += `</div></div>`;

                    setTimeout(() => {
                        setTooltipContent(html);
                        setTooltipVisible(true);
                    }, 0);

                    return ''; // invisible
                }
            },
            legend: {
                type: 'scroll',
                bottom: 0,
                textStyle: { color: colors.text }
            },
            xAxis,
            yAxis,
            series
        };
    }, [actualData, forecastData, activeFields, colors, darkMode, t]);

    // Use onEvents to handle mouseout which clears the tooltip
    const onEvents = useMemo(() => ({
        mouseout: () => {
            setTooltipVisible(false);
        },
        globalout: () => {
            setTooltipVisible(false);
        }
    }), []);

    return (
        <Box sx={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {colors && activeFields.length > 0 ? (
                <>
                    {/* Fixed Tooltip Area at the top */}
                    <Box
                        sx={{
                            height: 40,
                            overflow: 'hidden',
                            px: 2,
                            py: 1,
                            bgcolor: colors.tooltipBg,
                            borderBottom: `1px solid ${colors.tooltipBorder}`,
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            opacity: tooltipVisible && tooltipContent ? 1 : 0,
                            visibility: tooltipVisible && tooltipContent ? 'visible' : 'hidden',
                            transition: 'opacity 0.2s ease-in-out'
                        }}
                        dangerouslySetInnerHTML={{ __html: tooltipContent || '' }}
                    />
                    <Box sx={{ flex: 1, position: 'relative' }}>
                        <BaseChart option={eChartsOption} height="100%" onEvents={onEvents} />
                    </Box>
                </>
            ) : (
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary">{t('chartPanel.selectWeatherVars')}</Typography>
                </Box>
            )}
        </Box>
    );
};
