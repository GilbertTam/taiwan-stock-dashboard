
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
            if (value === null || value === undefined) return null;
            const num = Number(value);
            if (isNaN(num)) return null;
            return {
                time: timeFn(point.timestamp),
                value: num,
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

    // Helper to ensure date is YYYY-MM-DD (handles YYYYMMDD, YYYY-MM-DD, or ISO with T)
    const normalizeDate = (d: string) => {
        if (!d) return d;
        const s = String(d).trim();
        if (/^\d{8}$/.test(s)) {
            return `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
        }
        if (s.includes('T')) return s.split('T')[0].substring(0, 10);
        return s.substring(0, 10);
    };

    const toNum = (v: unknown): number | null => {
        if (v == null) return null;
        const n = Number(v);
        return isNaN(n) ? null : n;
    };

    // 1. 處理實際價格
    actualPrices.forEach((price) => {
        const datePart = price.trade_date;
        const timeCode = Number(price.time_code) || 0;
        if (!timeCode || timeCode < 1 || timeCode > 48) return;
        const hour = Math.floor((timeCode - 1) / 2);
        const minute = (timeCode - 1) % 2 === 0 ? 0 : 30;
        const timePart = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const sDatePart = normalizeDate(datePart);
        const dateTime = `${sDatePart} ${timePart}`;
        const timestamp = parseToTimestamp(dateTime);

        if (timestamp) {
            const actualPrice = toNum(price.price);
            dataMap.set(timestamp, {
                dateTime: dateTime,
                timestamp: timestamp,
                date: sDatePart,
                time: timePart,
                actualPrice: actualPrice,
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
            const timeCode = Number(prediction.time_code) || 0;
            if (!timeCode || timeCode < 1 || timeCode > 48) return;
            const hour = Math.floor((timeCode - 1) / 2);
            const minute = (timeCode - 1) % 2 === 0 ? 0 : 30;
            const timePart = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
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
                    predictedPrice: toNum(prediction.price_50) ?? 0,
                    predictedPrice5: toNum(prediction.price_5) ?? undefined,
                    predictedPrice95: toNum(prediction.price_95) ?? undefined
                });
            }
        });
    });

    // 3. 轉換 Map 為 Array 並排序
    const result = Array.from(dataMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    return result;
};
