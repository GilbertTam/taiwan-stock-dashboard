import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Typography } from '@mui/material';
import { EChartsOption } from 'echarts';
import { startOfDay } from 'date-fns';

interface ZScoreChartEChartsProps {
    showZScore: boolean;
    processedChartData: any[];
    colors: any;
    selectedModels: any[];
    modelColorMap: Record<string, string>;
    darkMode?: boolean;
}

export const ZScoreChartECharts: React.FC<ZScoreChartEChartsProps> = ({
    showZScore,
    processedChartData,
    colors,
    selectedModels,
    modelColorMap,
    darkMode
}) => {
    if (!showZScore) return null;

    const option = useMemo<EChartsOption>(() => {
        if (!processedChartData || processedChartData.length === 0) return {};

        const timestamps = processedChartData.map(d => d.timestamp);
        const dataMinTime = timestamps[0];
        const dataMaxTime = timestamps[timestamps.length - 1];

        // MarkArea logic for alternating daily shading
        const markAreaData: any[] = [];
        const currentStart = timestamps[0];
        const endTimestamp = timestamps[timestamps.length - 1];
        let iterTime = startOfDay(new Date(currentStart)).getTime();
        const dayMillis = 24 * 60 * 60 * 1000;
        let dayIndex = 0;
        while (iterTime < endTimestamp) {
            if (dayIndex % 2 !== 0) {
                markAreaData.push([{ xAxis: Math.max(iterTime, currentStart) }, { xAxis: Math.min(iterTime + dayMillis, endTimestamp) }]);
            }
            iterTime += dayMillis; dayIndex++;
        }

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: colors.tooltipBg,
                borderColor: colors.tooltipBorder,
                textStyle: { color: colors.text },
                valueFormatter: (value: any) => value === null ? '-' : Number(value).toFixed(2)
            },
            grid: {
                left: 50,
                right: 30,
                top: 20,
                bottom: 20,
                containLabel: true
            },
            xAxis: {
                type: 'time' as const,
                axisLabel: { show: false }, // Hide labels to save space or sync with main chart? Let's hide as per original.
                axisPointer: {
                    label: { show: false }
                },
                axisLine: { lineStyle: { color: colors.text } },
                splitLine: { show: false },
                min: dataMinTime,
                max: dataMaxTime
            },
            yAxis: {
                type: 'value' as const,
                name: 'Z-Score',
                nameLocation: 'middle',
                nameGap: 30,
                nameRotate: 90,
                nameTextStyle: { color: colors.text },
                axisLabel: { color: colors.text },
                splitLine: {
                    lineStyle: {
                        color: colors.grid,
                        type: 'dashed' as const
                    }
                }
            },
            series: [
                // Ghost series for MarkArea (background shading)
                {
                    name: 'Ghost', type: 'line',
                    data: [[dataMinTime, 0], [dataMaxTime, 0]],
                    itemStyle: { opacity: 0 }, lineStyle: { opacity: 0 }, showSymbol: false, silent: true, z: 0, animation: false,
                    markArea: { silent: true, itemStyle: { color: darkMode ? "#444444" : "#e0e0e0", opacity: 0.4 }, data: markAreaData }
                },
                // Reference Lines (+/- 2 sigma)
                {
                    type: 'line',
                    name: '+2σ',
                    markLine: {
                        silent: true,
                        symbol: 'none',
                        label: { formatter: '+2σ', position: 'end', color: colors.warning },
                        lineStyle: { color: colors.warning, type: 'dashed' },
                        data: [{ yAxis: 2 }]
                    }
                },
                {
                    type: 'line',
                    name: '-2σ',
                    markLine: {
                        silent: true,
                        symbol: 'none',
                        label: { formatter: '-2σ', position: 'end', color: colors.warning },
                        lineStyle: { color: colors.warning, type: 'dashed' },
                        data: [{ yAxis: -2 }]
                    }
                },
                // Zero line
                {
                    type: 'line',
                    markLine: {
                        silent: true,
                        symbol: 'none',
                        lineStyle: { color: colors.text, opacity: 0.5 },
                        data: [{ yAxis: 0 }]
                    }
                },
                // Actual Z-Score
                {
                    name: 'Observation',
                    type: 'line' as const,
                    data: processedChartData.map(d => [d.timestamp, d.zScore]),
                    showSymbol: false,
                    lineStyle: { width: 2, color: colors.actual },
                    itemStyle: { color: colors.actual }
                },
                // Model Z-Scores
                ...selectedModels.map(model => {
                    const modelKey = `${model.id}|${model.name}`;
                    return {
                        name: model.name,
                        type: 'line' as const,
                        data: processedChartData.map(d => [d.timestamp, d.modelZScores?.[modelKey]]),
                        showSymbol: false,
                        lineStyle: { width: 1, color: modelColorMap[modelKey] },
                        itemStyle: { color: modelColorMap[modelKey] }
                    };
                })
            ],
            animation: false
        };
    }, [processedChartData, showZScore, colors, selectedModels, modelColorMap]);

    return (
        <Box sx={{ mt: 1, height: 200 }}>
            <Typography variant="subtitle2" sx={{ ml: 2, mb: 0.5, color: colors.text }}>
                Z-Score Analysis (Actual Price vs Models)
            </Typography>
            <ReactECharts
                option={option}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
            />
        </Box>
    );
};
