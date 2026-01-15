import React from 'react';

export interface CandleStickLayerProps {
    xAxisMap?: any;
    yAxisMap?: any;
    data?: any[];
    yAxisId: string | number;
    darkMode: boolean;
}

export const CandleStickLayer: React.FC<CandleStickLayerProps> = (props) => {
    const { xAxisMap, yAxisMap, data, yAxisId, darkMode } = props;

    // 1. Get X Axis
    const xAxis = xAxisMap && (xAxisMap[0] || Object.values(xAxisMap)[0]);
    const xScale = xAxis?.scale;

    // 2. Get Y Axis (by ID)
    let yScale: any;
    if (yAxisMap) {
        if (yAxisMap[yAxisId]) {
            yScale = yAxisMap[yAxisId].scale;
        } else {
            const axisObj = Object.values(yAxisMap).find((axis: any) => axis.props?.yAxisId === yAxisId) as any;
            if (axisObj && typeof axisObj.scale === 'function') {
                yScale = axisObj.scale;
            }
        }
    }

    if (!xScale || !yScale || !data) return null;

    const range = xScale.range();
    const chartWidth = Math.abs(range[1] - range[0]);
    const dataLength = data.length;
    const candleWidth = Math.max(3, Math.min(12, (chartWidth / dataLength) * 0.6));

    return (
        <g className="recharts-candlestick-layer">
            {data.map((entry: any, index: number) => {
                const open = entry.intraday_opening;
                const close = entry.intraday_closing;
                const high = entry.intraday_high;
                const low = entry.intraday_low;
                const timestamp = entry.timestamp;

                if ([open, close, high, low, timestamp].some((v: any) => v === null || v === undefined)) return null;

                const x = xScale(timestamp);
                const yOpen = yScale(open);
                const yClose = yScale(close);
                const yHigh = yScale(high);
                const yLow = yScale(low);

                if (isNaN(x) || isNaN(yOpen) || isNaN(yClose)) return null;

                const isRising = close >= open;
                const color = isRising
                    ? (darkMode ? '#ff4d4f' : '#cf1322')
                    : (darkMode ? '#52c41a' : '#389e0d');

                const bodyTop = Math.min(yOpen, yClose);
                const bodyHeight = Math.max(1, Math.abs(yOpen - yClose));

                return (
                    <g key={`candle-${index}`}>
                        <line
                            x1={x} x2={x} y1={yHigh} y2={yLow}
                            stroke={color}
                            strokeWidth={1.5}
                            strokeOpacity={0.2}
                        />
                        <rect
                            x={x - candleWidth / 2}
                            y={bodyTop}
                            width={candleWidth}
                            height={bodyHeight}
                            fill={color}
                            stroke="none"
                            fillOpacity={0.2}
                        />
                    </g>
                );
            })}
        </g>
    );
};
