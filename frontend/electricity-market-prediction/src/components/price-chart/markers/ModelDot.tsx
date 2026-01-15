import React from 'react';

interface ModelDotProps {
    cx?: number;
    cy?: number;
    stroke?: string;
    payload?: any;
    modelKey: string;
}

export const ModelDot: React.FC<ModelDotProps> = (props) => {
    const { cx, cy, stroke, payload, modelKey } = props;

    if (!payload?.markerInfo) return null;

    // Check if models dictionary exists and has the key
    const models = payload.markerInfo.models || {};
    const type = models[modelKey];

    if (!type) return null;

    const x = (cx || 0) - 4;
    const y = (cy || 0) - 4;

    return (
        <svg x={x} y={y} width={8} height={8} viewBox="0 0 10 10">
            {type === 'top' ? (
                <path d="M5 0 L10 5 L5 10 L0 5 Z" fill={stroke} />
            ) : (
                <circle cx="5" cy="5" r="4" fill={stroke} />
            )}
        </svg>
    );
};

// Helper to create the render function Recharts expects
export const getModelDot = (modelKey: string) => (props: any) => {
    const { key, ...otherProps } = props;
    return <ModelDot key={key} {...otherProps} modelKey={modelKey} />;
};
