/**
 * Per-field choropleth visualization settings: fixed value range and color
 * ramp. Fields not in this table fall back to auto-fitting the visible data.
 *
 * Colors must be valid CSS color strings; ECharts interpolates between them
 * along the visualMap. 2-stop ramps go low→high; 3-stop ramps highlight a
 * meaningful midpoint (e.g. comfortable temperature, neutral pressure).
 */

export interface FieldRange {
    min: number;
    max: number;
    /** 2 or 3 stop colors, low → high */
    colors: string[];
}

export const FIELD_RANGES: Record<string, FieldRange> = {
    // — hourly —
    cloud_cover:                  { min: 0,   max: 100,  colors: ['#bfe4ff', '#7e8794'] },
    temperature_2m:               { min: -10, max: 35,   colors: ['#3b82f6', '#fde047', '#ef4444'] },
    apparent_temperature:         { min: -15, max: 38,   colors: ['#3b82f6', '#fde047', '#ef4444'] },
    dew_point_2m:                 { min: -15, max: 30,   colors: ['#3b82f6', '#fde047', '#ef4444'] },
    relative_humidity_2m:         { min: 0,   max: 100,  colors: ['#fef3c7', '#0891b2'] },
    precipitation:                { min: 0,   max: 20,   colors: ['#ffffff', '#1e40af'] },
    rain:                         { min: 0,   max: 20,   colors: ['#ffffff', '#1e40af'] },
    snowfall:                     { min: 0,   max: 20,   colors: ['#ffffff', '#7dd3fc'] },
    snow_depth:                   { min: 0,   max: 1,    colors: ['#ffffff', '#7dd3fc'] },
    wind_speed_10m:               { min: 0,   max: 20,   colors: ['#f3f4f6', '#a855f7'] },
    wind_speed_100m:              { min: 0,   max: 30,   colors: ['#f3f4f6', '#a855f7'] },
    wind_gusts_10m:               { min: 0,   max: 30,   colors: ['#f3f4f6', '#a855f7'] },
    shortwave_radiation:          { min: 0,   max: 900,  colors: ['#1e3a8a', '#fbbf24'] },
    sunshine_duration:            { min: 0,   max: 3600, colors: ['#1e3a8a', '#fbbf24'] },
    pressure_msl:                 { min: 990, max: 1025, colors: ['#7c3aed', '#ffffff', '#dc2626'] },
    surface_pressure:             { min: 950, max: 1020, colors: ['#7c3aed', '#ffffff', '#dc2626'] },
    soil_temperature_0_to_7cm:    { min: -5,  max: 35,   colors: ['#3b82f6', '#fde047', '#ef4444'] },
    soil_moisture_0_to_7cm:       { min: 0,   max: 0.5,  colors: ['#fef3c7', '#15803d'] },
    // — daily —
    temperature_2m_mean:          { min: -5,  max: 30,   colors: ['#3b82f6', '#fde047', '#ef4444'] },
    temperature_2m_max:           { min: 0,   max: 38,   colors: ['#3b82f6', '#fde047', '#ef4444'] },
    temperature_2m_min:           { min: -15, max: 25,   colors: ['#3b82f6', '#fde047', '#ef4444'] },
    precipitation_sum:            { min: 0,   max: 50,   colors: ['#ffffff', '#1e40af'] },
    rain_sum:                     { min: 0,   max: 50,   colors: ['#ffffff', '#1e40af'] },
    snowfall_sum:                 { min: 0,   max: 50,   colors: ['#ffffff', '#7dd3fc'] },
    wind_speed_10m_max:           { min: 0,   max: 25,   colors: ['#f3f4f6', '#a855f7'] },
    wind_speed_10m_mean:          { min: 0,   max: 15,   colors: ['#f3f4f6', '#a855f7'] },
    wind_gusts_10m_max:           { min: 0,   max: 35,   colors: ['#f3f4f6', '#a855f7'] },
    shortwave_radiation_sum:      { min: 0,   max: 30,   colors: ['#1e3a8a', '#fbbf24'] }, // MJ/m²
    relative_humidity_2m_mean:    { min: 0,   max: 100,  colors: ['#fef3c7', '#0891b2'] },
    relative_humidity_2m_max:     { min: 0,   max: 100,  colors: ['#fef3c7', '#0891b2'] },
    relative_humidity_2m_min:     { min: 0,   max: 100,  colors: ['#fef3c7', '#0891b2'] },
    pressure_msl_mean:            { min: 990, max: 1025, colors: ['#7c3aed', '#ffffff', '#dc2626'] },
    daylight_duration:            { min: 0,   max: 50000, colors: ['#1e3a8a', '#fbbf24'] },
};

