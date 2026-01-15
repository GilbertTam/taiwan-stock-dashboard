import React from 'react';
import { Line, Customized } from 'recharts';
import { CandleStickLayer } from './CandleStickLayer';

interface IntradayLayerProps {
    showIntraday: boolean;
    data: any[];
    darkMode: boolean;
    colors: any;
}

export const IntradayLayer: React.FC<IntradayLayerProps> = ({
    showIntraday,
    data,
    darkMode,
    colors
}) => {
    if (!showIntraday) return null;

    return (
        <>
            <Customized
                component={CandleStickLayer}
                data={data}
                yAxisId="price"
                darkMode={darkMode}
            />
            <Line
                yAxisId="price"
                type="monotone"
                dataKey="intraday_average"
                stroke={colors.intraday}
                name="時間前市場平均價"
                strokeWidth={2}
                dot={false}
                connectNulls={true}
                isAnimationActive={false}
            />
        </>
    );
};
