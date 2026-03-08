
import type { UTCTimestamp, DeepPartial, ChartOptions } from 'lightweight-charts';
import { ChartColors } from '../chart-colors';
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
        mode: 0, // Normal
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

// ---------------------------------------------------------------------------
// LWC 圖表選項工廠 / LWC chart option factories
// ---------------------------------------------------------------------------

/**
 * 建立精簡版 LWC 圖表選項（無軸、無十字準線）。
 * Creates minimal LWC chart options for sparklines and preview thumbnails.
 *
 * 適用於小型預覽圖，如 AreaPricePreviewGrid 中的 MiniAreaChart。
 * Suitable for small preview charts like MiniAreaChart in AreaPricePreviewGrid.
 */
export const createMinimalChartOptions = (
    darkMode: boolean
): DeepPartial<ChartOptions> => ({
    layout: {
        background: { type: 'solid' as any, color: 'transparent' },
        textColor: darkMode ? '#9ca3af' : '#6b7280',
        fontFamily: 'inherit',
        attributionLogo: false,
    },
    grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
    },
    rightPriceScale: { visible: false },
    leftPriceScale: { visible: false },
    timeScale: { visible: false },
    handleScroll: { vertTouchDrag: false, horzTouchDrag: false },
    handleScale: { pinch: false, axisPressedMouseMove: false },
});

/**
 * 建立完整圖表選項（含 grid、crosshair、scales）。
 * Creates full LWC chart options with grid, crosshair, and price/time scales.
 *
 * 使用 `createChartLayout` 與 `createCrosshairOptions` 共用邏輯。
 * 可透過 `overrides` 覆寫任何選項（例如自訂 scaleMargins、crosshair 等）。
 *
 * Uses shared `createChartLayout` and `createCrosshairOptions` logic.
 * Pass `overrides` to customise any option (e.g. custom scaleMargins, crosshair).
 */
export const createFullChartOptions = (
    colors: ChartColors,
    darkMode: boolean,
    overrides: DeepPartial<ChartOptions> = {}
): DeepPartial<ChartOptions> => {
    const defaults: DeepPartial<ChartOptions> = {
        layout: createChartLayout(colors, darkMode),
        grid: {
            vertLines: { color: colors.grid, style: 3 as any }, // LineStyle.Dotted = 3
            horzLines: { color: colors.grid, style: 3 as any },
        },
        rightPriceScale: {
            borderColor: colors.grid,
            scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
            borderColor: colors.grid,
            timeVisible: true,
            secondsVisible: false,
        },
        crosshair: createCrosshairOptions(colors),
    };

    // 淺層合併各子物件 / Shallow-merge each sub-object
    return {
        ...defaults,
        ...overrides,
        layout: { ...defaults.layout, ...overrides.layout },
        grid: { ...defaults.grid, ...overrides.grid },
        rightPriceScale: { ...defaults.rightPriceScale, ...overrides.rightPriceScale },
        leftPriceScale: { ...defaults.leftPriceScale, ...overrides.leftPriceScale },
        timeScale: { ...defaults.timeScale, ...overrides.timeScale },
        crosshair: { ...defaults.crosshair, ...overrides.crosshair },
    };
};