/** Default ramp for fields without a specific range entry. */
const FALLBACK_COLORS = ['#dbeafe', '#1e40af'];

/**
 * Resolve a {min,max,colors} for the requested field. When the field has no
 * preset entry, auto-derive [0, max(values)] from the visible data, with a
 * minimum width to avoid a flat scale.
 */
export function resolveFieldRange(field: string, visibleValues: (number | null)[]): FieldRange {
    const preset = FIELD_RANGES[field];
    if (preset) return preset;

    const nums = visibleValues.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (nums.length === 0) {
        return { min: 0, max: 1, colors: FALLBACK_COLORS };
    }
    const dataMin = Math.min(...nums);
    const dataMax = Math.max(...nums);
    const min = dataMin >= 0 ? 0 : dataMin;
    const max = dataMax > min ? dataMax : min + 1;
    return { min, max, colors: FALLBACK_COLORS };
}

/**
 * Fields that exist in WEATHER_FIELD_DISPLAY but make no sense as a choropleth.
 * The control bar should grey these out.
 */
export const UNSUPPORTED_FOR_MAP: ReadonlySet<string> = new Set([
    'wind_direction_10m',
    'wind_direction_100m',
    'sunrise',
    'sunset',
]);

/**
 * Map a weather field key to the closest Windy embed `overlay` value. Used to
 * auto-switch the Windy iframe when the user picks a new field. Returns null
 * for fields with no natural Windy counterpart (radiation, soil, sunshine etc.)
 * — the UI surfaces a hint in that case rather than auto-switching.
 *
 * Windy overlay vocabulary (embed2.html):
 *   clouds | temp | rain | wind | rh | pressure | gust | snow
 */
export const FIELD_TO_WINDY_OVERLAY: Record<string, string> = {
    // hourly
    cloud_cover: 'clouds',
    temperature_2m: 'temp',
    apparent_temperature: 'temp',
    dew_point_2m: 'temp',
    relative_humidity_2m: 'rh',
    precipitation: 'rain',
    rain: 'rain',
    snowfall: 'snow',
    snow_depth: 'snow',
    wind_speed_10m: 'wind',
    wind_speed_100m: 'wind',
    wind_gusts_10m: 'gust',
    pressure_msl: 'pressure',
    surface_pressure: 'pressure',
    // daily aggregates
    temperature_2m_mean: 'temp',
    temperature_2m_max: 'temp',
    temperature_2m_min: 'temp',
    precipitation_sum: 'rain',
    rain_sum: 'rain',
    snowfall_sum: 'snow',
    wind_speed_10m_max: 'wind',
    wind_speed_10m_mean: 'wind',
    wind_gusts_10m_max: 'gust',
    relative_humidity_2m_mean: 'rh',
    relative_humidity_2m_max: 'rh',
    relative_humidity_2m_min: 'rh',
    pressure_msl_mean: 'pressure',
    // Unmapped (no Windy overlay):
    //   shortwave_radiation, shortwave_radiation_sum, sunshine_duration,
    //   daylight_duration, soil_*, vapour_pressure_deficit
};

/** Returns the Windy overlay key that best matches the given field, or null. */
export function suggestWindyOverlay(field: string): string | null {
    return FIELD_TO_WINDY_OVERLAY[field] ?? null;
}
