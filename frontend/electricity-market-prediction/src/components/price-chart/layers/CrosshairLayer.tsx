'use client';

import React from 'react';

interface CrosshairLayerProps {
    // Recharts internal props
    xAxisMap?: Record<string, any>;
    yAxisMap?: Record<string, any>;
    offset?: { left: number; top: number; width: number; height: number };
    // Custom props
    hoveredX?: number | null;
    colors: {
        text: string;
        grid: string;
    };
}

/**
 * CrosshairLayer - Renders a vertical crosshair line that follows mouse position
 * Used with Recharts Customized component to show where user is hovering
 */
export const CrosshairLayer: React.FC<CrosshairLayerProps> = ({
    xAxisMap,
    yAxisMap,
    offset,
    hoveredX,
    colors,
}) => {
    // Don't render if no hover position or missing axis info
    if (hoveredX === null || hoveredX === undefined || !offset) {
        return null;
    }

    const { top, height } = offset;

    return (
        <g className="crosshair-layer">
            {/* Vertical line */}
            <line
                x1={hoveredX}
                y1={top}
                x2={hoveredX}
                y2={top + height}
                stroke={colors.text}
                strokeWidth={1}
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                pointerEvents="none"
            />
        </g>
    );
};

export default CrosshairLayer;
