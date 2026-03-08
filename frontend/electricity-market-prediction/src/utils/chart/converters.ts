/**
 * 圖表資料轉換共用工具
 * Shared data conversion utilities for charts.
 *
 * 提供 API 回傳資料與 Lightweight Charts / ECharts 所需格式之間的轉換。
 * Provides conversion between API response formats and Lightweight Charts/ECharts formats.
 */

import { UTCTimestamp } from 'lightweight-charts';
import { AreaPrice, PricePrediction } from '@/types';
import { WeatherData } from '@/types/external';
import { ChartDataPoint, ProcessedDataPoint } from './types';
import { parseToTimestamp, toUTCTimestamp, toChartTime } from './dates';

/**
 * 氣象資料解析結果介面。
 * Result of weather data parsing operation.
 * 包含成功狀態、解析後的資料或錯誤訊息。
 * Contains success status, parsed data or an error message.
 */
export interface WeatherDataParseResult {
    /** 解析是否成功 / Whether parsing was successful */
    success: boolean;
    /** 解析後的陣列 (僅成功時存在) / Parsed array (only present if success is true) */
    data?: WeatherData[];
    /** 錯誤訊息 (僅失敗時存在) / Error message (only present if success is false) */
    error?: string;
}

/**
 * 驗證字串是否為有效的 ISO8601 時間戳記。
 * Validates if a string is a valid ISO8601 timestamp.
 * 
 * 接受格式 / Accepts formats: YYYY-MM-DDTHH:mm:ss, YYYY-MM-DDTHH:mm:ss.sssZ, YYYY-MM-DD HH:mm:ss
 * 
 * @param timestamp - 待驗證的字串 / String to validate
 * @returns 是否為有效格式 / true if timestamp is valid ISO8601 format
 */
const isValidISO8601 = (timestamp: string): boolean => {
    // ISO8601 regex: YYYY-MM-DDTHH:mm:ss with optional milliseconds and Z
    // Also accepts space instead of T for compatibility
    // Year must be 4 digits (1000-9999) to avoid edge cases
    const iso8601Regex = /^[12]\d{3}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{3})?(Z)?$/;

    if (!iso8601Regex.test(timestamp)) {
        return false;
    }

    // Verify the date is actually parseable
    const parsed = Date.parse(timestamp);
    return !isNaN(parsed);
};

/**
 * Parses weather data from API response with validation.
 * Validates array structure, ISO8601 timestamp format, and model identifier presence.
 * 
 * Requirements: 11.1, 11.2
 * 
 * @param apiResponse - Raw API response to parse
 * @returns WeatherDataParseResult with success status, data, or error message
 * 
 * @example
 * const result = parseWeatherData(apiResponse);
 * if (result.success) {
 *   console.log('Parsed data:', result.data);
 * } else {
 *   console.error('Parse error:', result.error);
 * }
 */
