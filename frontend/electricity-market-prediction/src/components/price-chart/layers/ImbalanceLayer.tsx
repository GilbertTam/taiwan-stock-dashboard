import React from 'react';
import { Line, YAxis } from 'recharts';

interface ImbalanceLayerProps {
    showImbalance: boolean;
    imbalanceRange: { min: number; max: number };
    colors: any;
}

export const ImbalanceLayer: React.FC<ImbalanceLayerProps> = ({
    showImbalance,
    imbalanceRange,
    colors
}) => {
    if (!showImbalance) return null;

    return (
        <>
            <YAxis
                yAxisId="imbalance"
                orientation="right"
                domain={[imbalanceRange.min, imbalanceRange.max]}
                stroke={colors.imbalance}
                tick={{ fill: colors.imbalance, fontSize: 11 }}
                label={{ value: 'Imbalance Quantity', angle: 90, position: 'insideRight', style: { fill: colors.imbalance, fontSize: 12 } }}
            />
            <Line
                yAxisId="imbalance"
                type="monotone"
                dataKey="imbalance"
                stroke={colors.imbalance}
                name="Imbalance Quantity"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
                dot={false}
            />
        </>
    );
};
