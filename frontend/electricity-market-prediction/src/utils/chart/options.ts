
import { UTCTimestamp } from 'lightweight-charts';
import { ChartColors } from '../chartColors';
import { startOfDay } from 'date-fns';
import { toUTCTimestamp } from './dates';

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
    attributionLogo: false;
} => {
    return {
        background: {
            color: 'transparent',
        },
        textColor: colors.text,
        fontSize: 11,
        attributionLogo: false,
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
