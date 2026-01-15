import React, { useMemo } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import { TimeSlot } from '@/types';

interface MaeSummaryTableProps {
    selectedModels: {
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }[];
    modelTimeSlotMAEs: Record<string, Record<TimeSlot, number>>;
    modelColorMap: Record<string, string>;
}

export const MaeSummaryTable: React.FC<MaeSummaryTableProps> = ({
    selectedModels,
    modelTimeSlotMAEs,
    modelColorMap
}) => {
    const { darkMode } = useTheme();

    const colors = useMemo(() => ({
        grid: darkMode ? '#333' : '#e6e6e6',
        text: darkMode ? '#d9d9d9' : '#000000',
        subText: darkMode ? '#a6a6a6' : '#595959',
    }), [darkMode]);

    return (
        <Box sx={{ mt: 3 }}>
            <Paper sx={{
                p: 2,
                backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.9)',
                border: `1px solid ${colors.grid}`
            }}>
                <Typography variant="subtitle1" sx={{ color: colors.text, fontWeight: 'bold', mb: 2 }}>
                    MAE Summary by Time Slot (Lower is Better)
                </Typography>

                <Table size="small" sx={{
                    '& .MuiTableCell-root': {
                        borderBottom: `1px solid ${colors.grid}`,
                        py: 1,
                        px: 2
                    }
                }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ color: colors.text, fontWeight: 'bold' }}>Model</TableCell>
                            <TableCell align="center" sx={{ color: colors.text, fontWeight: 'bold' }}>Overall MAE</TableCell>
                            <TableCell align="center" sx={{ color: colors.text, fontWeight: 'bold' }}>8-10 Hour MAE</TableCell>
                            <TableCell align="center" sx={{ color: colors.text, fontWeight: 'bold' }}>17-19 Hour MAE</TableCell>
                            <TableCell align="center" sx={{ color: colors.text, fontWeight: 'bold' }}>22-24 Hour MAE</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(() => {
                            // 計算每個時段的最大值和最小值
                            const columnMAEs = {
                                all: selectedModels.map(model => ({
                                    model: model,
                                    mae: modelTimeSlotMAEs[`${model.id}|${model.name}`][TimeSlot.ALL]
                                })),
                                morning: selectedModels.map(model => ({
                                    model: model,
                                    mae: modelTimeSlotMAEs[`${model.id}|${model.name}`][TimeSlot.MORNING]
                                })),
                                evening: selectedModels.map(model => ({
                                    model: model,
                                    mae: modelTimeSlotMAEs[`${model.id}|${model.name}`][TimeSlot.EVENING]
                                })),
                                night: selectedModels.map(model => ({
                                    model: model,
                                    mae: modelTimeSlotMAEs[`${model.id}|${model.name}`][TimeSlot.NIGHT]
                                }))
                            };

                            // 找出每個時段的最大值和最小值
                            const getMinMax = (maes: typeof columnMAEs.all) => ({
                                min: Math.min(...maes.map(m => m.mae)),
                                max: Math.max(...maes.map(m => m.mae))
                            });

                            const minMaxValues = {
                                all: getMinMax(columnMAEs.all),
                                morning: getMinMax(columnMAEs.morning),
                                evening: getMinMax(columnMAEs.evening),
                                night: getMinMax(columnMAEs.night)
                            };

                            // 生成單元格樣式
                            const getCellStyle = (value: number, columnMinMax: { min: number, max: number }) => ({
                                color: colors.text,
                                backgroundColor: value === columnMinMax.max
                                    ? (darkMode ? 'rgba(255, 77, 79, 0.2)' : 'rgba(255, 77, 79, 0.1)')
                                    : value === columnMinMax.min
                                        ? (darkMode ? 'rgba(82, 196, 26, 0.2)' : 'rgba(82, 196, 26, 0.1)')
                                        : 'transparent',
                                position: 'relative' as const,
                                '&::after': value === columnMinMax.max || value === columnMinMax.min ? {
                                    content: '""',
                                    position: 'absolute',
                                    top: '50%',
                                    right: '8px',
                                    transform: 'translateY(-50%)',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: value === columnMinMax.max
                                        ? (darkMode ? '#ff4d4f' : '#cf1322')
                                        : (darkMode ? '#52c41a' : '#389e0d')
                                } : {}
                            });

                            return selectedModels.map((model) => {
                                const modelKey = `${model.id}|${model.name}`;
                                const modelColor = modelColorMap[modelKey];
                                const timeSlotMAE = modelTimeSlotMAEs[modelKey];

                                return (
                                    <TableRow key={`summary-${modelKey}`}>
                                        <TableCell sx={{ color: modelColor, fontWeight: 'bold' }}>
                                            {`${model.name}`}
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={getCellStyle(timeSlotMAE[TimeSlot.ALL], minMaxValues.all)}
                                        >
                                            {timeSlotMAE[TimeSlot.ALL].toFixed(2)}
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={getCellStyle(timeSlotMAE[TimeSlot.MORNING], minMaxValues.morning)}
                                        >
                                            {timeSlotMAE[TimeSlot.MORNING].toFixed(2)}
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={getCellStyle(timeSlotMAE[TimeSlot.EVENING], minMaxValues.evening)}
                                        >
                                            {timeSlotMAE[TimeSlot.EVENING].toFixed(2)}
                                        </TableCell>
                                        <TableCell
                                            align="center"
                                            sx={getCellStyle(timeSlotMAE[TimeSlot.NIGHT], minMaxValues.night)}
                                        >
                                            {timeSlotMAE[TimeSlot.NIGHT].toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                );
                            });
                        })()}
                    </TableBody>
                </Table>

                {/* 添加圖例 */}
                <Box sx={{ mt: 2, display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: darkMode ? '#52c41a' : '#389e0d'
                        }} />
                        <Typography variant="caption" sx={{ color: colors.subText }}>
                            Lowest MAE (Best)
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: darkMode ? '#ff4d4f' : '#cf1322'
                        }} />
                        <Typography variant="caption" sx={{ color: colors.subText }}>
                            Highest MAE (Worst)
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};
