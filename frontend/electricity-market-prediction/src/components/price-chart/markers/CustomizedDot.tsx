import React from 'react';

// Define props interface
interface CustomizedDotProps {
    cx?: number;
    cy?: number;
    stroke?: string;
    payload?: any;
    dataKey?: string;
}

export const CustomizedDot: React.FC<CustomizedDotProps> = (props) => {
    const { cx, cy, stroke, payload, dataKey } = props;
    if (!payload?.markerInfo) return null;

    let type = null;
    if (dataKey === "actualPrice") {
        type = payload.markerInfo.actualType;
    }

    if (!type) return null;

    // Ensure cx and cy are numbers 
    const x = (cx || 0) - 5;
    const y = (cy || 0) - 5;

    return (
        <svg x={x} y={y} width={10} height={10} viewBox="0 0 10 10">
            {type === 'top' ? (
                <path d="M5 0 L10 10 L0 10 Z" fill={stroke} />
            ) : (
                <path d="M0 0 L10 0 L5 10 Z" fill={stroke} />
            )}
        </svg>
    );
};
