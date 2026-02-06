/**
 * Lightweight Charts Helper Functions
 * Provides reusable configuration functions and data converters for Lightweight Charts
 */

import { UTCTimestamp } from 'lightweight-charts';
import { ChartDataPoint, ModelPrediction, formatInTimezone } from './chartUtils';
import { ChartColors } from './chartColors';
import { startOfDay } from 'date-fns';

// Type for processed chart data point (from PriceChartContext)
export interface ProcessedDataPoint {
    timestamp: number;
    actualPrice: number | null;
    modelPredictions: ModelPrediction[];
    modelDifferences?: Record<string, number | null>;
    actualDelta?: number | null;
    imbalance?: number | null;
    intraday_average?: number | null;
    intraday_open?: number | null;
    intraday_close?: number | null;
    intraday_high?: number | null;
    intraday_low?: number | null;
    interconnection_flow_diff?: number | null;
    occto_data?: Record<string, number | null> | null;
    occto_values?: Record<string, number | null>;
    weather_data_actual?: Record<string, number | null>;
    weather_data_forecast?: Record<string, number | null>;
    [key: string]: any;
}

/**
 * Converts Unix timestamp (ms) to UTCTimestamp (seconds)
 */
export const toUTCTimestamp = (timestamp: number): UTCTimestamp => {
    return Math.floor(timestamp / 1000) as UTCTimestamp;
};

/** Fixed offset in seconds for chart timezone display (library uses UTC internally; we shift so UTC = local wall clock) */
function getTimezoneOffsetSeconds(timezone: string): number {
    if (timezone === 'Asia/Taipei') return 8 * 3600;
    if (timezone === 'UTC') return 0;
    return 9 * 3600; // Asia/Tokyo default
}

/**
 * Convert actual UTC timestamp to "chart time" so the library's UTC-based axis shows the desired timezone.
 * Official approach: adjust data time by +offset so UTC display equals local wall clock (e.g. JST 00:00 shows as 00:00).
 */
export function toChartTime(timestampMs: number, timezone: string): UTCTimestamp {
    const utcSec = Math.floor(timestampMs / 1000);
    return (utcSec + getTimezoneOffsetSeconds(timezone)) as UTCTimestamp;
}

/** Convert chart time (seconds) back to actual timestamp (ms) for crosshair → data lookup. */
export function fromChartTime(chartTimeSec: number, timezone: string): number {
    const offset = getTimezoneOffsetSeconds(timezone);
    return (chartTimeSec - offset) * 1000;
}

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

/**
 * Creates mark area data for alternating day shading
 * Returns array of time ranges for background shading
 */
export const createMarkAreaRanges = (
    timestamps: number[]
): { from: UTCTimestamp; to: UTCTimestamp }[] => {
    if (timestamps.length === 0) return [];

    const ranges: { from: UTCTimestamp; to: UTCTimestamp }[] = [];
    const currentStart = timestamps[0];
    const endTimestamp = timestamps[timestamps.length - 1];
    let iterTime = startOfDay(new Date(currentStart)).getTime();
    const dayMillis = 24 * 60 * 60 * 1000;
    let dayIndex = 0;

    while (iterTime < endTimestamp) {
        if (dayIndex % 2 !== 0) {
            ranges.push({
                from: toUTCTimestamp(Math.max(iterTime, currentStart)),
                to: toUTCTimestamp(Math.min(iterTime + dayMillis, endTimestamp)),
            });
        }
        iterTime += dayMillis;
        dayIndex++;
    }

    return ranges;
};

/**
 * Creates chart layout options based on theme
 */
export const createChartLayout = (
    colors: ChartColors,
    darkMode: boolean
): {
    background: { color: string };
    textColor: string;
    fontSize: number;
} => {
    return {
        background: {
            color: 'transparent',
        },
        textColor: colors.text,
        fontSize: 11,
    };
};

/**
 * Creates price scale options
 */
export const createPriceScaleOptions = (options: {
    position?: 'left' | 'right';
    scaleMargins?: { top: number; bottom: number };
    autoScale?: boolean;
    visible?: boolean;
    entireTextOnly?: boolean;
}): any => {
    return {
        position: options.position || 'right',
        scaleMargins: options.scaleMargins || { top: 0.1, bottom: 0.1 },
        autoScale: options.autoScale !== false,
        visible: options.visible !== false,
        entireTextOnly: options.entireTextOnly || false,
    };
};

/**
 * Creates time scale options
 */
export const createTimeScaleOptions = (options: {
    visible?: boolean;
    timeVisible?: boolean;
    secondsVisible?: boolean;
}): any => {
    return {
        visible: options.visible !== false,
        timeVisible: options.timeVisible !== false,
        secondsVisible: options.secondsVisible || false,
    };
};

/**
 * Creates crosshair options
 */
export const createCrosshairOptions = (
    colors: ChartColors
): any => {
    return {
        mode: 1, // Normal
        vertLine: {
            color: colors.text,
            width: 1,
            style: 2, // Dashed - dotted line at mouse position
            labelBackgroundColor: colors.tooltipHeaderBg,
        },
        horzLine: {
            color: colors.text,
            width: 1,
            style: 2, // Dashed - dotted line at mouse position
            labelBackgroundColor: colors.tooltipHeaderBg,
        },
    };
};

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
