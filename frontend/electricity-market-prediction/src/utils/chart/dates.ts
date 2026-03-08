/**
 * 日期與時間處理共用工具
 * Shared date and time utilities.
 *
 * 提供日期字串解析、時區轉換（JST/UTC）與格式化等功能。
 * Provides date string parsing, timezone conversion (JST/UTC) and formatting.
 */

import { format } from 'date-fns';
import { UTCTimestamp } from 'lightweight-charts';

/**
 * 安全地將日期字串解析為 Unix timestamp，並統一處理 JST 時區。
 * Robustly parses a date string into a Unix timestamp, ensuring JST timezone.
 *
 * 支援格式 / Supports:
 * - ISO string: "2025-04-05T22:30:00" or with offset "2025-04-05T22:30:00+09:00"
 * - Space separated: "2025-04-05 22:30" (interpreted as JST)
 * - Compact YYYYMMDD: "20250405" (assumes 00:00 JST)
 * - Compact YYYYMMDDHHmm: "202504052230" (JST)
 * 
 * 若字串無時區標示，預設視為 JST (Asia/Tokyo)。
 * When the string has no timezone, it is treated as JST (Asia/Tokyo).
 */
export const normalizeWeatherDatetimeToJST = (dateStr: string | null | undefined): string | null | undefined => {
    if (!dateStr) return dateStr;

    // Format correct UTC baseline safely into mapped JST 
    if (dateStr.includes('+09:00') || dateStr.includes('Z')) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return formatDateTimeJST(date.getTime());
        }
    }

    const clean = dateStr.replace(/Z$/, '').replace(/[-+]\d{2}:?\d{2}$/, '');
    const match = clean.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
    if (match) {
        return `${match[1]} ${match[2]}`;
    }
    return clean;
};

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
 * Converts a local Date object to a JST timestamp (ms).
 * Useful for aligning chart visible ranges when the Date source is local browser time (like startDate/endDate states).
 */
export const dateToJstTimestamp = (date: Date | null): number | null => {
    if (!date) return null;
    try {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        return parseToTimestamp(`${y}-${m}-${d} ${hh}:${mm}:${ss}`);
    } catch (e) {
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

export function formatDateTimeJST(timestamp: number): string {
    const tzOffset = 9 * 60 * 60 * 1000; // +09:00
    const d = new Date(timestamp + tzOffset);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const h = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
}

