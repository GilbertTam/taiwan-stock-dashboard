import { useMemo } from 'react';
import { ChartDataPoint, ModelPrediction, generateColor, hashString, parseToTimestamp, formatTimestamp, normalizeWeatherDatetimeToJST } from '@/utils/chartUtils';
import { ImbalanceData, IntradayData, InterconnectionFlow, OcctoAreaData, WeatherData, BatteryData, BidPlanData, TdgcData } from '@/types';

/**
 * Extract an OCCTO field value from an API item, supporting both:
 * - Flat structure: { nuclear_power: 1200, area_demand: 5000, ... }
 * - Nested structure: { generation: { nuclear_power: 1200, ... }, demand: 5000 }
 */
function getOcctoValue(item: any, field: string): number | null {
    if (!item) return null;
    // 1. Try flat access (e.g. item.nuclear_power)
    const flat = item[field];
    if (flat != null && typeof flat === 'number') return flat;
    // 2. Special case: area_demand → item.demand (nested schema)
    if (field === 'area_demand' && typeof item.demand === 'number') return item.demand;
    // 3. Try nested: item.generation[field]
    const fromGen = item.generation?.[field];
    if (fromGen != null && typeof fromGen === 'number') return fromGen;
    return null;
}

interface UseChartDataProps {
    chartData: ChartDataPoint[];
    imbalanceData: ImbalanceData[];
    intradayData: IntradayData[];
    interconnectionData: InterconnectionFlow[];
    occtoAreaData: OcctoAreaData[];
    batteryData?: BatteryData[];
    bidPlansData?: BidPlanData[];
    selectedBidPlanCategories?: Set<string>;
    tdgcData?: TdgcData[];
    selectedTdgcCategories?: Set<string>;
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
    occtoChartType: 'stacked' | 'area';
    selectedOcctoField: string;
    selectedOcctoFields: Set<string>;
    selectedWeatherFields?: Set<string>;
    showWeatherActual?: boolean;
    showWeatherForecast?: boolean;
    weatherHeightByField?: Record<string, string>;
}

