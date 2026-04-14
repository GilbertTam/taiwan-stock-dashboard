/**
 * Merges hourly and daily weather data, with hourly taking priority.
 * Daily data is normalized to ISO datetime format.
 * Hourly data overwrites daily where keys overlap (non-null values only).
 *
 * Accepts two different weather data arrays (e.g. WeatherHourlyData[] and WeatherDailyData[]).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeWeatherData(hourlyData: any[], dailyData: any[]): any[] {
    const mergedMap = new Map<string, Record<string, unknown>>();

    // 1. Add daily first (lower priority)
    for (const d of dailyData) {
        if (!d.datetime) continue;
        let dailyTime: string = d.datetime;
        if (dailyTime.length === 8) {
            // YYYYMMDD
            dailyTime = `${dailyTime.substring(0, 4)}-${dailyTime.substring(4, 6)}-${dailyTime.substring(6, 8)}T00:00:00+09:00`;
        } else if (!dailyTime.includes('T') && !dailyTime.includes(' ')) {
            dailyTime = `${dailyTime}T00:00:00+09:00`;
        }
        mergedMap.set(dailyTime, { ...d, datetime: dailyTime });
    }

    // 2. Merge hourly (higher priority, overwrites overlapping keys with non-null values)
    for (const d of hourlyData) {
        if (!d.datetime) continue;
        const key: string = d.datetime;
        const existing = mergedMap.get(key);
        if (existing) {
            const merged = { ...existing };
            for (const [k, val] of Object.entries(d)) {
                if (val !== null && val !== undefined) {
                    merged[k] = val;
                }
            }
            mergedMap.set(key, merged);
        } else {
            mergedMap.set(key, { ...d });
        }
    }

    return Array.from(mergedMap.values()).sort(
        (a, b) => new Date(a.datetime as string).getTime() - new Date(b.datetime as string).getTime()
    );
}
