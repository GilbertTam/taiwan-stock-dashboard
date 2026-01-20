import { useMemo } from 'react';
import { ChartDataPoint, ModelPrediction, generateColor, hashString, parseToTimestamp, formatTimestamp } from '@/utils/chartUtils';
import { ImbalanceData, IntradayData, InterconnectionFlow, OcctoAreaData } from '@/types';

interface UseChartDataProps {
    chartData: ChartDataPoint[];
    imbalanceData: ImbalanceData[];
    intradayData: IntradayData[];
    interconnectionData: InterconnectionFlow[];
    occtoAreaData: OcctoAreaData[];
    areaName: string;
    selectedModels: {
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }[];
    topBottomPairs: number;
    occtoChartType: 'line' | 'stacked';
    selectedOcctoField: string;
    selectedOcctoFields: Set<string>;
}

export const useChartData = ({
    chartData,
    imbalanceData,
    intradayData,
    interconnectionData,
    occtoAreaData,
    areaName,
    selectedModels,
    topBottomPairs,
    occtoChartType,
    selectedOcctoField,
    selectedOcctoFields
}: UseChartDataProps) => {

    // 1. modelColorMap
    const modelColorMap = useMemo(() => {
        const colorMap: Record<string, string> = {};
        selectedModels.forEach((model) => {
            const modelKey = `${model.id}|${model.name}`;
            colorMap[modelKey] = model.color || generateColor(hashString(modelKey));
        });
        return colorMap;
    }, [selectedModels]);

    // 2. modelMAEs
    const modelMAEs = useMemo(() => {
        const maes: Record<string, number> = {};
        selectedModels.forEach(model => {
            const modelKey = `${model.id}|${model.name}`;
            const validPoints = chartData.reduce((acc, point) => {
                const modelPrediction = point.modelPredictions.find(
                    (mp: ModelPrediction) => `${mp.modelId}|${mp.modelName}` === modelKey
                );
                if (
                    point.actualPrice !== null &&
                    point.actualPrice !== undefined &&
                    modelPrediction?.predictedPrice !== null &&
                    modelPrediction?.predictedPrice !== undefined
                ) {
                    acc.push({
                        actual: point.actualPrice,
                        predicted: modelPrediction.predictedPrice
                    });
                }
                return acc;
            }, [] as Array<{ actual: number, predicted: number }>);

            if (validPoints.length === 0) {
                maes[modelKey] = 0;
                return;
            }

            const totalError = validPoints.reduce((sum, point) => {
                return sum + Math.abs(point.actual - point.predicted);
            }, 0);
            maes[modelKey] = totalError / validPoints.length;
        });
        return maes;
    }, [chartData, selectedModels]);

    // 3. pointsWithMarkers (Top/Bottom) - kept logic but ensured safe access
    const pointsWithMarkers = useMemo(() => {
        const dataByDate: Record<string, ChartDataPoint[]> = {};
        // Group by date (YYYY-MM-DD)
        chartData.forEach(point => {
            const date = point.date || point.dateTime.split(' ')[0];
            if (!dataByDate[date]) dataByDate[date] = [];
            dataByDate[date].push(point);
        });

        const markers: Record<string, {
            actualType?: 'top' | 'bottom';
            models: Record<string, 'top' | 'bottom'>;
        }> = {};

        Object.values(dataByDate).forEach(dailyPoints => {
            if (dailyPoints.length < 40) return;

            const actuals = dailyPoints
                .map((p, idx) => ({
                    price: p.actualPrice,
                    index: idx,
                    id: `${p.dateTime}-${idx}`,
                    dateTime: p.dateTime
                }))
                .filter(item => item.price !== null && item.price !== undefined);

            const sortedActuals = [...actuals].sort((a, b) => (b.price as number) - (a.price as number));
            const topNActuals = sortedActuals.slice(0, topBottomPairs);
            const bottomNActuals = sortedActuals.slice(-topBottomPairs);

            selectedModels.forEach(model => {
                const modelKey = `${model.id}|${model.name}`;
                const preds = dailyPoints.map(p => {
                    const mp = p.modelPredictions.find(m => `${m.modelId}|${m.modelName}` === modelKey);
                    return {
                        price: mp?.predictedPrice,
                        dateTime: p.dateTime
                    };
                }).filter(item => item.price !== null && item.price !== undefined);

                const sortedPreds = [...preds].sort((a, b) => (b.price as number) - (a.price as number));
                const topNPreds = sortedPreds.slice(0, topBottomPairs);
                const bottomNPreds = sortedPreds.slice(-topBottomPairs);

                topNPreds.forEach(item => {
                    if (!markers[item.dateTime]) markers[item.dateTime] = { models: {} };
                    markers[item.dateTime].models[modelKey] = 'top';
                });
                bottomNPreds.forEach(item => {
                    if (!markers[item.dateTime]) markers[item.dateTime] = { models: {} };
                    markers[item.dateTime].models[modelKey] = 'bottom';
                });
            });

            topNActuals.forEach(item => {
                if (!markers[item.dateTime as string]) markers[item.dateTime as string] = { models: {} };
                markers[item.dateTime as string].actualType = 'top';
            });
            bottomNActuals.forEach(item => {
                if (!markers[item.dateTime as string]) markers[item.dateTime as string] = { models: {} };
                markers[item.dateTime as string].actualType = 'bottom';
            });
        });

        return markers;
    }, [chartData, selectedModels, topBottomPairs]);

    // 4. mergedChartData & 5. processedChartData combined
    // We combine them to avoid multiple loops and simplify state
    const processedChartData = useMemo(() => {
        console.log('[useChartData] merging data sources...');
        const dataMap = new Map<number, ChartDataPoint>();

        const ensurePoint = (ts: number): ChartDataPoint => {
            if (!dataMap.has(ts)) {
                // Determine strings from timestamp
                const dateObj = new Date(ts);
                const isoFull = formatTimestamp(ts);
                const [d, t] = isoFull.split(' ');

                dataMap.set(ts, {
                    timestamp: ts,
                    dateTime: isoFull,
                    date: d,
                    time: t,
                    actualPrice: null,
                    modelPredictions: [],
                    isPrediction: false
                });
            }
            return dataMap.get(ts)!;
        };

        // A. Base Chart Data
        if (chartData && Array.isArray(chartData)) {
            chartData.forEach(p => {
                if (p.timestamp && !isNaN(p.timestamp)) {
                    dataMap.set(p.timestamp, { ...p });
                }
            });
        }

        // B. Imbalance Data
        if (imbalanceData && Array.isArray(imbalanceData)) {
            const areaFieldMap: Record<string, keyof ImbalanceData> = {
                'hokkaido': 'hokkaido', 'tohoku': 'tohoku', 'tokyo': 'tokyo',
                'chubu': 'chubu', 'hokuriku': 'hokuriku', 'kansai': 'kansai',
                'chugoku': 'chugoku', 'shikoku': 'shikoku', 'kyushu': 'kyushu'
            };
            const areaField = areaFieldMap[areaName?.toLowerCase() || ''];
            if (areaField) {
                imbalanceData.forEach(item => {
                    const ts = parseToTimestamp(item.datetime);
                    if (ts) {
                        const point = ensurePoint(ts);
                        const val = item[areaField];
                        point.imbalance = (typeof val === 'number' && !isNaN(val)) ? val : null;
                    }
                });
            }
        }

        // C. Intraday Data
        if (intradayData && Array.isArray(intradayData)) {
            intradayData.forEach(item => {
                const ts = parseToTimestamp(item.datetime);
                if (ts) {
                    const point = ensurePoint(ts);
                    point.intraday_average = item.average_price;
                    point.intraday_opening = item.opening_price;
                    point.intraday_closing = item.closing_price;
                    point.intraday_high = item.high_price;
                    point.intraday_low = item.low_price;

                    // Candlestick payload
                    const iHigh = Number(item.high_price);
                    const iLow = Number(item.low_price);
                    const iOpen = Number(item.opening_price);
                    const iClose = Number(item.closing_price);

                    if (!isNaN(iHigh) && !isNaN(iLow) && !isNaN(iOpen) && !isNaN(iClose)) {
                        point.candlestickPayload = {
                            high: iHigh, low: iLow, open: iOpen, close: iClose
                        };
                        point.intraday_bar_trigger = iHigh === 0 ? 0.0001 : iHigh;
                    }
                }
            });
        }

        // D. Interconnection Data
        if (interconnectionData && Array.isArray(interconnectionData)) {
            interconnectionData.forEach(item => {
                const ts = parseToTimestamp(item.datetime);
                if (ts) {
                    const point = ensurePoint(ts);
                    const forward = typeof item.forward_planned_flow === 'number' ? item.forward_planned_flow : 0;
                    const reverse = typeof item.reverse_planned_flow === 'number' ? item.reverse_planned_flow : 0;
                    point.interconnection_flow_diff = forward - reverse;
                    point.interconnection_forward = forward;
                    point.interconnection_reverse = reverse;
                }
            });
        }

        // E. Occto Data
        if (occtoAreaData && Array.isArray(occtoAreaData)) {
            occtoAreaData.forEach(item => {
                const ts = parseToTimestamp(item.datetime);
                if (ts) {
                    const point = ensurePoint(ts);
                    point.occto_data = item;
                    // Keep backward compatibility with selectedOcctoField
                    point.occto_value = (item as any)[selectedOcctoField];
                    // Store all selected fields for multi-field rendering
                    if (!point.occto_values) {
                        point.occto_values = {};
                    }
                    selectedOcctoFields.forEach(field => {
                        point.occto_values![field] = (item as any)[field];
                    });
                }
            });
        }

        // Calculate Stats (Z-Score, Deltas, etc.) and Sort
        const sortedPoints = Array.from(dataMap.values()).sort((a, b) => a.timestamp - b.timestamp);

        // Pre-calc stats
        const validPrices = sortedPoints
            .map(p => p.actualPrice)
            .filter((p): p is number => typeof p === 'number');

        let mean = 0;
        let stdDev = 1;
        if (validPrices.length > 1) {
            mean = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
            const variance = validPrices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validPrices.length;
            stdDev = Math.sqrt(variance);
        }

        return sortedPoints.map((point, index) => {
            // Model Differences & Areas
            const modelDifferences: Record<string, number | null> = {};
            const modelAreaTops: Record<string, number | null> = {};
            const modelAreaBottoms: Record<string, number | null> = {};

            point.modelPredictions.forEach(mp => {
                const modelKey = `${mp.modelId}|${mp.modelName}`;
                modelDifferences[modelKey] = point.actualPrice !== null ? mp.predictedPrice - point.actualPrice : null;
                modelAreaTops[modelKey] = mp.predictedPrice95 ?? mp.predictedPrice ?? null;
                modelAreaBottoms[modelKey] = mp.predictedPrice5 ?? mp.predictedPrice ?? null;
            });

            // Actual Delta
            const actualDelta = index > 0 && point.actualPrice !== null && sortedPoints[index - 1].actualPrice !== null
                ? point.actualPrice - (sortedPoints[index - 1].actualPrice as number)
                : null;

            // Z-Score
            let zScore: number | null = null;
            const modelZScores: Record<string, number | null> = {};

            if (stdDev !== 0) {
                if (point.actualPrice !== null) {
                    zScore = (point.actualPrice - mean) / stdDev;
                }

                // Calculate Z-Score for each model
                point.modelPredictions.forEach(mp => {
                    const modelKey = `${mp.modelId}|${mp.modelName}`;
                    if (mp.predictedPrice !== null && mp.predictedPrice !== undefined) {
                        modelZScores[modelKey] = (mp.predictedPrice - mean) / stdDev;
                    } else {
                        modelZScores[modelKey] = null;
                    }
                });
            }

            // Marker Info
            const markerInfo = pointsWithMarkers[point.dateTime] || { models: {} };

            return {
                ...point,
                modelDifferences,
                modelAreaTops,
                modelAreaBottoms,
                actualDelta,
                zScore,
                modelZScores,
                markerInfo,
                uniqueKey: `${point.dateTime}-${index}`
            };
        });

    }, [chartData, imbalanceData, intradayData, interconnectionData, occtoAreaData, areaName, selectedOcctoField, selectedOcctoFields, pointsWithMarkers]);

    // Ranges
    const priceRange = useMemo(() => {
        if (chartData.length === 0) return { min: 0, max: 35 };
        const allPrices: number[] = [];

        // From chartData (faster to loop logic)
        processedChartData.forEach(p => {
            if (typeof p.actualPrice === 'number') allPrices.push(p.actualPrice);
            p.modelPredictions.forEach(mp => {
                allPrices.push(mp.predictedPrice);
                if (mp.predictedPrice5) allPrices.push(mp.predictedPrice5);
                if (mp.predictedPrice95) allPrices.push(mp.predictedPrice95);
            });
            // Intraday (exclude volume-like outliers > 1000)
            const check = (v?: number | null) => {
                if (v !== null && v !== undefined && !isNaN(v) && Math.abs(v) < 1000) allPrices.push(v);
            };
            check(p.intraday_high);
            check(p.intraday_low);
        });

        if (allPrices.length === 0) return { min: 0, max: 35 };

        const min = Math.floor(Math.min(...allPrices) * 0.9);
        const max = Math.ceil(Math.max(...allPrices) * 1.1);
        return { min: Math.max(0, min), max: Math.max(35, max) };
    }, [chartData, processedChartData]);

    const imbalanceRange = useMemo(() => {
        const values = processedChartData
            .map(p => p.imbalance)
            .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

        if (values.length === 0) return { min: 0, max: 35 };
        const min = Math.floor(Math.min(...values));
        const max = Math.ceil(Math.max(...values));
        const padding = Math.abs(max - min) * 0.1;
        return { min: Math.floor(min - padding), max: Math.ceil(max + padding) };
    }, [processedChartData]);

    const occtoRange = useMemo(() => {
        let values: number[] = [];
        if (occtoChartType === 'stacked') {
            values = processedChartData
                .map(p => p.occto_data ? p.occto_data.total : 0)
                .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
        } else {
            // Collect values from all selected fields
            processedChartData.forEach(p => {
                if (p.occto_values) {
                    selectedOcctoFields.forEach(field => {
                        const val = p.occto_values![field];
                        if (val !== null && val !== undefined && !isNaN(val)) {
                            values.push(val);
                        }
                    });
                }
            });
        }

        if (values.length === 0) return { min: 0, max: 100 };
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = Math.abs(max - min) * 0.1;
        return { min: Math.floor(min - padding), max: Math.ceil(max + padding) };
    }, [processedChartData, occtoChartType, selectedOcctoFields]);

    return {
        modelColorMap,
        modelMAEs,
        processedChartData,
        priceRange,
        imbalanceRange,
        occtoRange
    };
};
