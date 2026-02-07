
import { UTCTimestamp } from 'lightweight-charts';
import { AreaPrice, PricePrediction } from '@/types';
import { ChartDataPoint, ProcessedDataPoint } from './types';
import { parseToTimestamp, toUTCTimestamp, toChartTime } from './dates';

/**
 * Converts processedChartData to Line Series data format.
 * If timezone is provided, uses chart-time (so axis shows same as tooltip in that zone).
 */
export const convertToLineSeriesData = (
    data: ProcessedDataPoint[],
    valueExtractor: (point: ProcessedDataPoint) => number | null,
    timezone?: string
): { time: UTCTimestamp; value: number }[] => {
    const timeFn = timezone ? (ts: number) => toChartTime(ts, timezone) : toUTCTimestamp;
    return data
        .map(point => {
            const value = valueExtractor(point);
            if (value === null || value === undefined || isNaN(value)) {
                return null;
            }
            return {
                time: timeFn(point.timestamp),
                value,
            };
        })
        .filter((item): item is { time: UTCTimestamp; value: number } => item !== null);
};

/**
 * Converts processedChartData to Candlestick Series data format.
 * Only includes points that have valid intraday OHLC data.
 * If timezone is provided, uses chart-time for axis alignment.
 */
export const convertToCandlestickData = (
    data: ProcessedDataPoint[],
    timezone?: string
): { time: UTCTimestamp; open: number; high: number; low: number; close: number }[] => {
    const timeFn = timezone ? (ts: number) => toChartTime(ts, timezone) : toUTCTimestamp;
    return data
        .map(point => {
            const open = point.intraday_open;
            const close = point.intraday_close;
            const high = point.intraday_high;
            const low = point.intraday_low;

            if (open === null || open === undefined ||
                close === null || close === undefined ||
                high === null || high === undefined ||
                low === null || low === undefined) {
                return null;
            }

            return {
                time: timeFn(point.timestamp),
                open,
                high,
                low,
                close,
            };
        })
        .filter((item): item is { time: UTCTimestamp; open: number; high: number; low: number; close: number } => item !== null);
};

/**
 * Converts processedChartData to Histogram Series data format.
 * If timezone is provided, uses chart-time for axis alignment.
 */
export const convertToHistogramData = (
    data: ProcessedDataPoint[],
    valueExtractor: (point: ProcessedDataPoint) => number | null,
    baseValue?: number,
    timezone?: string
): { time: UTCTimestamp; value: number; color?: string }[] => {
    const timeFn = timezone ? (ts: number) => toChartTime(ts, timezone) : toUTCTimestamp;
    return data
        .map(point => {
            const value = valueExtractor(point);
            if (value === null || value === undefined || isNaN(value)) {
                return null;
            }
            return {
                time: timeFn(point.timestamp),
                value,
                ...(baseValue !== undefined && { base: baseValue }),
            };
        })
        .filter((item): item is { time: UTCTimestamp; value: number } => item !== null);
};

/**
 * Converts processedChartData to Area Series data format (for prediction bands).
 * If timezone is provided, uses chart-time for axis alignment.
 */
export const convertToAreaSeriesData = (
    data: ProcessedDataPoint[],
    topExtractor: (point: ProcessedDataPoint) => number | null,
    bottomExtractor: (point: ProcessedDataPoint) => number | null,
    timezone?: string
): { time: UTCTimestamp; value: number }[][] => {
    const timeFn = timezone ? (ts: number) => toChartTime(ts, timezone) : toUTCTimestamp;
    const topData: { time: UTCTimestamp; value: number }[] = [];
    const bottomData: { time: UTCTimestamp; value: number }[] = [];

    data.forEach(point => {
        const top = topExtractor(point);
        const bottom = bottomExtractor(point);
        const time = timeFn(point.timestamp);

        if (top !== null && top !== undefined && !isNaN(top)) {
            topData.push({ time, value: top });
        }
        if (bottom !== null && bottom !== undefined && !isNaN(bottom)) {
            bottomData.push({ time, value: bottom });
        }
    });

    return [topData, bottomData];
};

export const prepareChartData = (
    actualPrices: AreaPrice[],
    predictionsByModel: { [key: string]: PricePrediction[] }
): ChartDataPoint[] => {
    console.log('[prepareChartData] Starting data preparation...');

    const dataMap = new Map<number, ChartDataPoint>();

    // 1. 處理實際價格
    actualPrices.forEach((price) => {
        const datePart = price.trade_date;
        const timeCode = price.time_code;
        const hour = Math.floor((timeCode - 1) / 2);
        const minute = (timeCode - 1) % 2 === 0 ? '00' : '30';
        const timePart = `${String(hour).padStart(2, '0')}:${minute}`;

        // Helper to ensure date is YYYY-MM-DD
        const normalizeDate = (d: string) => {
            if (/^\d{8}$/.test(d)) {
                return `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
            }
            return d;
        };
        const sDatePart = normalizeDate(datePart);
        const dateTime = `${sDatePart} ${timePart}`;
        const timestamp = parseToTimestamp(dateTime);

        if (timestamp) {
            dataMap.set(timestamp, {
                dateTime: dateTime,
                timestamp: timestamp,
                date: sDatePart,
                time: timePart,
                actualPrice: price.price,
                modelPredictions: [],
                isPrediction: false
            });
        }
    });

    // 2. 處理預測價格
    Object.entries(predictionsByModel).forEach(([modelKey, predictions]) => {
        const [modelIdStr, modelName] = modelKey.split('|');
        const modelId = Number(modelIdStr) || modelIdStr;

        predictions.forEach((prediction) => {
            const datePart = prediction.trade_date;
            const timeCode = prediction.time_code;
            const hour = Math.floor((timeCode - 1) / 2);
            const minute = (timeCode - 1) % 2 === 0 ? '00' : '30';
            const timePart = `${String(hour).padStart(2, '0')}:${minute}`;

            const normalizeDate = (d: string) => {
                if (/^\d{8}$/.test(d)) {
                    return `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
                }
                return d;
            };

            const sDatePart = normalizeDate(datePart);
            const dateTime = `${sDatePart} ${timePart}`;
            const timestamp = parseToTimestamp(dateTime);

            if (timestamp) {
                if (!dataMap.has(timestamp)) {
                    dataMap.set(timestamp, {
                        dateTime: dateTime,
                        timestamp: timestamp,
                        date: sDatePart,
                        time: timePart,
                        actualPrice: null,
                        modelPredictions: [],
                        isPrediction: true
                    });
                }

                const point = dataMap.get(timestamp)!;
                point.modelPredictions.push({
                    modelId,
                    modelName,
                    predictedPrice: prediction.price_50,
                    predictedPrice5: prediction.price_5,
                    predictedPrice95: prediction.price_95
                });
            }
        });
    });

    // 3. 轉換 Map 為 Array 並排序
    const result = Array.from(dataMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    return result;
};
