/**
 * 氣象圖表資料共用工具
 * Shared weather chart data utilities.
 *
 * 統一處理：
 *   1. 氣象時間字串正規化與時間戳轉換
 *   2. 新舊 API 欄位對應（temperature_2m / temperature 等）
 *
 * Centralises:
 *   1. Weather datetime normalisation → timestamp conversion
 *   2. Old/new API field mapping (temperature_2m / temperature, etc.)
 */

/**
 * 氣象圖表資料處理共用工具
 * Shared weather chart data processing utilities.
 * 
 * 提供氣象資料的時間標準化、欄位映射以及資料轉換功能。
 * Provides utilities for standardizing weather timestamps, mapping fields, and data conversion.
 */
import { format } from 'date-fns';
import { parseToTimestamp, normalizeWeatherDatetimeToJST } from './dates';

// ---------------------------------------------------------------------------
// 1. 時間正規化 / Datetime normalisation
// ---------------------------------------------------------------------------

/**
 * 正規化氣象時間並轉為毫秒 timestamp。
 * Normalise a weather datetime string and convert it to a millisecond timestamp.
 *
 * 封裝 `parseToTimestamp(normalizeWeatherDatetimeToJST(dateStr))`，避免各 hook 重複撰寫。
 * Wraps `parseToTimestamp(normalizeWeatherDatetimeToJST(dateStr))` to avoid duplication.
 *
 * @param dateStr - 氣象 API 回傳的時間字串 / datetime string from weather API
 * @returns 毫秒 timestamp 或 null / millisecond timestamp or null
 */
export function normalizeWeatherItemToTimestamp(dateStr: string | null | undefined): number | null {
    return parseToTimestamp(normalizeWeatherDatetimeToJST(dateStr));
}

/**
 * 正規化氣象時間為 ISO key，用於 Map 去重。
 * Normalise a weather datetime string to an ISO key for Map de-duplication.
 *
 * @param dateStr - 時間字串 / datetime string
 * @returns ISO 格式的 key 字串 / ISO key string
 */
export function normalizeWeatherDatetimeToKey(dateStr: string): string {
    if (!dateStr) return '';
    const ts = normalizeWeatherItemToTimestamp(dateStr);
    return ts ? new Date(ts).toISOString() : dateStr;
}

// ---------------------------------------------------------------------------
// 2. 欄位對應 / Field mapping
// ---------------------------------------------------------------------------

/**
 * 統一處理新舊氣象欄位對應，回傳圖表通用欄位。
 * Unify old/new weather field names and return chart-friendly field values.
 *
 * 處理的欄位對應：
 * - temperature_2m / temperature
 * - precipitation / rainfall
 * - wind_speed_10m / wind_speed
 * - relative_humidity_2m / relative_humidity
 * - cloud_cover / clouds_all
 * - snowfall（無替代欄位）
 *
 * @param item - 原始氣象 API 資料物件 / raw weather API data object
 */
export function mapWeatherFieldsToChart(item: any): {
    temperature: number | null;
    rainfall: number | null;
    snowfall: number | null;
    windSpeed: number | null;
    humidity: number | null;
    cloudCover: number | null;
} {
    const pick = (a: any, b: any): number | null => {
        if (a !== null && a !== undefined) return a;
        if (b !== null && b !== undefined) return b;
        return null;
    };

    return {
        temperature: pick(item.temperature_2m, item.temperature),
        rainfall: pick(item.precipitation, item.rainfall),
        snowfall: item.snowfall ?? null,
        windSpeed: pick(item.wind_speed_10m, item.wind_speed),
        humidity: pick(item.relative_humidity_2m, item.relative_humidity),
        cloudCover: pick(item.cloud_cover, item.clouds_all),
    };
}
