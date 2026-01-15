import React from 'react';
import { Box, Typography } from '@mui/material';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Line } from 'recharts';
import { format } from 'date-fns';

interface ZScoreChartProps {
    showZScore: boolean;
    processedChartData: any[]; // Ideally typed
    colors: any;
    selectedModels: any[];
    modelColorMap: Record<string, string>;
}

export const ZScoreChart: React.FC<ZScoreChartProps> = ({
    showZScore,
    processedChartData,
    colors,
    selectedModels,
    modelColorMap
}) => {
    if (!showZScore) return null;

    return (
        <Box sx={{ mt: 1, height: 150 }}>
            <Typography variant="subtitle2" sx={{ ml: 2, mb: 0.5, color: colors.text }}>
                Z-Score Analysis (Actual Price vs Models)
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={processedChartData && processedChartData.length > 0 ? processedChartData : []}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    syncId="priceChart"
                >
                    <XAxis
                        dataKey="timestamp"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        hide
                    />
                    <YAxis
                        label={{ value: 'Z-Score', angle: -90, position: 'insideLeft', style: { fill: colors.text, fontSize: 10 } }}
                        stroke={colors.text}
                        tick={{ fill: colors.text, fontSize: 10 }}
                        domain={['auto', 'auto']}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, color: colors.text }}
                        labelFormatter={(label) => format(new Date(label), 'MM/dd HH:mm')}
                        formatter={(value: number, name: string) => [value.toFixed(2), name]}
                        itemSorter={(item) => (item.name === 'Observation' ? -1 : 1)}
                    />
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                    <ReferenceLine y={0} stroke={colors.text} strokeOpacity={0.5} />
                    <ReferenceLine y={2} stroke={colors.warning} strokeDasharray="3 3" label={{ value: '+2σ', position: 'insideRight', fill: colors.warning, fontSize: 10 }} />
                    <ReferenceLine y={-2} stroke={colors.warning} strokeDasharray="3 3" label={{ value: '-2σ', position: 'insideRight', fill: colors.warning, fontSize: 10 }} />

                    {/* Model Z-Scores */}
                    {selectedModels.map((model, index) => {
                        const modelKey = `${model.id}|${model.name}`;
                        const modelColor = modelColorMap[modelKey];
                        return (
                            <Line
                                key={`zscore-${modelKey}-${index}`}
                                type="monotone"
                                dataKey={`modelZScores.${modelKey}`}
                                stroke={modelColor}
                                dot={false}
                                strokeWidth={1}
                                name={`${model.name}`}
                                isAnimationActive={false}
                                connectNulls={true}
                            />
                        );
                    })}

                    {/* Actual Price Z-Score */}
                    <Line
                        type="monotone"
                        dataKey="zScore"
                        stroke={colors.actual || colors.predicted}
                        dot={false}
                        strokeWidth={2}
                        name="Observation"
                        isAnimationActive={false}
                        connectNulls={true}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </Box>
    );
};
