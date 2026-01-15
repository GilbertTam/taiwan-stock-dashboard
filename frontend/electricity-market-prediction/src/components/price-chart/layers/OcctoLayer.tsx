import React from 'react';
import { Line, Bar, YAxis } from 'recharts';
import { occtoFields, occtoStackedFields } from '../constants';

interface OcctoLayerProps {
    showOcctoArea: boolean;
    occtoRange: { min: number; max: number };
    occtoChartType: 'line' | 'stacked';
    selectedOcctoField: string;
    colors: any;
}

export const OcctoLayer: React.FC<OcctoLayerProps> = ({
    showOcctoArea,
    occtoRange,
    occtoChartType,
    selectedOcctoField,
    colors
}) => {
    if (!showOcctoArea) return null;

    return (
        <>
            <YAxis
                yAxisId="occto"
                orientation="right"
                domain={[occtoRange.min, occtoRange.max]}
                stroke={colors.occtoArea}
                tick={{ fill: colors.occtoArea, fontSize: 11 }}
                label={{
                    value: occtoFields.find(f => f.value === selectedOcctoField)?.label,
                    angle: 90,
                    position: 'insideRight',
                    style: { fill: colors.occtoArea, fontSize: 12 }
                }}
            />

            {occtoChartType === 'line' && (
                <Line
                    yAxisId="occto"
                    type="monotone"
                    dataKey="occto_value"
                    stroke={colors.occtoArea}
                    name={occtoFields.find(f => f.value === selectedOcctoField)?.label || selectedOcctoField}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={true}
                    isAnimationActive={false}
                />
            )}

            {occtoChartType === 'stacked' && occtoStackedFields.map(field => (
                <Bar
                    key={field.key}
                    dataKey={`occto_data.${field.key}`}
                    yAxisId="occto"
                    stackId="occto"
                    fill={field.color}
                    name={field.label}
                    isAnimationActive={false}
                    barSize={20}
                />
            ))}
        </>
    );
};
