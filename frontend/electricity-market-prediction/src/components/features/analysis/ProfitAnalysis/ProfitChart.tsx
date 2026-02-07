import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Box, Typography } from '@mui/material';

import BaseChart from '@/components/charts/BaseChart';

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
}

export const ProfitChart: React.FC<ProfitChartProps> = ({
    combinedData,
    selectedModels,
    modelColorMap,
    colors,
    darkMode
}) => {
    const xLabels = useMemo(() => combinedData.map((d) => d.formattedDate), [combinedData]);

    const option = useMemo<EChartsOption>(() => {
        if (!combinedData || combinedData.length === 0) return {};

        const tooltipFormatter = (params: any) => {
            const list = Array.isArray(params) ? params : [params];
            const axisLabel = list?.[0]?.axisValueLabel ?? '';
            const dataIndex = list?.[0]?.dataIndex ?? 0;
            const d = combinedData[dataIndex] || {};

            const headerRow = `
        <div style="font-weight:800;margin-bottom:8px;">${axisLabel} Profit Analysis</div>
      `;

            const tableHeader = `
        <tr>
          <th style="text-align:left;padding:4px 8px;color:${colors.subText};font-weight:800;">Type</th>
          <th style="text-align:right;padding:4px 8px;color:${colors.subText};font-weight:800;">Daily</th>
          <th style="text-align:right;padding:4px 8px;color:${colors.subText};font-weight:800;">Cumulative</th>
        </tr>
      `;

            const optimalRow = `
        <tr>
          <td style="padding:4px 8px;color:${colors.actual};font-weight:800;">Optimal</td>
          <td style="padding:4px 8px;color:${colors.text};text-align:right;">${d.actualProfit != null ? Number(d.actualProfit).toFixed(0) : '-'}</td>
          <td style="padding:4px 8px;color:${colors.text};text-align:right;">${d.cumulativeActual != null ? Number(d.cumulativeActual).toFixed(0) : '-'}</td>
        </tr>
      `;

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
          </tr>
        `;
                })
                .join('');

            return `
        <div style="
          background:${colors.tooltipBg};
          border:1px solid ${colors.tooltipBorder};
          color:${colors.text};
          padding:10px;
          border-radius:6px;
          box-shadow:0 4px 12px rgba(0,0,0,0.5);
          min-width:320px;
          pointer-events:none;
        ">
          ${headerRow}
          <table style="border-collapse:collapse;width:100%;font-size:12px;">
            <thead>${tableHeader}</thead>
            <tbody>
              ${optimalRow}
              ${modelRows}
            </tbody>
          </table>
        </div>
      `;
        };

        const series: any[] = [];

        // Daily bars (left axis)
        series.push({
            name: 'Optimal (Daily)',
            type: 'bar',
            yAxisIndex: 0,
            barMaxWidth: 18,
            itemStyle: { color: colors.actual, opacity: 0.6 },
            data: combinedData.map((d) => d.actualProfit ?? 0),
        });

        selectedModels.forEach((model) => {
            const modelKey = `${model.id}|${model.name}`;
            series.push({
                name: `${model.name} (Daily)`,
                type: 'bar',
                yAxisIndex: 0,
                barMaxWidth: 18,
                itemStyle: { color: modelColorMap[modelKey], opacity: 0.6 },
                data: combinedData.map((d) => d[`${modelKey}_profit`] ?? 0),
            });
        });

        // Cumulative lines (right axis)
        series.push({
            name: 'Optimal (Cumulative)',
            type: 'line',
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
                type: 'line',
                yAxisIndex: 1,
                showSymbol: false,
                smooth: true,
                lineStyle: { color: modelColorMap[modelKey], width: 2 },
                data: combinedData.map((d) => d[`${modelKey}_cumulative`] ?? 0),
            });
        });

        return {
            grid: { left: 60, right: 60, top: 20, bottom: 55, containLabel: true },
            legend: {
                bottom: 0,
                height: 36,
                textStyle: { color: colors.text, fontSize: 12 },
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' },
                backgroundColor: 'transparent',
                borderWidth: 0,
                extraCssText: 'pointer-events:none;',
                formatter: tooltipFormatter as any,
            },
            xAxis: {
                type: 'category',
                data: xLabels,
                axisLabel: { color: colors.text, fontSize: 11 },
                axisLine: { lineStyle: { color: colors.text } },
                axisTick: { show: false },
                splitLine: { show: false },
                splitArea: {
                    show: true,
                    areaStyle: {
                        color: xLabels.map((_, idx) =>
                            idx % 2 === 1
                                ? (darkMode ? 'rgba(68,68,68,0.4)' : 'rgba(224,224,224,0.4)')
                                : 'transparent'
                        ),
                    },
                },
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'Daily Profit (¥)',
                    position: 'left',
                    axisLabel: { color: colors.text, fontSize: 11 },
                    nameTextStyle: { color: colors.text },
                    splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } },
                },
                {
                    type: 'value',
                    name: 'Cumulative Profit (¥)',
                    position: 'right',
                    axisLabel: { color: colors.text, fontSize: 11 },
                    nameTextStyle: { color: colors.text },
                    splitLine: { show: false },
                },
            ],
            series,
            animation: false,
        };
    }, [combinedData, selectedModels, modelColorMap, colors, darkMode, xLabels]);

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" component="h3" sx={{ color: colors.text, fontWeight: 'bold', mb: 2 }}>
                Profit Analysis (Daily & Cumulative)
            </Typography>
            <BaseChart option={option} height={400} />
        </Box>
    );
};
