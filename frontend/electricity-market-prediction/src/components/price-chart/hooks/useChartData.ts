import { useMemo } from 'react';
import { ChartDataPoint, ModelPrediction, generateColor, hashString, parseToTimestamp, formatTimestamp } from '@/utils/chartUtils';
import { ImbalanceData, IntradayData, InterconnectionFlow, OcctoAreaData, WeatherData } from '@/types';

interface UseChartDataProps {
    chartData: ChartDataPoint[];
    imbalanceData: ImbalanceData[];
    intradayData: IntradayData[];
    interconnectionData: InterconnectionFlow[];
    occtoAreaData: OcctoAreaData[];
    weatherActual?: WeatherData[];
    weatherForecast?: WeatherData[];
    areaName: string;
    selectedModels: {
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }[];
    topBottomPairs: number;
    occtoChartType: 'line' | 'stacked' | 'percentage';
    selectedOcctoField: string;
    selectedOcctoFields: Set<string>;
    selectedWeatherFields?: Set<string>;
    showWeatherActual?: boolean;
    showWeatherForecast?: boolean;
}

export const useChartData = ({
    chartData,
    imbalanceData,
    intradayData,
    interconnectionData,
    occtoAreaData,
    weatherActual,
    weatherForecast,
    areaName,
    selectedModels,
    topBottomPairs,
    occtoChartType,
    selectedOcctoField,
    selectedOcctoFields,
    selectedWeatherFields,
    showWeatherActual = false,
    showWeatherForecast = false
}: UseChartDataProps) => {

    // 1. modelColorMap - 強制使用高區別度調色盤，忽略後端內建顏色，確保模型之間顏色差異大
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

        // F. Weather Actual Data
        // NOTE: 後端 Weather 時間為 UTC（例如 "2026-02-03T00:00:00+00:00"），parseToTimestamp 會正確解析為 UTC timestamp。
        // 但價格資料的時間是本地時間（Asia/Taipei, UTC+8），例如 "2026-02-03 00:00" 被解析為本地午夜。
        // 為了讓 Weather 與價格對齊，我們需要將 UTC timestamp 減去 8 小時，使其對應到本地時間的同一時刻。
        // 例如：UTC 00:00 (timestamp X) 應該對應到本地 00:00 (timestamp X - 8h)，而不是本地 08:00。
        const WEATHER_TIME_OFFSET_MS = -8 * 60 * 60 * 1000; // 減去 8 小時，將 UTC 時間對齊到本地時間
        if (showWeatherActual && weatherActual && Array.isArray(weatherActual)) {
            weatherActual.forEach((item) => {
                const tsRaw = parseToTimestamp(item.weather_datetime);
                const ts = tsRaw !== null ? tsRaw + WEATHER_TIME_OFFSET_MS : null;

                if (ts) {
                    const point = ensurePoint(ts);
                    // Store all weather fields with source marker
                    if (!point.weather_data) {
                        point.weather_data = {};
                    }
                    if (!point.weather_data_actual) {
                        point.weather_data_actual = {};
                    }
                    point.weather_data_actual.temperature = item.temperature;
                    point.weather_data_actual.rainfall = item.rainfall;
                    point.weather_data_actual.snowfall = item.snowfall;
                    point.weather_data_actual.wind_speed = item.wind_speed;
                    point.weather_data_actual.relative_humidity = item.relative_humidity;
                    point.weather_data_actual.clouds_all = item.clouds_all;
                    // Also store in weather_data for backward compatibility
                    point.weather_data.temperature = item.temperature;
                    point.weather_data.rainfall = item.rainfall;
                    point.weather_data.snowfall = item.snowfall;
                    point.weather_data.wind_speed = item.wind_speed;
                    point.weather_data.relative_humidity = item.relative_humidity;
                    point.weather_data.clouds_all = item.clouds_all;
                }
            });
        }

        // F2. Weather Forecast Data
        // 使用相同的時區對齊邏輯
        if (showWeatherForecast && weatherForecast && Array.isArray(weatherForecast)) {
            weatherForecast.forEach((item) => {
                const tsRaw = parseToTimestamp(item.weather_datetime);
                const ts = tsRaw !== null ? tsRaw + WEATHER_TIME_OFFSET_MS : null;

                if (ts) {
                    const point = ensurePoint(ts);
                    // Store all weather fields with source marker
                    if (!point.weather_data) {
                        point.weather_data = {};
                    }
                    if (!point.weather_data_forecast) {
                        point.weather_data_forecast = {};
                    }
                    point.weather_data_forecast.temperature = item.temperature;
                    point.weather_data_forecast.rainfall = item.rainfall;
                    point.weather_data_forecast.snowfall = item.snowfall;
                    point.weather_data_forecast.wind_speed = item.wind_speed;
                    point.weather_data_forecast.relative_humidity = item.relative_humidity;
                    point.weather_data_forecast.clouds_all = item.clouds_all;
                    // Forecast overwrites weather_data if both exist (for backward compatibility)
                    point.weather_data.temperature = item.temperature;
                    point.weather_data.rainfall = item.rainfall;
                    point.weather_data.snowfall = item.snowfall;
                    point.weather_data.wind_speed = item.wind_speed;
                    point.weather_data.relative_humidity = item.relative_humidity;
                    point.weather_data.clouds_all = item.clouds_all;
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

    }, [chartData, imbalanceData, intradayData, interconnectionData, occtoAreaData, weatherActual, weatherForecast, areaName, selectedOcctoField, selectedOcctoFields, selectedWeatherFields, showWeatherActual, showWeatherForecast, pointsWithMarkers]);

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

        const dataMin = Math.min(...allPrices);
        const dataMax = Math.max(...allPrices);
        const range = dataMax - dataMin;
        
        // Add 10% padding on both sides, but ensure min is at least 0
        const min = Math.max(0, Math.floor(dataMin - range * 0.1));
        const max = Math.ceil(dataMax + range * 0.1);
        
        // If range is too small, ensure minimum range for visibility
        if (max - min < 5) {
            const center = (min + max) / 2;
            return { min: Math.max(0, Math.floor(center - 2.5)), max: Math.ceil(center + 2.5) };
        }
        
        return { min, max };
    }, [chartData, processedChartData]);

    const imbalanceRange = useMemo(() => {
        const values = processedChartData
            .map(p => p.imbalance)
            .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

        if (values.length === 0) return { min: 0, max: 35 };
        const dataMin = Math.min(...values);
        const dataMax = Math.max(...values);
        const range = dataMax - dataMin;
        
        // 使用固定的 padding 比例，避免範圍突然變化
        const padding = range > 0 ? range * 0.12 : 3.5; // 12% padding，最小 3.5
        const min = Math.floor(dataMin - padding);
        const max = Math.ceil(dataMax + padding);
        
        // 確保最小範圍，避免視覺上的突然壓縮
        if (max - min < 7) {
            const center = (min + max) / 2;
            return { min: Math.floor(center - 3.5), max: Math.ceil(center + 3.5) };
        }
        
        return { min, max };
    }, [processedChartData]);

    const occtoRange = useMemo(() => {
        // 百分比模式使用固定的 0-100 範圍
        if (occtoChartType === 'percentage') {
            return { min: 0, max: 100 };
        }
        
        let values: number[] = [];
        if (occtoChartType === 'stacked') {
            // 在 stack 模式下，根據選中的子項目計算每個時間點的堆疊總和
            processedChartData.forEach(p => {
                if (p.occto_data) {
                    let sum = 0;
                    let hasValue = false;
                    selectedOcctoFields.forEach(field => {
                        const val = (p.occto_data as any)[field];
                        if (val !== null && val !== undefined && !isNaN(val)) {
                            sum += val;
                            hasValue = true;
                        }
                    });
                    if (hasValue) {
                        values.push(sum);
                    }
                }
            });
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
        const range = max - min;
        
        // 檢查是否有負值字段被選中（interconnection_line 和 battery_storage 可能有負值）
        const hasNegativeFields = selectedOcctoFields.has('interconnection_line') || selectedOcctoFields.has('battery_storage');
        const hasNegativeValues = min < 0;
        
        // 使用固定的 padding 比例，避免範圍突然變化
        // 對於 stack 模式，需要更大的緩衝區以防止堆疊超出
        const paddingRatio = occtoChartType === 'stacked' ? 0.12 : 0.1; // stack 模式使用 12% padding
        const padding = range > 0 ? range * paddingRatio : Math.max(Math.abs(max), Math.abs(min)) * 0.1 || 10;
        
        // 對於 stack 模式，額外確保最大值有足夠的空間（至少 5%）
        const stackExtraBuffer = occtoChartType === 'stacked' ? Math.abs(max) * 0.05 : 0;
        
        // 如果有負值，允許 min 為負數；否則確保 min 至少為 0，以便與價格軸的 0 點對齊
        let finalMin: number;
        if (hasNegativeValues || hasNegativeFields) {
            // 有負值時，允許 min 為負數，但添加 padding
            finalMin = Math.floor(min - padding);
        } else {
            // 沒有負值時，確保 min 至少為 0
            finalMin = Math.max(0, Math.floor(min - padding));
        }
        
        const finalMax = Math.ceil(max + padding + stackExtraBuffer);
        
        // 確保最小範圍，避免視覺上的突然壓縮
        if (finalMax - finalMin < 10) {
            const center = (finalMin + finalMax) / 2;
            return { min: Math.floor(center - 5), max: Math.ceil(center + 5) };
        }
        
        return { min: finalMin, max: finalMax };
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
