'use client';

import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { TimeSlot, TimeSlotDescription } from '@/types';
import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chart-colors';
import { BaseChart } from '@/shared/components/charts/BaseChart';

/** TradingView 風格：網格、軸、圖例 */
const tradingViewStyle = (colors: any, darkMode: boolean) => ({
    grid: {
        left: 52,
        right: 28,
        top: 16,
        bottom: 40,
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
        bottom: 4,
        height: 28,
        textStyle: { color: colors.text, fontSize: 11 },
        itemGap: 14,
        itemWidth: 14,
        itemHeight: 10,
    },
});

interface MaeChartProps {
    dailyMAEs: any[];
    selectedModels: {
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }[];
    modelColorMap: Record<string, string>;
    selectedTimeSlot: TimeSlot;
    onTimeSlotChange: (slot: TimeSlot) => void;
    embedded?: boolean;
}

export const MaeChart: React.FC<MaeChartProps> = ({
    dailyMAEs,
    selectedModels,
    modelColorMap,
    selectedTimeSlot,
    onTimeSlotChange,
    embedded = false,
}) => {
    const { darkMode } = useTheme();
    const colors = useChartColors();
    const style = useMemo(() => tradingViewStyle(colors, darkMode), [colors, darkMode]);

    const xLabels = useMemo(
        () => dailyMAEs.map((d) => d.formattedDate),
        [dailyMAEs]
    );

    const option = useMemo<EChartsOption>(() => {
        if (!dailyMAEs || dailyMAEs.length === 0) return {};

        const tooltipFormatter = (params: any) => {
            const list = Array.isArray(params) ? params : [params];
            const axisLabel = list?.[0]?.axisValueLabel ?? '';
            const dataIndex = list?.[0]?.dataIndex ?? 0;
            const rowData = dailyMAEs[dataIndex] || {};

            const baseRows = selectedModels
                .map((model) => {
                    const modelKey = `${model.id}|${model.name}`;
                    const modelColor = modelColorMap[modelKey];
                    const displayKey = selectedTimeSlot === TimeSlot.ALL ? `${modelKey}_mae` : `${modelKey}_${selectedTimeSlot}_mae`;
                    const maeVal = rowData[displayKey];
                    return `
<tr>
  <td style="padding:4px 8px;color:${modelColor};font-weight:700;white-space:nowrap;">${model.name}</td>
  <td style="padding:4px 8px;color:${colors.text};text-align:right;">${maeVal !== undefined && maeVal !== null ? Number(maeVal).toFixed(2) : '-'}</td>
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
        box-shadow:0 4px 12px rgba(0,0,0,0.5);
        min-width:240px;
        pointer-events:none;
      ">
        <div style="font-weight:800;margin-bottom:8px;">${axisLabel} MAE</div>
        <table style="border-collapse:collapse;width:100%;font-size:12px;">
          <tbody>
            ${baseRows}
          </tbody>
        </table>
      </div>
    `;
        };

        const series = selectedModels.map((model) => {
            const modelKey = `${model.id}|${model.name}`;
            const modelColor = modelColorMap[modelKey];

            const dataKey =
                selectedTimeSlot === TimeSlot.ALL
                    ? `${modelKey}_mae`
                    : `${modelKey}_${selectedTimeSlot}_mae`;

            return {
                name: model.name,
                type: 'bar' as const,
                barMaxWidth: 24,
                barGap: '30%',
                barCategoryGap: '40%',
                itemStyle: { color: modelColor },
                data: dailyMAEs.map((d) => d[dataKey] ?? 0),
            } as any;
        });

        return {
            backgroundColor: 'transparent',
            grid: style.grid,
            legend: style.legend,
            tooltip: {
                trigger: 'axis' as const,
                axisPointer: { type: 'shadow' as const },
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
            yAxis: {
                type: 'value' as const,
                name: 'MAE (¥/kWh)',
                nameTextStyle: { color: colors.text, fontSize: 11 },
                ...style.axis,
            },
            series,
            animation: false,
        };
    }, [
        dailyMAEs,
        selectedModels,
        modelColorMap,
        selectedTimeSlot,
        colors,
        darkMode,
        xLabels,
        style,
    ]);

    return (
        <Box sx={{ mt: embedded ? 0 : 3 }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: embedded ? 'flex-end' : 'space-between',
                    alignItems: 'center',
                    mb: embedded ? 1 : 1.5,
                }}
            >
                {!embedded && (
                    <Typography variant="h6" component="h3" sx={{ color: colors.text, fontWeight: 'bold' }}>
                        MAE Indicators
                    </Typography>
                )}

                <ToggleButtonGroup
                    value={selectedTimeSlot}
                    exclusive
                    onChange={(_, newValue) => {
                        if (newValue !== null) {
                            onTimeSlotChange(newValue);
                        }
                    }}
                    size="small"
                    sx={{
                        '& .MuiToggleButton-root': {
                            color: colors.text,
                            borderColor: colors.tooltipBorder,
                            '&.Mui-selected': {
                                backgroundColor: 'rgba(24, 144, 255, 0.2)',
                                color: darkMode ? '#36cfc9' : '#13a8a8',
                                fontWeight: 'bold'
                            }
                        }
                    }}
                >
                    <ToggleButton value={TimeSlot.ALL}>
                        {TimeSlotDescription.ALL}
                    </ToggleButton>
                    <ToggleButton value={TimeSlot.MORNING}>
                        {TimeSlotDescription.MORNING}
                    </ToggleButton>
                    <ToggleButton value={TimeSlot.EVENING}>
                        {TimeSlotDescription.EVENING}
                    </ToggleButton>
                    <ToggleButton value={TimeSlot.NIGHT}>
                        {TimeSlotDescription.NIGHT}
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
            <BaseChart option={option} height={embedded ? 220 : 250} />
        </Box>
    );
};