export const parseWeatherData = (apiResponse: any): WeatherDataParseResult => {
    try {
        // Validate array structure
        if (!Array.isArray(apiResponse)) {
            return {
                success: false,
                error: 'Response is not an array'
            };
        }

        const parsedData: WeatherData[] = [];

        for (let i = 0; i < apiResponse.length; i++) {
            const record = apiResponse[i];

            // Validate timestamp presence and format
            if (!record.datetime) {
                return {
                    success: false,
                    error: `Missing timestamp at index ${i}`
                };
            }

            if (typeof record.datetime !== 'string') {
                return {
                    success: false,
                    error: `Invalid timestamp type at index ${i}: expected string, got ${typeof record.datetime}`
                };
            }

            if (!isValidISO8601(record.datetime)) {
                return {
                    success: false,
                    error: `Invalid timestamp format at index ${i}: ${record.datetime} (expected ISO8601 format)`
                };
            }

            // Validate model identifier
            if (!record.model || typeof record.model !== 'string') {
                return {
                    success: false,
                    error: `Missing or invalid model identifier at index ${i}`
                };
            }

            // Parse numeric fields (allow null for optional fields)
            const parseOptionalNumber = (value: any): number | null => {
                if (value == null) return null;
                const num = Number(value);
                return isNaN(num) ? null : num;
            };

            // Build parsed weather data record
            parsedData.push({
                datetime: record.datetime,
                area: record.area || '',
                model: record.model,
                temperature_2m: parseOptionalNumber(record.temperature_2m),
                relative_humidity_2m: parseOptionalNumber(record.relative_humidity_2m),
                precipitation: parseOptionalNumber(record.precipitation),
                rain: parseOptionalNumber(record.rain),
                snowfall: parseOptionalNumber(record.snowfall),
                wind_speed_10m: parseOptionalNumber(record.wind_speed_10m),
                wind_direction_10m: record.wind_direction_10m || '',
                cloud_cover: parseOptionalNumber(record.cloud_cover),
                shortwave_radiation: parseOptionalNumber(record.shortwave_radiation),
                weather_code_jwa: parseOptionalNumber(record.weather_code_jwa),
                is_day: parseOptionalNumber(record.is_day),
                // Optional fields
                area_ch: record.area_ch,
                city: record.city,
                apparent_temperature: parseOptionalNumber(record.apparent_temperature),
                dew_point_2m: parseOptionalNumber(record.dew_point_2m),
                pressure_msl: parseOptionalNumber(record.pressure_msl),
                surface_pressure: parseOptionalNumber(record.surface_pressure),
                wind_gusts_10m: parseOptionalNumber(record.wind_gusts_10m),
                snow_depth: parseOptionalNumber(record.snow_depth),
                soil_temperature_0_to_7cm: parseOptionalNumber(record.soil_temperature_0_to_7cm),
                soil_moisture_0_to_7cm: parseOptionalNumber(record.soil_moisture_0_to_7cm),
                sunshine_duration: parseOptionalNumber(record.sunshine_duration),
                daylight_duration: parseOptionalNumber(record.daylight_duration),
                precipitation_hours: parseOptionalNumber(record.precipitation_hours)
            });
        }

        return {
            success: true,
            data: parsedData
        };
    } catch (error) {
        return {
            success: false,
            error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
};

/**
 * Formats weather data objects to API-compatible format for data export.
 * Serializes WeatherData objects with proper handling of null values for optional fields.
 * 
 * Requirements: 11.3
 * 
 * @param weatherData - Array of WeatherData objects to format
 * @returns Array of API-compatible weather data objects
 * 
 * @example
 * const formatted = formatWeatherData(weatherData);
 * // Can be sent back to API or exported
 */
export const formatWeatherData = (weatherData: WeatherData[]): any[] => {
    return weatherData.map(record => ({
        datetime: record.datetime,
        area: record.area,
        model: record.model,
        temperature_2m: record.temperature_2m ?? null,
        relative_humidity_2m: record.relative_humidity_2m ?? null,
        precipitation: record.precipitation ?? null,
        rain: record.rain ?? null,
        snowfall: record.snowfall ?? null,
        wind_speed_10m: record.wind_speed_10m ?? null,
        wind_direction_10m: record.wind_direction_10m,
        cloud_cover: record.cloud_cover ?? null,
        shortwave_radiation: record.shortwave_radiation ?? null,
        weather_code_jwa: record.weather_code_jwa ?? null,
        is_day: record.is_day ?? null,
        // Optional fields - only include if present
        ...(record.area_ch !== undefined && { area_ch: record.area_ch }),
        ...(record.city !== undefined && { city: record.city }),
        ...(record.apparent_temperature !== undefined && { apparent_temperature: record.apparent_temperature ?? null }),
        ...(record.dew_point_2m !== undefined && { dew_point_2m: record.dew_point_2m ?? null }),
        ...(record.pressure_msl !== undefined && { pressure_msl: record.pressure_msl ?? null }),
        ...(record.surface_pressure !== undefined && { surface_pressure: record.surface_pressure ?? null }),
        ...(record.wind_gusts_10m !== undefined && { wind_gusts_10m: record.wind_gusts_10m ?? null }),
        ...(record.snow_depth !== undefined && { snow_depth: record.snow_depth ?? null }),
        ...(record.soil_temperature_0_to_7cm !== undefined && { soil_temperature_0_to_7cm: record.soil_temperature_0_to_7cm ?? null }),
        ...(record.soil_moisture_0_to_7cm !== undefined && { soil_moisture_0_to_7cm: record.soil_moisture_0_to_7cm ?? null }),
        ...(record.sunshine_duration !== undefined && { sunshine_duration: record.sunshine_duration ?? null }),
        ...(record.daylight_duration !== undefined && { daylight_duration: record.daylight_duration ?? null }),
        ...(record.precipitation_hours !== undefined && { precipitation_hours: record.precipitation_hours ?? null })
    }));
};

/**
 * Handles weather data parsing with error logging and user notification.
 * Returns empty array on parse failure to prevent crashes.
 * 
 * Requirements: 11.5
 * 
 * @param apiResponse - Raw API response to parse
 * @param onError - Optional callback to display error notification to user
 * @returns Parsed weather data array, or empty array on failure
 * 
 * @example
 * const weatherData = parseWeatherDataWithErrorHandling(
 *   apiResponse,
 *   (errorMsg) => showNotification({ severity: 'error', message: errorMsg })
 * );
 */
export const parseWeatherDataWithErrorHandling = (
    apiResponse: any,
    onError?: (message: string, details?: string) => void
): WeatherData[] => {
    const result = parseWeatherData(apiResponse);

    if (!result.success) {
        // Log detailed error for debugging
        console.error('Weather data parse error:', result.error);

        // Display user-friendly error notification
        if (onError) {
            onError(
                '天氣資料格式錯誤，請聯繫系統管理員',
                result.error
            );
        }

        // Return empty array to prevent crashes
        return [];
    }

    return result.data!;
};

/**
 * Configuration for weather field visualization in charts.
 * Defines display properties for each weather metric.
 */
export interface WeatherFieldConfig {
    value: string; // Field key in WeatherData
    label: string; // Display name
    unit: string; // Unit of measurement
    color: string; // Chart series color
    axis: 'left' | 'right'; // Y-axis assignment
}

/**
 * Weather field configurations for chart visualization.
 * Maps weather data fields to their display properties.
 * @deprecated Use {@link import('@/constants/weatherCategories').WEATHER_FIELD_DISPLAY} as the canonical source.
 */
export const weatherFields: WeatherFieldConfig[] = [
    { value: 'temperature_2m', label: '氣溫', unit: '°C', color: '#ff6b6b', axis: 'left' },
    { value: 'precipitation', label: '降雨量', unit: 'mm', color: '#4dabf7', axis: 'right' },
    { value: 'snowfall', label: '降雪量', unit: 'cm', color: '#a5d8ff', axis: 'right' },
    { value: 'wind_speed_10m', label: '風速', unit: 'm/s', color: '#51cf66', axis: 'right' },
    { value: 'relative_humidity_2m', label: '相對濕度', unit: '%', color: '#ffd43b', axis: 'right' },
    { value: 'cloud_cover', label: '雲量', unit: '%', color: '#868e96', axis: 'right' },
    { value: 'sunshine_duration', label: '日照時數', unit: 's', color: '#ffa94d', axis: 'right' },
    { value: 'shortwave_radiation', label: '短波輻射', unit: 'W/m²', color: '#ff8787', axis: 'right' }
];

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
                    predictedPrice: toNum(prediction.price_50), // Changed from ?? 0 to keep nulls detectable
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

/**
 * Transforms weather data to ChartDataPoint format for unified chart visualization.
 * Groups weather data by timestamp and maps selected weather fields to chart data points.
 * 
 * @param weatherData - Array of weather data records (actual or forecast)
 * @param selectedFields - Set of weather field names to include in the chart
 * @returns Array of ChartDataPoint objects sorted by timestamp ascending
 * 
 * @example
 * const chartData = transformWeatherToChartData(
 *   weatherData,
 *   new Set(['temperature_2m', 'precipitation', 'wind_speed_10m'])
 * );
 */
export const transformWeatherToChartData = (
    weatherData: WeatherData[],
    selectedFields: Set<string>
): ChartDataPoint[] => {
    // Group by timestamp
    const pointsByTime = new Map<number, ChartDataPoint>();

    weatherData.forEach(record => {
        // Parse timestamp from ISO format (datetime field)
        const timestamp = new Date(record.datetime).getTime();

        // Skip invalid timestamps
        if (isNaN(timestamp)) {
            console.warn(`Invalid timestamp in weather data: ${record.datetime}`);
            return;
        }

        // Initialize point if not exists
        if (!pointsByTime.has(timestamp)) {
            // Format dateTime as YYYY-MM-DD HH:mm
            const date = new Date(timestamp);
            const dateTime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

            pointsByTime.set(timestamp, {
                dateTime,
                timestamp,
                actualPrice: null,
                modelPredictions: []
            });
        }

        const point = pointsByTime.get(timestamp)!;

        // Map selected fields to chart data
        selectedFields.forEach(field => {
            // Use weather_ prefix to avoid conflicts with other chart data
            const fieldKey = `weather_${field}`;
            const value = (record as any)[field];
            (point as any)[fieldKey] = value ?? null;
        });
    });

    // Convert to array and sort by timestamp ascending
    return Array.from(pointsByTime.values()).sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Daily weather aggregate data structure.
 * Contains statistical summaries of hourly weather data grouped by date and field.
 */
export interface DailyWeatherAggregate {
    /** Date in YYYY-MM-DD format */
    date: string;
    /** Weather field name (e.g., 'temperature_2m', 'precipitation') */
    field: string;
    /** Minimum value for the day */
    min: number;
    /** Maximum value for the day */
    max: number;
    /** Average value for the day */
    avg: number;
    /** Number of hourly records used in calculation */
    count: number;
}

/**
 * Calculates daily aggregate statistics from hourly weather data.
 * Groups data by date and field, then computes min, max, avg, and count for each group.
 * 
 * This function should be wrapped with useTransition to prevent blocking UI updates
 * during calculation of large datasets.
 * 
 * @param weatherData - Array of hourly weather data records
 * @param selectedFields - Set of weather field names to calculate aggregates for
 * @returns Array of DailyWeatherAggregate objects sorted by date ascending
 * 
 * Requirements: 7.2, 7.3, 7.5
 * 
 * @example
 * const aggregates = calculateDailyAggregates(
 *   weatherData,
 *   new Set(['temperature_2m', 'precipitation'])
 * );
 * // Returns: [
 * //   { date: '2024-01-01', field: 'temperature_2m', min: 10, max: 25, avg: 17.5, count: 24 },
 * //   { date: '2024-01-01', field: 'precipitation', min: 0, max: 5, avg: 1.2, count: 24 },
 * //   ...
 * // ]
 */
export const calculateDailyAggregates = (
    weatherData: WeatherData[],
    selectedFields: Set<string>
): DailyWeatherAggregate[] => {
    // Group by date and field: Map<"YYYY-MM-DD_fieldName", number[]>
    const aggregatesByDateField = new Map<string, number[]>();

    weatherData.forEach(record => {
        // Extract date from datetime (ISO format: YYYY-MM-DDTHH:mm:ss or YYYY-MM-DD HH:mm:ss)
        const date = record.datetime.split('T')[0].split(' ')[0];

        selectedFields.forEach(field => {
            const value = (record as any)[field];

            // Only include non-null numeric values
            if (value != null && typeof value === 'number' && !isNaN(value)) {
                const key = `${date}_${field}`;

                if (!aggregatesByDateField.has(key)) {
                    aggregatesByDateField.set(key, []);
                }

                aggregatesByDateField.get(key)!.push(value);
            }
        });
    });

    // Calculate statistics for each group
    const aggregates: DailyWeatherAggregate[] = [];

    aggregatesByDateField.forEach((values, key) => {
        // Split key carefully to handle field names with underscores
        // Key format: "YYYY-MM-DD_fieldName"
        // Date is always 10 characters (YYYY-MM-DD), so we can extract it precisely
        const date = key.substring(0, 10);
        const field = key.substring(11); // Skip the underscore separator

        // Calculate min, max, and avg
        const min = Math.min(...values);
        const max = Math.max(...values);
        const sum = values.reduce((acc, val) => acc + val, 0);
        const avg = sum / values.length;

        aggregates.push({
            date,
            field,
            min,
            max,
            avg,
            count: values.length
        });
    });

    // Sort by date ascending, then by field name for consistent ordering
    return aggregates.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.field.localeCompare(b.field);
    });
};