export const useChartData = ({
    chartData,
    imbalanceData,
    intradayData,
    interconnectionData,
    occtoAreaData,
    batteryData = [],
    bidPlansData = [],
    selectedBidPlanCategories = new Set<string>(),
    tdgcData = [],
    selectedTdgcCategories = new Set<string>(),
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
    showWeatherForecast = false,
    weatherHeightByField = {},
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

        // A. Base Chart Data (spot + predictions)
        if (chartData && Array.isArray(chartData)) {
            chartData.forEach(p => {
                const ts = p?.timestamp;
                if (typeof ts === 'number' && !isNaN(ts)) {
                    dataMap.set(ts, { ...p });
                }
            });
        }

        // B. Imbalance Data
        if (imbalanceData && Array.isArray(imbalanceData)) {
            const targetArea = areaName?.toLowerCase();
            imbalanceData.forEach(item => {
                // Check if this record belongs to the selected area
                // Backend returns English area names (e.g., "hokkaido")
                if (item.area && item.area.toLowerCase() === targetArea) {
                    const ts = parseToTimestamp(item.datetime);
                    if (ts) {
                        const point = ensurePoint(ts);

                        // Map quantity
                        const val = item.imbalance_quantity;
                        point.imbalance = (typeof val === 'number' && !isNaN(val)) ? val : null;

                        // Map rates
                        const surplus = item.imbalance_surplus_rate;
                        point.imbalance_surplus_rate = (typeof surplus === 'number' && !isNaN(surplus)) ? surplus : null;

                        const deficit = item.imbalance_deficit_rate;
                        point.imbalance_deficit_rate = (typeof deficit === 'number' && !isNaN(deficit)) ? deficit : null;
                    }
                }
            });
        }

        // C. Intraday Data
        if (intradayData && Array.isArray(intradayData)) {
            intradayData.forEach(item => {
                const ts = parseToTimestamp(item.datetime);
                if (ts) {
                    const point = ensurePoint(ts);
                    point.intraday_average = item.average_price;
                    point.intraday_open = item.opening_price;
                    point.intraday_close = item.closing_price;
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

        // D. Interconnection Data (occto_inter: 計畫流量、實際流量、可用容量、餘裕等)
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
                    point.interconnection_actual_flow = (typeof (item as any).actual_flow === 'number') ? (item as any).actual_flow : null;
                    point.interconnection_forward_available_capacity = (typeof (item as any).forward_available_capacity === 'number') ? (item as any).forward_available_capacity : null;
                    point.interconnection_reverse_available_capacity = (typeof (item as any).reverse_available_capacity === 'number') ? (item as any).reverse_available_capacity : null;
                    point.interconnection_forward_margin = (typeof (item as any).forward_margin === 'number') ? (item as any).forward_margin : null;
                    point.interconnection_reverse_margin = (typeof (item as any).reverse_margin === 'number') ? (item as any).reverse_margin : null;
                }
            });
        }

        // E. Battery Data (eflow battery_data: aggregate by event_time)
        if (batteryData && batteryData.length > 0) {
            const byTs: Record<number, { spot: number[]; intraday: number[]; primary: number[]; soc: number[]; actualSoc: number[] }> = {};
            batteryData.forEach(item => {
                const ts = parseToTimestamp(item.event_time);
                if (!ts) return;
                if (!byTs[ts]) byTs[ts] = { spot: [], intraday: [], primary: [], soc: [], actualSoc: [] };
                if (typeof item.spot_value === 'number') byTs[ts].spot.push(item.spot_value);
                if (typeof item.intraday_value === 'number') byTs[ts].intraday.push(item.intraday_value);
                if (typeof item.primary_value === 'number') byTs[ts].primary.push(item.primary_value);
                if (typeof item.soc_kwh === 'number') byTs[ts].soc.push(item.soc_kwh);
                if (typeof item.actual_soc_kwh === 'number') byTs[ts].actualSoc.push(item.actual_soc_kwh);
            });
            Object.keys(byTs).forEach(tsStr => {
                const ts = Number(tsStr);
                const point = ensurePoint(ts);
                const g = byTs[ts];
                point.battery_spot_value = g.spot.length ? g.spot.reduce((a, b) => a + b, 0) : null;
                point.battery_intraday_value = g.intraday.length ? g.intraday.reduce((a, b) => a + b, 0) : null;
                point.battery_primary_value = g.primary.length ? g.primary.reduce((a, b) => a + b, 0) : null;
                point.battery_soc_kwh = g.soc.length ? g.soc.reduce((a, b) => a + b, 0) / g.soc.length : null;
                point.battery_actual_soc_kwh = g.actualSoc.length ? g.actualSoc.reduce((a, b) => a + b, 0) / g.actualSoc.length : null;
            });
        }

        // E2. Bid Plans Data (aggregate by event_time and commodity_category, filtered by selected categories)
        const filteredBidPlans = selectedBidPlanCategories.size > 0
            ? bidPlansData.filter(item => selectedBidPlanCategories.has(item.commodity_category))
            : bidPlansData;

        if (filteredBidPlans && filteredBidPlans.length > 0) {
            // 按 commodity_category 分组处理
            const byCategory: Record<string, BidPlanData[]> = {};
            filteredBidPlans.forEach(item => {
                const cat = item.commodity_category || 'spot';
                if (!byCategory[cat]) byCategory[cat] = [];
                byCategory[cat].push(item);
            });

            // 为每个 category 分别处理数据
            Object.keys(byCategory).forEach(category => {
                const categoryData = byCategory[category];
                const byTs: Record<number, { buyPrice: number[]; buyVolume: number[]; sellPrice: number[]; sellVolume: number[] }> = {};

                categoryData.forEach(item => {
                    const ts = parseToTimestamp(item.event_time);
                    if (!ts) return;
                    if (!byTs[ts]) byTs[ts] = { buyPrice: [], buyVolume: [], sellPrice: [], sellVolume: [] };
                    if (typeof item.bid_buy_price === 'number') byTs[ts].buyPrice.push(item.bid_buy_price);
                    if (typeof item.bid_buy_volume === 'number') byTs[ts].buyVolume.push(item.bid_buy_volume);
                    if (typeof item.bid_sell_price === 'number') byTs[ts].sellPrice.push(item.bid_sell_price);
                    if (typeof item.bid_sell_volume === 'number') byTs[ts].sellVolume.push(item.bid_sell_volume);
                });

                // 根据 category 设置不同的字段名
                const prefix = category === 'spot' ? 'bid_spot' : category === 'intraday' ? 'bid_intraday' : `bid_${category}`;

                Object.keys(byTs).forEach(tsStr => {
                    const ts = Number(tsStr);
                    const point = ensurePoint(ts);
                    const g = byTs[ts];
                    (point as any)[`${prefix}_buy_price`] = g.buyPrice.length ? g.buyPrice.reduce((a, b) => a + b, 0) / g.buyPrice.length : null;
                    (point as any)[`${prefix}_buy_volume`] = g.buyVolume.length ? g.buyVolume.reduce((a, b) => a + b, 0) : null;
                    (point as any)[`${prefix}_sell_price`] = g.sellPrice.length ? g.sellPrice.reduce((a, b) => a + b, 0) / g.sellPrice.length : null;
                    (point as any)[`${prefix}_sell_volume`] = g.sellVolume.length ? g.sellVolume.reduce((a, b) => a + b, 0) : null;
                });
            });
        }

        // E3. TDGC Data (group by commodity_category, then aggregate by datetime — like bid plans)
        // Process ALL fields unconditionally (like interconnection/battery) so that
        // toggling selectedTdgcFields doesn't trigger a full processedChartData recompute.
        // Field filtering happens downstream in useChartDataTransformers.
        const filteredTdgc = selectedTdgcCategories.size > 0
            ? tdgcData.filter(item => selectedTdgcCategories.has(item.commodity_category))
            : tdgcData;

        if (filteredTdgc && filteredTdgc.length > 0) {
            // Group by commodity_category
            const byCategory: Record<string, TdgcData[]> = {};
            filteredTdgc.forEach(item => {
                const cat = item.commodity_category;
                if (!byCategory[cat]) byCategory[cat] = [];
                byCategory[cat].push(item);
            });

            const tdgcAllFields: { key: string; shortKey: string; isMwh: boolean }[] = [
                { key: 'corrected_unit_price_ave', shortKey: 'corrected_price_ave', isMwh: false },
                { key: 'tso_price_ave',            shortKey: 'tso_price_ave',       isMwh: false },
                { key: 'total_contract_quantity',  shortKey: 'contract_qty',        isMwh: true },
                { key: 'reserve_requirement',      shortKey: 'reserve_req',         isMwh: true },
            ];

            Object.keys(byCategory).forEach(category => {
                const categoryData = byCategory[category];
                const byTs: Record<number, Record<string, number[]>> = {};

                categoryData.forEach(item => {
                    const ts = parseToTimestamp(item.datetime);
                    if (!ts) return;
                    if (!byTs[ts]) byTs[ts] = {};
                    tdgcAllFields.forEach(({ key }) => {
                        const value = (item as any)[key];
                        if (typeof value === 'number' && !isNaN(value)) {
                            if (!byTs[ts][key]) byTs[ts][key] = [];
                            byTs[ts][key].push(value);
                        }
                    });
                });

                Object.keys(byTs).forEach(tsStr => {
                    const ts = Number(tsStr);
                    const point = ensurePoint(ts);
                    tdgcAllFields.forEach(({ key, shortKey, isMwh }) => {
                        const values = byTs[ts][key];
                        if (values && values.length > 0) {
                            const avg = values.reduce((a, b) => a + b, 0) / values.length;
                            const pointFieldKey = `tdgc_${category}_${shortKey}`;
                            (point as any)[pointFieldKey] = isMwh ? avg / 1000 : avg;
                        }
                    });
                });
            });
        }

        // F. Occto Data
        if (occtoAreaData && Array.isArray(occtoAreaData)) {
            occtoAreaData.forEach(item => {
                const ts = parseToTimestamp(item.datetime);
                if (ts) {
                    const point = ensurePoint(ts);
                    point.occto_data = item;
                    // Keep backward compatibility with selectedOcctoField
                    point.occto_value = getOcctoValue(item, selectedOcctoField);
                    // Store all selected fields for multi-field rendering
                    if (!point.occto_values) {
                        point.occto_values = {};
                    }
                    selectedOcctoFields.forEach(field => {
                        point.occto_values![field] = getOcctoValue(item, field);
                    });
                }
            });
        }

        // G. Weather Actual Data
        // Helper: look up a weather field with height-aware fallback
        const resolveField = (item: any, normalizedKey: string, defaultSuffix: string): any => {
            const height = weatherHeightByField[normalizedKey] || defaultSuffix;
            const key = `${normalizedKey}_${height}`;
            const value = item[key];
            if (value !== undefined && value !== null) return value;
            // Fallback to the default suffix if the selected height has no data
            if (height !== defaultSuffix) {
                return item[`${normalizedKey}_${defaultSuffix}`] ?? null;
            }
            return null;
        };

        if (showWeatherActual && weatherActual && Array.isArray(weatherActual)) {
            weatherActual.forEach((item) => {
                const ts = parseToTimestamp(normalizeWeatherDatetimeToJST(item.datetime));

                if (ts) {
                    const point = ensurePoint(ts);
                    if (!point.weather_data_actual) point.weather_data_actual = {};

                    // Dynamically extract all selected fields
                    selectedWeatherFields?.forEach(fieldKey => {
                        const weatherItem = item as any;
                        const targetData = point.weather_data_actual as any;

                        // 1. Try exact match (e.g. daily fields like temperature_2m_max)
                        if (weatherItem[fieldKey] !== undefined && weatherItem[fieldKey] !== null) {
                            targetData[fieldKey] = weatherItem[fieldKey];
                            return;
                        }

                        // 2. Try height-suffixed match (e.g. temperature_2m, soil_temperature_0_to_7cm)
                        const scalePattern = /_(\d+m?|0_to_7cm|7_to_28cm|28_to_100cm|100_to_255cm|0_to_100cm|max|min|mean|sum)$/;
                        const match = fieldKey.match(scalePattern);
                        if (match) {
                            const base = fieldKey.replace(scalePattern, '');
                            const height = match[1];
                            const val = weatherItem[`${base}_${height}`];
                            if (val !== undefined && val !== null) {
                                targetData[fieldKey] = val;
                                return;
                            }
                        }

                        // 3. Fallback for generic fields (e.g. 'temperature' -> 'temperature_2m')
                        const fallbacks: Record<string, string> = {
                            'temperature': 'temperature_2m',
                            'wind_speed': 'wind_speed_10m',
                            'relative_humidity': 'relative_humidity_2m',
                            'precipitation': 'precipitation',
                            'rainfall': 'precipitation',
                            'cloud_cover': 'cloud_cover',
                        };
                        const fallbackKey = fallbacks[fieldKey];
                        if (fallbackKey && weatherItem[fallbackKey] !== undefined) {
                            targetData[fieldKey] = weatherItem[fallbackKey];
                        }
                    });
                }
            });
        }

        // G2. Weather Forecast Data
        if (showWeatherForecast && weatherForecast && Array.isArray(weatherForecast)) {
            weatherForecast.forEach((item) => {
                const ts = parseToTimestamp(normalizeWeatherDatetimeToJST(item.datetime));

                if (ts) {
                    const point = ensurePoint(ts);
                    if (!point.weather_data_forecast) point.weather_data_forecast = {};

                    selectedWeatherFields?.forEach(fieldKey => {
                        const weatherItem = item as any;
                        const targetData = point.weather_data_forecast as any;

                        // 1. Try exact match
                        if (weatherItem[fieldKey] !== undefined && weatherItem[fieldKey] !== null) {
                            targetData[fieldKey] = weatherItem[fieldKey];
                            return;
                        }

                        // 2. Try height-suffixed match
                        const match = fieldKey.match(/^(.+?)_(\d+m?)$/);
                        if (match) {
                            const base = match[1];
                            const height = match[2];
                            const val = weatherItem[`${base}_${height}`];
                            if (val !== undefined && val !== null) {
                                targetData[fieldKey] = val;
                                return;
                            }
                        }

                        // 3. Fallback
                        const fallbacks: Record<string, string> = {
                            'temperature': 'temperature_2m',
                            'wind_speed': 'wind_speed_10m',
                            'relative_humidity': 'relative_humidity_2m',
                            'precipitation': 'precipitation',
                            'rainfall': 'precipitation',
                            'cloud_cover': 'cloud_cover',
                        };
                        const fallbackKey = fallbacks[fieldKey];
                        if (fallbackKey && weatherItem[fallbackKey] !== undefined) {
                            targetData[fieldKey] = weatherItem[fallbackKey];
                        }
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
                modelDifferences[modelKey] = (point.actualPrice !== null && mp.predictedPrice != null) ? mp.predictedPrice - point.actualPrice : null;
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

    }, [chartData, imbalanceData, intradayData, interconnectionData, occtoAreaData, batteryData, bidPlansData, selectedBidPlanCategories, tdgcData, selectedTdgcCategories, weatherActual, weatherForecast, weatherHeightByField, areaName, selectedOcctoField, selectedOcctoFields, selectedWeatherFields, showWeatherActual, showWeatherForecast, pointsWithMarkers]);

    // Ranges
    const priceRange = useMemo(() => {
        if (chartData.length === 0) return { min: 0, max: 35 };
        const allPrices: number[] = [];

        // From chartData (faster to loop logic)
        processedChartData.forEach(p => {
            if (typeof p.actualPrice === 'number') allPrices.push(p.actualPrice);
            p.modelPredictions.forEach(mp => {
                if (mp.predictedPrice != null && !isNaN(mp.predictedPrice)) allPrices.push(mp.predictedPrice);
                if (mp.predictedPrice5 != null && !isNaN(mp.predictedPrice5)) allPrices.push(mp.predictedPrice5);
                if (mp.predictedPrice95 != null && !isNaN(mp.predictedPrice95)) allPrices.push(mp.predictedPrice95);
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
        // OCCTO is always stacked bar mode - calculate sum for each time point
        let values: number[] = [];
        processedChartData.forEach(p => {
            if (p.occto_data) {
                let sum = 0;
                let hasValue = false;
                selectedOcctoFields.forEach(field => {
                    const val = getOcctoValue(p.occto_data, field);
                    if (val !== null && !isNaN(val)) {
                        sum += val;
                        hasValue = true;
                    }
                });
                if (hasValue) {
                    values.push(sum);
                }
            }
        });

        if (values.length === 0) return { min: 0, max: 100 };

        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;

        // Check if negative fields are selected
        const hasNegativeFields = selectedOcctoFields.has('interconnection_line') || selectedOcctoFields.has('battery_storage');
        const hasNegativeValues = min < 0;

        // Stack mode uses 12% padding
        const paddingRatio = 0.12;
        const padding = range > 0 ? range * paddingRatio : Math.max(Math.abs(max), Math.abs(min)) * 0.1 || 10;

        // Extra 5% buffer for stacked maximum
        const stackExtraBuffer = Math.abs(max) * 0.05;

        // If negative values exist, allow min to be negative
        let finalMin: number;
        if (hasNegativeValues || hasNegativeFields) {
            finalMin = Math.floor(min - padding);
        } else {
            finalMin = Math.max(0, Math.floor(min - padding));
        }

        const finalMax = Math.ceil(max + padding + stackExtraBuffer);

        // Ensure minimum range
        if (finalMax - finalMin < 10) {
            const center = (finalMin + finalMax) / 2;
            return { min: Math.floor(center - 5), max: Math.ceil(center + 5) };
        }

        return { min: finalMin, max: finalMax };
    }, [processedChartData, selectedOcctoFields]);

    return {
        modelColorMap,
        modelMAEs,
        processedChartData,
        priceRange,
        imbalanceRange,
        occtoRange
    };
};
