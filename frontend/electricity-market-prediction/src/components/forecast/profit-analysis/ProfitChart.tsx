'use client';

import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Box, Typography } from '@mui/material';
import { BaseChart } from '@/components/charts/BaseChart';

interface ProfitChartProps {
    combinedData: any[];
    selectedModels: {
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }[];
    modelColorMap: Record<string, string>;
    colors: any;
    darkMode: boolean;
    embedded?: boolean;
}

/** TradingView 風格：網格、軸、圖例 */
const tradingViewStyle = (colors: any, darkMode: boolean) => ({
    grid: {
        left: 56,
        right: 56,
        top: 16,
        bottom: 48,
        containLabel: true,
        borderColor: 'transparent',
    },
    axis: {
        axisLabel: { color: colors.text, fontSize: 11 },
        axisLine: { lineStyle: { color: colors.grid ?? (darkMode ? '#2b2b43' : '#e0e0e0') } },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: colors.grid ?? (darkMode ? '#2b2b43' : '#e0e0e0'), type: 'dashed' as const } },
    },
    legend: {
        bottom: 0,
        height: 32,
        textStyle: { color: colors.text, fontSize: 11 },
        itemGap: 16,
        itemWidth: 14,
        itemHeight: 10,
    },
});

export const ProfitChart: React.FC<ProfitChartProps> = ({
    combinedData,
    selectedModels,
    modelColorMap,
    colors,
    darkMode,
    embedded = false,
}) => {
    const xLabels = useMemo(() => combinedData.map((d) => d.formattedDate), [combinedData]);
    const style = useMemo(() => tradingViewStyle(colors, darkMode), [colors, darkMode]);

    const option = useMemo<EChartsOption>(() => {
        if (!combinedData || combinedData.length === 0) return {};

        const tooltipFormatter = (params: any) => {
            const list = Array.isArray(params) ? params : [params];
            const axisLabel = list?.[0]?.axisValueLabel ?? '';
            const dataIndex = list?.[0]?.dataIndex ?? 0;
            const d = combinedData[dataIndex] || {};

            const optimalRow = `
<tr>
  <td style="padding:4px 8px;color:${colors.actual};font-weight:700;">Optimal</td>
  <td style="padding:4px 8px;color:${colors.text};text-align:right;">${d.actualProfit != null ? Number(d.actualProfit).toFixed(0) : '-'}</td>
  <td style="padding:4px 8px;color:${colors.text};text-align:right;">${d.cumulativeActual != null ? Number(d.cumulativeActual).toFixed(0) : '-'}</td>
</tr>`;

            const modelRows = selectedModels
                .map((model) => {
                    const modelKey = `${model.id}|${model.name}`;
                    const daily = d[`${modelKey}_profit`];
                    const cumulative = d[`${modelKey}_cumulative`];
                    return `
<tr>
  <td style="padding:4px 8px;color:${modelColorMap[modelKey]};">${model.name}</td>
  <td style="padding:4px 8px;color:${colors.text};text-align:right;">${daily != null ? Number(daily).toFixed(0) : '-'}</td>
  <td style="padding:4px 8px;color:${colors.text};text-align:right;">${cumulative != null ? Number(cumulative).toFixed(0) : '-'}</td>
</tr>`;
                })
                .join('');

            return `
<div style="
  background:${colors.tooltipBg};
  border:1px solid ${colors.tooltipBorder};
  color:${colors.text};
  padding:10px;
  border-radius:6px;
  box-shadow:0 4px 12px rgba(0,0,0,0.4);
  min-width:280px;
  pointer-events:none;
">
  <div style="font-weight:700;margin-bottom:8px;">${axisLabel} Profit</div>
  <table style="border-collapse:collapse;width:100%;font-size:12px;">
    <thead>
      <tr>
        <th style="text-align:left;padding:4px 8px;color:${colors.subText};font-weight:700;">Type</th>
        <th style="text-align:right;padding:4px 8px;color:${colors.subText};font-weight:700;">Daily</th>
        <th style="text-align:right;padding:4px 8px;color:${colors.subText};font-weight:700;">Cumulative</th>
      </tr>
    </thead>
    <tbody>${optimalRow}${modelRows}</tbody>
  </table>
</div>`;
        };

        const series: any[] = [];

        // 每日收益 bar（左軸），並排：barGap + barCategoryGap
        series.push({
            name: 'Optimal (Daily)',
            type: 'bar' as const,
            yAxisIndex: 0,
            barMaxWidth: 24,
            barGap: '30%',
            barCategoryGap: '40%',
            itemStyle: { color: colors.actual },
            data: combinedData.map((d) => d.actualProfit ?? 0),
        });
        selectedModels.forEach((model) => {
            const modelKey = `${model.id}|${model.name}`;
            series.push({
                name: `${model.name} (Daily)`,
                type: 'bar' as const,
                yAxisIndex: 0,
                barMaxWidth: 24,
                barGap: '30%',
                barCategoryGap: '40%',
                itemStyle: { color: modelColorMap[modelKey] },
                data: combinedData.map((d) => d[`${modelKey}_profit`] ?? 0),
            });
        });

        // 累計收益 line（右軸）
        series.push({
            name: 'Optimal (Cumulative)',
            type: 'line' as const,
            yAxisIndex: 1,
            showSymbol: false,
            smooth: true,
            lineStyle: { color: colors.actual, width: 2 },
            data: combinedData.map((d) => d.cumulativeActual ?? 0),
        });
        selectedModels.forEach((model) => {
            const modelKey = `${model.id}|${model.name}`;
            series.push({
                name: `${model.name} (Cumulative)`,
                type: 'line' as const,
                yAxisIndex: 1,
                showSymbol: false,
                smooth: true,
                lineStyle: { color: modelColorMap[modelKey], width: 2 },
                data: combinedData.map((d) => d[`${modelKey}_cumulative`] ?? 0),
            });
        });

        return {
            backgroundColor: 'transparent',
            grid: style.grid,
            legend: style.legend,
            tooltip: {
                trigger: 'axis' as const,
                axisPointer: { type: 'cross' as const },
                backgroundColor: 'transparent',
                borderWidth: 0,
                extraCssText: 'pointer-events:none;',
                formatter: tooltipFormatter as any,
            },
            xAxis: {
                type: 'category' as const,
                data: xLabels,
                ...style.axis,
                splitLine: { show: false },
                splitArea: {
                    show: true,
                    areaStyle: {
                        color: xLabels.map((_, idx) =>
                            idx % 2 === 1
                                ? (darkMode ? 'rgba(68,68,68,0.35)' : 'rgba(224,224,224,0.35)')
                                : 'transparent'
                        ),
                    },
                },
            },
            yAxis: [
                {
                    type: 'value' as const,
                    name: '每日收益 (¥)',
                    position: 'left' as const,
                    ...style.axis,
                    nameTextStyle: { color: colors.text, fontSize: 11 },
                    splitLine: { show: true, lineStyle: { color: colors.grid, type: 'dashed' as const } },
                },
                {
                    type: 'value' as const,
                    name: '累計收益 (¥)',
                    position: 'right' as const,
                    ...style.axis,
                    nameTextStyle: { color: colors.text, fontSize: 11 },
                    splitLine: { show: false },
                },
            ],
            series,
            animation: false,
        };
    }, [combinedData, selectedModels, modelColorMap, colors, darkMode, xLabels, style]);

    return (
        <Box sx={{ mt: embedded ? 0 : 3 }}>
            {!embedded && (
                <Typography variant="h6" component="h3" sx={{ color: colors.text, fontWeight: 'bold', mb: 2 }}>
                    Profit Analysis (Daily & Cumulative)
                </Typography>
            )}
            <BaseChart option={option} height={embedded ? 240 : 400} />
        </Box>
    );
};
