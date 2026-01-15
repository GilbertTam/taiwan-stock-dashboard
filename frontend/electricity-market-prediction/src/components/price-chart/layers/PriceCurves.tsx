import React from 'react';
import { Area, Line } from 'recharts';
import { ModelPrediction } from '@/utils/chartUtils';

interface PriceCurvesProps {
    showPredictionRange: boolean;
    selectedModels: { id: string | number; name: string }[];
    modelColorMap: Record<string, string>;
    chartType: 'line' | 'stepLine';
    colors: any;
    getModelDot: (key: string) => any;
    CustomizedDot: any;
}

export const PriceCurves: React.FC<PriceCurvesProps> = ({
    showPredictionRange,
    selectedModels,
    modelColorMap,
    chartType,
    colors,
    getModelDot,
    CustomizedDot
}) => {
    console.log('[PriceCurves] Rendering with:', {
        selectedModelsCount: selectedModels?.length || 0,
        showPredictionRange,
        chartType
    });
    
    return (
        <>
            {/* Prediction Ranges */}
            {showPredictionRange && selectedModels.map((model, index) => {
                const modelKey = `${model.id}|${model.name}`;
                const modelColor = modelColorMap[modelKey];
                const areaColor = modelColor.includes('rgb') ? modelColor.replace(')', ', 0.2)').replace('rgb', 'rgba') : `${modelColor}33`;
                return (
                    <Area
                        key={`area-${modelKey}-${index}`}
                        yAxisId="price"
                        type={chartType === 'stepLine' ? 'step' : 'monotone'}
                        dataKey={(datum) => {
                            const prediction = datum.modelPredictions.find((mp: ModelPrediction) => `${mp.modelId}|${mp.modelName}` === modelKey);
                            if (!prediction) return null;
                            const bottom = prediction.predictedPrice5 ?? prediction.predictedPrice;
                            const top = prediction.predictedPrice95 ?? prediction.predictedPrice;
                            if (bottom === null || top === null) return null;
                            return [bottom, top];
                        }}
                        stroke="none"
                        fill={areaColor}
                        fillOpacity={0.5}
                        activeDot={false}
                        isAnimationActive={false}
                        connectNulls={true}
                    />
                );
            })}

            {/* Model Lines */}
            {selectedModels.map((model, index) => {
                const modelKey = `${model.id}|${model.name}`;
                const modelColor = modelColorMap[modelKey];
                return (
                    <Line
                        key={`line-${modelKey}-${index}`}
                        yAxisId="price"
                        type={chartType === 'stepLine' ? 'step' : 'monotone'}
                        dataKey={(datum) => {
                            const prediction = datum.modelPredictions.find(
                                (mp: ModelPrediction) => `${mp.modelId}|${mp.modelName}` === modelKey
                            );
                            return prediction?.predictedPrice ?? null;
                        }}
                        stroke={modelColor}
                        name={`${model.name}`}
                        dot={getModelDot(modelKey)}
                        strokeWidth={1.5}
                        connectNulls={true}
                        isAnimationActive={false}
                    />
                );
            })}

            {/* Actual Price Line */}
            {(() => {
                console.log('[PriceCurves] Rendering Actual Price Line with:', {
                    chartType,
                    actualColor: colors.actual,
                    hasCustomizedDot: !!CustomizedDot
                });
                return (
                    <Line
                        yAxisId="price"
                        type={chartType === 'stepLine' ? 'step' : 'monotone'}
                        dataKey="actualPrice"
                        stroke={colors.actual}
                        name="Observation"
                        dot={<CustomizedDot />}
                        strokeWidth={1.5}
                        connectNulls={false}
                        isAnimationActive={false}
                    />
                );
            })()}
        </>
    );
};
