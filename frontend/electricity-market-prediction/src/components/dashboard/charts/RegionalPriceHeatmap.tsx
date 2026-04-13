'use client';

import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chart-colors';
import type { Area } from '@/types';
import { ChartDataPoint } from '@/utils/chartUtils';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useTranslation } from 'react-i18next';
import { getAreaName } from '@/utils/areaI18n';

interface RegionalPriceHeatmapProps {
    areas: Area[];
    allAreasChartData: Record<string, ChartDataPoint[]>;
    highlightedArea?: string | null;
    hoveredTimestamp?: number | null;
    loading?: boolean;
}

export function RegionalPriceHeatmap({ areas, allAreasChartData, highlightedArea, hoveredTimestamp, loading }: RegionalPriceHeatmapProps) {
    const { darkMode } = useTheme();
    const colors = useChartColors();
    const { t } = useTranslation(['common', 'dashboard']);
    const [internalHoveredXIdx, setInternalHoveredXIdx] = useState<number | null>(null);

    const onEvents = useMemo(() => ({
        mouseover: (params: any) => {
            if (params.componentType === 'series' && params.seriesType === 'heatmap') {
                setInternalHoveredXIdx(params.value[0]);
            }
        },
        mouseout: () => {
            setInternalHoveredXIdx(null);
        }
    }), []);

    const { options, hasData } = useMemo(() => {
        if (!areas || areas.length === 0) return { options: {}, hasData: false };

        const yCategories = areas.map(a => getAreaName(t, a.name));

        // Find all unique timestamps across all areas
        const timestampsSet = new Set<number>();
        areas.forEach(area => {
            const data = allAreasChartData[area.name] || [];
            data.forEach(p => {
                if (p.actualPrice != null && !isNaN(p.actualPrice)) {
                    timestampsSet.add(p.timestamp);
                }
            });
        });

        const sortedTimestamps = Array.from(timestampsSet).sort((a, b) => a - b);
        if (sortedTimestamps.length === 0) return { options: {}, hasData: false };

        // Format timestamps to HH:mm (or MM/dd HH:mm if multiple days)
        // Since we know it's Japan time
        const TIMEZONE = 'Asia/Tokyo';
        const xCategories = sortedTimestamps.map(ts => {
            const jstDate = toZonedTime(new Date(ts), TIMEZONE);
            return format(jstDate, 'MM/dd HH:mm');
        });

        // Map timestamp to X index
        const timeToIndex = new Map<number, number>();
        sortedTimestamps.forEach((ts, idx) => timeToIndex.set(ts, idx));

        let maxPrice = -Infinity;
        let minPrice = Infinity;

        const heatmapData: { value: [number, number, number], itemStyle?: any }[] = [];

        // Find the index of the highlighted area
        const highlightedYIdx = highlightedArea ? areas.findIndex(a => a.name === highlightedArea) : -1;

        // Find the index of the hovered timestamp exactly (from AllAreasPriceChart)
        const externalHoveredXIdx = hoveredTimestamp != null ? (timeToIndex.get(hoveredTimestamp) ?? -1) : -1;

        // Combine internal (heatmap hover) and external (top chart hover) priority
        const finalHoveredXIdx = internalHoveredXIdx !== null ? internalHoveredXIdx : externalHoveredXIdx;

        areas.forEach((area, yIdx) => {
            const data = allAreasChartData[area.name] || [];

            data.forEach(p => {
                if (p.actualPrice != null && !isNaN(p.actualPrice)) {
                    const xIdx = timeToIndex.get(p.timestamp);
                    if (xIdx !== undefined) {
                        const item: { value: [number, number, number], itemStyle?: any } = {
                            value: [xIdx, yIdx, p.actualPrice]
                        };

                        // Apply dim visual if needed
                        // If there is a highlighted area OR a hovered time, we dim cells that are NOT part of the focus
                        let isDimmed = false;

                        if (highlightedArea != null && finalHoveredXIdx !== -1) {
                            // Single intersection focus: dim if it's not the selected row OR not the selected column
                            isDimmed = highlightedYIdx !== yIdx || finalHoveredXIdx !== xIdx;
                        } else if (highlightedArea != null) {
                            // Only area selected
                            isDimmed = highlightedYIdx !== yIdx;
                        } else if (finalHoveredXIdx !== -1) {
                            // Only time selected
                            isDimmed = finalHoveredXIdx !== xIdx;
                        }

                        if (isDimmed) {
                            item.itemStyle = {
                                opacity: 0.15
                            };
                        }

                        heatmapData.push(item);
                        if (p.actualPrice > maxPrice) maxPrice = p.actualPrice;
                        if (p.actualPrice < minPrice) minPrice = p.actualPrice;
                    }
                }
            });
        });

        if (minPrice === Infinity) minPrice = 0;
        if (maxPrice === -Infinity || maxPrice < minPrice) maxPrice = minPrice + 10;

        // To avoid maxPrice == minPrice which causes visualMap issues
        if (minPrice === maxPrice) {
            maxPrice += 1;
        }

        // Custom visual map color from cold to warm
        // Low: dark blue -> blue -> light blue -> yellow -> orange -> red -> dark red :High
        const visualMapColor = [
            '#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8',
            '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'
        ];

        const option = {
            tooltip: {
                position: 'top',
                formatter: function (params: any) {
                    const time = xCategories[params.value[0]];
                    const area = yCategories[params.value[1]];
                    const price = params.value[2];
                    return `
                        <div style="font-weight:bold; margin-bottom:5px;">${time}</div>
                        <div>${area}: <span style="font-weight:bold;color:${params.color}">${price.toFixed(2)}</span> ${t('dashboard:heatmap.unit')}</div>
                    `;
                },
                backgroundColor: colors.tooltipBg,
                borderColor: colors.tooltipBorder,
                textStyle: { color: colors.text }
            },
            grid: {
                top: 30,
                bottom: 80,
                left: 90,
                right: 40,
                containLabel: false,
            },
            xAxis: {
                type: 'category',
                data: xCategories,
                splitArea: {
                    show: true,
                    areaStyle: {
                        color: darkMode ? ['rgba(250,250,250,0.02)', 'rgba(200,200,200,0.02)'] : ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.3)']
                    }
                },
                axisLabel: {
                    color: (value: string, index: number) => {
                        // Highlight the X-axis label text if selected
                        if (finalHoveredXIdx !== -1 && index === finalHoveredXIdx) {
                            return colors.nowLine; // Use colors.nowLine instead of CSS var for Canvas
                        }
                        return colors.text;
                    },
                    fontSize: 10,
                    // If too many ticks, show every nth label automatically
                    hideOverlap: true,
                    formatter: (value: string) => {
                        // Extract HH:mm from 'MM/dd HH:mm' to save space when showing
                        return value.split(' ')[1];
                    }
                },
                axisLine: { lineStyle: { color: colors.grid } },
                axisTick: { show: false },
            },
            yAxis: {
                type: 'category',
                inverse: true,
                data: yCategories,
                splitArea: { show: false },
                axisLabel: {
                    color: (value: string, index: number) => {
                        // Highlight the Y-axis label text if selected
                        if (highlightedArea) {
                            const selectedAreaLabel = getAreaName(t, highlightedArea);
                            // Canvas rendering doesn't support CSS variables, so we must use exact hex codes or theme vars
                            return value === selectedAreaLabel ? colors.nowLine : 'rgba(150, 150, 150, 0.5)';
                        }
                        return colors.text;
                    },
                    fontSize: 12,
                    fontWeight: 'bold',
                },
                axisLine: { show: false },
                axisTick: { show: false },
            },
            visualMap: {
                min: minPrice,
                max: maxPrice,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: 0,
                text: [t('dashboard:heatmap.high'), t('dashboard:heatmap.low')],
                textStyle: { color: colors.text },
                inRange: {
                    color: visualMapColor // [minColor, ..., maxColor]
                },
                itemWidth: 15,
                itemHeight: 300,
            },
            series: [{
                name: t('dashboard:heatmap.seriesName'),
                type: 'heatmap',
                data: heatmapData,
                label: {
                    show: false
                },
                emphasis: {
                    itemStyle: {
                        borderColor: darkMode ? '#fff' : '#000',
                        borderWidth: 2,
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                progressive: 0,
                animation: false,
                itemStyle: {
                    borderColor: darkMode ? '#121212' : '#ffffff',
                    borderWidth: 1,
                    borderType: 'solid',
                }
            }]
        };

        return { options: option, hasData: heatmapData.length > 0 };
    }, [areas, allAreasChartData, highlightedArea, hoveredTimestamp, internalHoveredXIdx, darkMode, colors, t]);

    if (loading) {
        return (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', color: 'var(--muted)', minHeight: 300, alignItems: 'center' }}>
                <Typography>{t('common:loading')}</Typography>
            </Box>
        );
    }

    if (!hasData) {
        return null;
    }

    return (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ flex: 1, minHeight: 350, px: 1 }}>
                <ReactECharts
                    option={options}
                    style={{ height: '100%', width: '100%' }}
                    onEvents={onEvents}
                    notMerge={false}
                />
            </Box>
        </Box>
    );
}
