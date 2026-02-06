import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { TimeSlot, TimeSlotDescription } from '@/types';
import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chartColors';
import BaseChart from '@/components/charts/BaseChart';

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
}

export const MaeChart: React.FC<MaeChartProps> = ({
    dailyMAEs,
    selectedModels,
    modelColorMap,
    selectedTimeSlot,
    onTimeSlotChange
}) => {
    const { darkMode } = useTheme();
    const colors = useChartColors();

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
                    const maeVal = rowData[`${modelKey}_mae`];
                    return `
          <tr>
            <td style="padding:4px 8px;color:${modelColor};font-weight:700;white-space:nowrap;">${model.name}:</td>
            <td style="padding:4px 8px;color:${colors.text};text-align:right;">${maeVal !== undefined ? Number(maeVal).toFixed(2) : '-'}</td>
          </tr>
        `;
                })
                .join('');

            const slotSection =
                selectedTimeSlot === TimeSlot.ALL
                    ? ''
                    : `
        <tr><td colspan="2" style="padding:6px 8px 2px 8px;color:${colors.subText};font-weight:800;font-size:12px;">
          ${selectedTimeSlot} Hour MAE:
        </td></tr>
        ${selectedModels
            .map((model) => {
                const modelKey = `${model.id}|${model.name}`;
                const modelColor = modelColorMap[modelKey];
                const slotMae = rowData[`${modelKey}_${selectedTimeSlot}_mae`];
                return `
            <tr>
              <td style="padding:4px 8px;color:${modelColor};white-space:nowrap;">${model.name}:</td>
              <td style="padding:4px 8px;color:${colors.text};text-align:right;">${slotMae !== undefined ? Number(slotMae).toFixed(2) : '-'}</td>
            </tr>
          `;
            })
            .join('')}
      `;

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
            ${slotSection}
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
                type: 'bar',
                barMaxWidth: 18,
                itemStyle: { color: modelColor },
                data: dailyMAEs.map((d) => d[dataKey] ?? 0),
            } as any;
        });

        return {
            grid: { left: 50, right: 30, top: 20, bottom: 35, containLabel: true },
            legend: {
                top: 0,
                textStyle: { color: colors.text },
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
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
            yAxis: {
                type: 'value',
                name: 'Daily MAE (¥/KWh)',
                nameTextStyle: { color: colors.text },
                axisLabel: { color: colors.text, fontSize: 11 },
                splitLine: {
                    lineStyle: { color: colors.grid, type: 'dashed' },
                },
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
    ]);

    return (
        <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h3" sx={{ color: colors.text, fontWeight: 'bold' }}>
                    MAE Indicators
                </Typography>

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
            <BaseChart option={option} height={250} />
        </Box>
    );
};
