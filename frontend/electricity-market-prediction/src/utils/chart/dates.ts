
import { format } from 'date-fns';
import { UTCTimestamp } from 'lightweight-charts';

/**
 * Robustly parses a date string into a Unix timestamp.
 * Supports:
 * - ISO string: "2025-04-05T22:30:00" or with offset "2025-04-05T22:30:00+09:00"
 * - Space separated: "2025-04-05 22:30" (interpreted as JST for Japanese market data)
 * - Compact YYYYMMDD: "20250405" (assumes 00:00 JST)
 * - Compact YYYYMMDDHHmm: "202504052230" (JST)
 * When the string has no timezone (no Z, +, -), it is treated as JST (Asia/Tokyo) so chart data matches API.
 */
export const parseToTimestamp = (dateStr: string | null | undefined): number | null => {
    if (!dateStr) return null;

    try {
        let isoStr = dateStr;
        let needsJst = false;

        // 1. Handle "20231027" or "202310271000" (Compact format) — JST
        if (/^\d{8,}$/.test(dateStr)) {
            const y = dateStr.substring(0, 4);
            const m = dateStr.substring(4, 6);
            const d = dateStr.substring(6, 8);
            let rest = dateStr.substring(8);

            let H = '00';
            let M = '00';

            if (rest.length >= 4) { // HHmm
                H = rest.substring(0, 2);
                M = rest.substring(2, 4);
            } else if (rest.length >= 2) { // HH
                H = rest.substring(0, 2);
            }

            isoStr = `${y}-${m}-${d}T${H}:${M}:00`;
            needsJst = true;
        }
        // 2. Handle "2023-10-27 10:00" (Space separated) — JST
        else if (dateStr.includes(' ')) {
            isoStr = dateStr.replace(' ', 'T');
            needsJst = true;
        }
        // 3. ISO without timezone (e.g. "2025-04-05T22:30:00") — treat as JST for consistency
        else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateStr) && !/[Z+-]\d{2}:?\d{2}$/.test(dateStr)) {
            needsJst = true;
        }

        if (needsJst && !isoStr.endsWith('Z') && !/[-+]\d{2}:?\d{2}$/.test(isoStr)) {
            if (!/\d{2}:\d{2}:\d{2}/.test(isoStr)) isoStr = isoStr.replace(/(:\d{2})$/, '$1:00');
            isoStr = `${isoStr}+09:00`;
        }

        const date = new Date(isoStr);
        const time = date.getTime();
        return isNaN(time) ? null : time;
    } catch (e) {
        console.warn('[parseToTimestamp] Failed to parse:', dateStr);
        return null;
    }
};

/**
 * Formats a timestamp back to "YYYY-MM-DD HH:mm" for display/key usage
 */
export const formatTimestamp = (timestamp: number): string => {
    return format(new Date(timestamp), 'yyyy-MM-dd HH:mm');
};

/**
 * Converts Unix timestamp (ms) to UTCTimestamp (seconds)
 */
export const toUTCTimestamp = (timestamp: number): UTCTimestamp => {
    return Math.floor(timestamp / 1000) as UTCTimestamp;
};

/** Fixed offset in seconds for chart timezone display (library uses UTC internally; we shift so UTC = local wall clock) */
export function getTimezoneOffsetSeconds(timezone: string): number {
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

// Helper to safely format time in target timezone (Standard Intl API)
export const formatInTimezone = (timestamp: number, timezone: string, options?: Intl.DateTimeFormatOptions) => {
    const date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
    // Ensure valid timezone or fallback to Tokyo
    let effectiveTz = timezone;
    if (!effectiveTz || effectiveTz === 'undefined') effectiveTz = 'Asia/Tokyo';

    // Default options for charts
    const defaultOptions: Intl.DateTimeFormatOptions = {
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    };

    try {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: effectiveTz,
            ...(options || defaultOptions)
        }).format(date);
    } catch (e) {
        console.warn(`Timezone '${effectiveTz}' invalid. Fallback to Tokyo.`);
        return new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Tokyo',
            ...(options || defaultOptions)
        }).format(date);
    }
};
