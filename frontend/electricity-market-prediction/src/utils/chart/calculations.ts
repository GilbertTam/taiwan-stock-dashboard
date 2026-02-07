
import { ChartDataPoint, ProcessedDataPoint } from './types';

export function calculateModelMAE(chartData: ChartDataPoint[], modelId: string | number, modelName: string): number {
    const pointsWithBothValues = chartData.filter(point => {
        const modelPrediction = point.modelPredictions.find(
            mp => mp.modelId === modelId && mp.modelName === modelName
        );
        // 確保 actualPrice 和 predictedPrice 都是有效的數值
        return typeof point.actualPrice === 'number' &&
            modelPrediction?.predictedPrice !== null &&
            modelPrediction?.predictedPrice !== undefined;
    });

    if (pointsWithBothValues.length === 0) return 0;

    let validPointsCount = 0;
    const totalError = pointsWithBothValues.reduce((sum, point) => {
        const modelPrediction = point.modelPredictions.find(
            mp => mp.modelId === modelId && mp.modelName === modelName
        );

        if (!modelPrediction || typeof modelPrediction.predictedPrice !== 'number') return sum;

        validPointsCount++;
        return sum + Math.abs(point.actualPrice as number - modelPrediction.predictedPrice);
    }, 0);

    return validPointsCount > 0 ? totalError / validPointsCount : 0;
}

/**
 * Calculates stacked values for histogram series
 * Returns array of base values for each data point
 */
export const calculateStackedBases = (
    data: ProcessedDataPoint[],
    fieldExtractors: Array<(point: ProcessedDataPoint) => number | null>,
    fieldIndex: number
): number[] => {
    return data.map(point => {
        let base = 0;
        // Sum all previous fields
        for (let i = 0; i < fieldIndex; i++) {
            const value = fieldExtractors[i](point);
            if (value !== null && value !== undefined && !isNaN(value)) {
                base += value;
            }
        }
        return base;
    });
};

/**
 * Calculates percentage stacked values
 */
export const calculatePercentageStackedValues = (
    data: ProcessedDataPoint[],
    fieldExtractors: Array<(point: ProcessedDataPoint) => number | null>,
    fieldIndex: number
): { value: number; base: number }[] => {
    return data.map(point => {
        // Calculate total for all fields
        let total = 0;
        fieldExtractors.forEach(extractor => {
            const value = extractor(point);
            if (value !== null && value !== undefined && !isNaN(value)) {
                total += value;
            }
        });

        if (total === 0) {
            return { value: 0, base: 0 };
        }

        // Calculate percentage for current field
        const currentValue = fieldExtractors[fieldIndex](point);
        const percentage = currentValue !== null && currentValue !== undefined && !isNaN(currentValue)
            ? (currentValue / total) * 100
            : 0;

        // Calculate base (sum of previous percentages)
        let base = 0;
        for (let i = 0; i < fieldIndex; i++) {
            const prevValue = fieldExtractors[i](point);
            if (prevValue !== null && prevValue !== undefined && !isNaN(prevValue)) {
                base += (prevValue / total) * 100;
            }
        }

        return { value: percentage, base };
    });
};
