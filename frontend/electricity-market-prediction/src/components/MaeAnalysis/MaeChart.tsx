import React, { useMemo } from 'react';
import {
    ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Bar, Legend, ReferenceArea
} from 'recharts';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableRow, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { TimeSlot, TimeSlotDescription } from '@/types';
import { useTheme } from '@/app/ThemeProvider';

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

    const colors = useMemo(() => ({
        grid: darkMode ? '#333' : '#e6e6e6',
        text: darkMode ? '#d9d9d9' : '#000000',
        subText: darkMode ? '#a6a6a6' : '#595959',
        tooltipBg: darkMode ? 'rgba(33, 33, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        tooltipBorder: darkMode ? '#444' : '#d9d9d9',
    }), [darkMode]);

    // MAE 圖表的自定義工具提示
    const MAETooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;

            return (
                <Paper elevation={3} sx={{
                    backgroundColor: colors.tooltipBg,
                    color: colors.text,
                    borderRadius: '4px',
                    border: `1px solid ${colors.tooltipBorder}`,
                    overflow: 'hidden',
                    p: 1,
                    maxWidth: '300px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                        {`${data.formattedDate} MAE`}
                    </Typography>

                    <Table size="small" sx={{
                        '& .MuiTableCell-root': {
                            borderBottom: 'none',
                            py: 0.5,
                            px: 1.5
                        }
                    }}>
                        <TableBody>
                            {selectedModels.map((model) => {
                                const modelKey = `${model.id}|${model.name}`;
                                const modelColor = modelColorMap[modelKey];
                                const mae = data[`${modelKey}_mae`];

                                return (
                                    <TableRow key={`mae-${modelKey}`}>
                                        <TableCell sx={{ color: modelColor, fontWeight: 'bold' }}>
                                            {`${model.name}:`}
                                        </TableCell>
                                        <TableCell align="right" sx={{ color: colors.text }}>
                                            {mae !== undefined ? mae.toFixed(2) : '-'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {/* 顯示時段 MAE */}
                            {selectedTimeSlot !== TimeSlot.ALL && (
                                <>
                                    <TableRow>
                                        <TableCell colSpan={2} sx={{ pt: 1, pb: 0 }}>
                                            <Typography variant="caption" sx={{ color: colors.subText, fontWeight: 'bold' }}>
                                                {`${selectedTimeSlot} Hour MAE:`}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>

                                    {selectedModels.map((model) => {
                                        const modelKey = `${model.id}|${model.name}`;
                                        const modelColor = modelColorMap[modelKey];
                                        const slotMae = data[`${modelKey}_${selectedTimeSlot}_mae`];

                                        return (
                                            <TableRow key={`slot-mae-${modelKey}`}>
                                                <TableCell sx={{ color: modelColor }}>
                                                    {`${model.name}:`}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: colors.text }}>
                                                    {slotMae !== undefined ? slotMae.toFixed(2) : '-'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </>
                            )}
                        </TableBody>
                    </Table>
                </Paper>
            );
        }
        return null;
    };

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

            <ResponsiveContainer width="100%" height={250}>
                <ComposedChart
                    data={dailyMAEs}
                    margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={colors.grid}
                        vertical={false}
                    />
                    {/* Day shading */}
                    {dailyMAEs.map((entry, index) => {
                        if (index % 2 === 0) return null;
                        return (
                            <ReferenceArea
                                key={`shade-${entry.formattedDate}`}
                                x1={entry.formattedDate}
                                x2={entry.formattedDate}
                                fill={darkMode ? "#444444" : "#e0e0e0"}
                                fillOpacity={0.4}
                            />
                        );
                    })}
                    <XAxis
                        dataKey="formattedDate"
                        stroke={colors.text}
                        tick={{ fill: colors.text, fontSize: 11 }}
                        tickLine={{ stroke: colors.text }}
                        axisLine={{ stroke: colors.text }}
                    />
                    <YAxis
                        label={{
                            value: 'Daily MAE (¥/KWh)',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fill: colors.text, fontSize: 12 }
                        }}
                        stroke={colors.text}
                        tick={{ fill: colors.text, fontSize: 11 }}
                        tickLine={{ stroke: colors.text }}
                        axisLine={{ stroke: colors.text }}
                    />
                    <Tooltip content={<MAETooltip />} />
                    <Legend />

                    {/* 為每個模型顯示 MAE 長條圖 */}
                    {selectedModels.map((model, index) => {
                        const modelKey = `${model.id}|${model.name}`;
                        const modelColor = modelColorMap[modelKey];

                        // 根據時段選擇顯示不同的 MAE
                        const dataKey = selectedTimeSlot === TimeSlot.ALL
                            ? `${modelKey}_mae`
                            : `${modelKey}_${selectedTimeSlot}_mae`;

                        return (
                            <Bar
                                key={`mae-bar-${modelKey}`}
                                dataKey={dataKey}
                                name={`${model.name}`}
                                fill={modelColor}
                                barSize={12}
                            // 分組顯示而不是堆疊
                            // stackId={`stack-${index}`} 
                            />
                        );
                    })}

                </ComposedChart>
            </ResponsiveContainer>
        </Box>
    );
};
