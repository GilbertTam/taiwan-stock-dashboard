import React from 'react';
import {
    ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Bar, Line, Legend, ReferenceArea
} from 'recharts';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

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

    // Combined Tooltip
    const CombinedTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <Paper elevation={3} sx={{
                    backgroundColor: colors.tooltipBg,
                    color: colors.text,
                    p: 1, border: `1px solid ${colors.tooltipBorder}`,
                    maxWidth: 400
                }}>
                    <Typography variant="subtitle2" fontWeight="bold">{data.formattedDate} Profit Analysis</Typography>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ color: colors.subText, py: 0.5 }}>Type</TableCell>
                                <TableCell align="right" sx={{ color: colors.subText, py: 0.5 }}>Daily</TableCell>
                                <TableCell align="right" sx={{ color: colors.subText, py: 0.5 }}>Cumulative</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell sx={{ color: colors.actual, fontWeight: 'bold', py: 0.5 }}>Optimal</TableCell>
                                <TableCell align="right" sx={{ color: colors.text, py: 0.5 }}>{data.actualProfit?.toFixed(0)}</TableCell>
                                <TableCell align="right" sx={{ color: colors.text, py: 0.5 }}>{data.cumulativeActual?.toFixed(0)}</TableCell>
                            </TableRow>
                            {selectedModels.map(model => {
                                const modelKey = `${model.id}|${model.name}`;
                                const daily = data[`${modelKey}_profit`];
                                const cumulative = data[`${modelKey}_cumulative`];
                                return (
                                    <TableRow key={modelKey}>
                                        <TableCell sx={{ color: modelColorMap[modelKey], py: 0.5 }}>{model.name}</TableCell>
                                        <TableCell align="right" sx={{ color: colors.text, py: 0.5 }}>{daily?.toFixed(0) ?? '-'}</TableCell>
                                        <TableCell align="right" sx={{ color: colors.text, py: 0.5 }}>{cumulative?.toFixed(0) ?? '-'}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Paper>
            );
        }
        return null;
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" component="h3" sx={{ color: colors.text, fontWeight: 'bold', mb: 2 }}>
                Profit Analysis (Daily & Cumulative)
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={combinedData}>
                    {/* Day shading */}
                    {combinedData.map((entry: any, index: number) => {
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

                    <XAxis dataKey="formattedDate" stroke={colors.text} tick={{ fill: colors.text }} />

                    {/* Left Axis: Daily Profit */}
                    <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke={colors.text}
                        tick={{ fill: colors.text }}
                        label={{ value: 'Daily Profit (¥)', angle: -90, position: 'insideLeft', style: { fill: colors.text } }}
                    />

                    {/* Right Axis: Cumulative Profit */}
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke={colors.text}
                        tick={{ fill: colors.text }}
                        label={{ value: 'Cumulative Profit (¥)', angle: 90, position: 'insideRight', style: { fill: colors.text } }}
                    />

                    <Tooltip content={<CombinedTooltip />} />
                    <Legend />

                    {/* Actual Data */}
                    <Bar yAxisId="left" dataKey="actualProfit" name="Optimal (Daily)" fill={colors.actual} fillOpacity={0.3} barSize={20} />
                    <Line yAxisId="right" type="monotone" dataKey="cumulativeActual" name="Optimal (Cumulative)" stroke={colors.actual} dot={false} strokeWidth={2} />

                    {/* Models Data */}
                    {/* Render Bars first */}
                    {selectedModels.map(model => {
                        const modelKey = `${model.id}|${model.name}`;
                        return (
                            <Bar
                                key={`bar-${modelKey}`}
                                yAxisId="left"
                                dataKey={`${modelKey}_profit`}
                                name={`${model.name} (Daily)`}
                                fill={modelColorMap[modelKey]}
                                fillOpacity={0.3}
                                barSize={20}
                            />
                        );
                    })}
                    {/* Render Lines second */}
                    {selectedModels.map(model => {
                        const modelKey = `${model.id}|${model.name}`;
                        return (
                            <Line
                                key={`line-${modelKey}`}
                                yAxisId="right"
                                type="monotone"
                                dataKey={`${modelKey}_cumulative`}
                                name={`${model.name} (Cumulative)`}
                                stroke={modelColorMap[modelKey]}
                                dot={false}
                                strokeWidth={2}
                            />
                        );
                    })}
                </ComposedChart>
            </ResponsiveContainer>
        </Box>
    );
};
