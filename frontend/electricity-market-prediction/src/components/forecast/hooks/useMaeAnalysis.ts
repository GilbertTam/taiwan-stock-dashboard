import { useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { ChartDataPoint, hashString, generateColor } from '@/utils/chartUtils';
import { TimeSlot } from '@/types';

interface UseMaeAnalysisProps {
    chartData: ChartDataPoint[];
    selectedModels: {
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }[];
}

export const useMaeAnalysis = ({ chartData, selectedModels }: UseMaeAnalysisProps) => {
    // 為每個模型分配顏色 - single-pass identical to useChartData to ensure consistency with sidebar/main chart
    const modelColorMap = useMemo(() => {
        const colorMap: Record<string, string> = {};
        const usedColors: string[] = [];
        selectedModels.forEach((model) => {
            const modelKey = `${model.id}|${model.name}`;
            const assignedColor = generateColor(hashString(modelKey), usedColors);
            colorMap[modelKey] = assignedColor;
            usedColors.push(assignedColor);
        });
        return colorMap;
    }, [selectedModels]);

    // 判斷數據點是否在指定時段內
    const isInTimeSlot = useCallback((dateTime: string, slot: TimeSlot): boolean => {
        if (slot === TimeSlot.ALL) return true;

        const [_, timePart] = dateTime.split(' ');
        const hour = parseInt(timePart.split(':')[0], 10);

        switch (slot) {
            case TimeSlot.MORNING:
                return hour >= 8 && hour < 10;
            case TimeSlot.EVENING:
                return hour >= 17 && hour < 19;
            case TimeSlot.NIGHT:
                return hour >= 22 || hour < 24;
            default:
                return true;
        }
    }, []);

    // 按日期分組數據
    const dataByDate = useMemo(() => {
        const groupedData: Record<string, ChartDataPoint[]> = {};

        chartData.forEach(point => {
            const [datePart] = point.dateTime.split(' ');
            if (!groupedData[datePart]) {
                groupedData[datePart] = [];
            }
            groupedData[datePart].push(point);
        });

        return groupedData;
    }, [chartData]);

    // 計算每個模型在每個時段的 MAE
    const modelTimeSlotMAEs = useMemo(() => {
        const timeSlotMAEs: Record<string, Record<TimeSlot, number>> = {};

        // 初始化每個模型的時段 MAE
        selectedModels.forEach(model => {
            const modelKey = `${model.id}|${model.name}`;
            timeSlotMAEs[modelKey] = {
                [TimeSlot.ALL]: 0,
                [TimeSlot.MORNING]: 0,
                [TimeSlot.EVENING]: 0,
                [TimeSlot.NIGHT]: 0
            };
        });

        // 計算每個時段的 MAE
        Object.values(TimeSlot).forEach(slot => {
            selectedModels.forEach(model => {
                const modelKey = `${model.id}|${model.name}`;

                const pointsInSlot = chartData.filter(point =>
                    isInTimeSlot(point.dateTime, slot) &&
                    point.actualPrice !== null &&
                    point.modelPredictions.some(mp =>
                        `${mp.modelId}|${mp.modelName}` === modelKey &&
                        mp.predictedPrice !== null
                    )
                );

                if (pointsInSlot.length === 0) {
                    timeSlotMAEs[modelKey][slot] = 0;
                    return;
                }

                const totalError = pointsInSlot.reduce((sum, point) => {
                    const modelPrediction = point.modelPredictions.find(
                        mp => `${mp.modelId}|${mp.modelName}` === modelKey
                    );
                    if (!modelPrediction) return sum;
                    return sum + Math.abs((point.actualPrice as number) - (modelPrediction.predictedPrice as number));
                }, 0);

                timeSlotMAEs[modelKey][slot] = totalError / pointsInSlot.length;
            });
        });

        return timeSlotMAEs;
    }, [chartData, selectedModels, isInTimeSlot]);

    // 計算每天每個模型的 MAE
    const dailyMAEs = useMemo(() => {
        const result: {
            date: string;
            formattedDate: string;
            [key: string]: any;
        }[] = [];

        Object.entries(dataByDate).forEach(([date, points]) => {
            const dailyResult: any = {
                date,
                formattedDate: format(parseISO(date), 'MM/dd')
            };

            selectedModels.forEach(model => {
                const modelKey = `${model.id}|${model.name}`;

                const pointsWithBothValues = points.filter(point => {
                    const modelPrediction = point.modelPredictions.find(
                        mp => `${mp.modelId}|${mp.modelName}` === modelKey
                    );
                    return point.actualPrice !== null && modelPrediction?.predictedPrice !== null;
                });

                if (pointsWithBothValues.length === 0) {
                    dailyResult[`${modelKey}_mae`] = 0;
                    return;
                }

                const totalError = pointsWithBothValues.reduce((sum, point) => {
                    const modelPrediction = point.modelPredictions.find(
                        mp => `${mp.modelId}|${mp.modelName}` === modelKey
                    );
                    if (!modelPrediction) return sum;
                    return sum + Math.abs((point.actualPrice as number) - (modelPrediction.predictedPrice as number));
                }, 0);

                dailyResult[`${modelKey}_mae`] = totalError / pointsWithBothValues.length;
            });

            // 計算每個時段的 MAE
            Object.values(TimeSlot).forEach(slot => {
                if (slot === TimeSlot.ALL) return; // 跳過全部時段

                selectedModels.forEach(model => {
                    const modelKey = `${model.id}|${model.name}`;

                    const pointsInSlot = points.filter(point =>
                        isInTimeSlot(point.dateTime, slot) &&
                        point.actualPrice !== null &&
                        point.modelPredictions.some(mp =>
                            `${mp.modelId}|${mp.modelName}` === modelKey &&
                            mp.predictedPrice !== null
                        )
                    );

                    if (pointsInSlot.length === 0) {
                        dailyResult[`${modelKey}_${slot}_mae`] = 0;
                        return;
                    }

                    const totalError = pointsInSlot.reduce((sum, point) => {
                        const modelPrediction = point.modelPredictions.find(
                            mp => `${mp.modelId}|${mp.modelName}` === modelKey
                        );
                        if (!modelPrediction) return sum;
                        return sum + Math.abs((point.actualPrice as number) - (modelPrediction.predictedPrice as number));
                    }, 0);

                    dailyResult[`${modelKey}_${slot}_mae`] = totalError / pointsInSlot.length;
                });
            });

            result.push(dailyResult);
        });

        return result.sort((a, b) => a.date.localeCompare(b.date));
    }, [dataByDate, selectedModels, isInTimeSlot]);

    return {
        modelColorMap,
        modelTimeSlotMAEs,
        dailyMAEs,
        isInTimeSlot
    };
};
