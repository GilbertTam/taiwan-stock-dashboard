import React from 'react';
import { Line, YAxis, ReferenceLine } from 'recharts';

interface InterconnectionLayerProps {
    showInterconnection: boolean;
    colors: any;
}

export const InterconnectionLayer: React.FC<InterconnectionLayerProps> = ({
    showInterconnection,
    colors
}) => {
    if (!showInterconnection) return null;

    return (
        <>
            <YAxis
                yAxisId="interconnection"
                orientation="right"
                domain={['auto', 'auto']}
                stroke={colors.interconnection}
                tick={{ fill: colors.interconnection, fontSize: 11 }}
                label={{ value: 'MW', angle: 90, position: 'insideRight', style: { fill: colors.interconnection, fontSize: 12 } }}
            />
            <ReferenceLine y={0} yAxisId="interconnection" stroke={colors.interconnection} strokeOpacity={0.3} strokeDasharray="3 3" />
            <Line
                yAxisId="interconnection"
                type="monotone"
                dataKey="interconnection_flow_diff"
                stroke={colors.interconnection}
                strokeOpacity={1}
                name="連系線流量差異 (MW)"
                strokeWidth={3}
                connectNulls={true}
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 5, fill: colors.interconnection, stroke: colors.interconnection, strokeWidth: 2 }}
            />
        </>
    );
};
