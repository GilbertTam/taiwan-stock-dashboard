/**
 * @fileoverview External Data Types
 *
 * Types for weather and earthquake data from external sources.
 */

/**
 * Earthquake event data from JMA.
 */
export interface Earthquake {
    /** Data retrieval time (ISO) */
    get_datetime: string;
    /** Event occurrence time (ISO) */
    event_datetime: string;
    /** Richter magnitude */
    magnitude: number;
    /** Maximum intensity on JMA scale */
    max_intensity: number;
    /** Depth description (e.g., "10km") */
    depth: string;
    /** Location name in Japanese */
    location_name: string;
    /** Closest power grid region */
    closest_region: string;
    /** Latitude of epicenter */
    latitude: number;
    /** Longitude of epicenter */
    longitude: number;
}

/**
 * Weather observation or forecast data (Hourly).
 */
export interface WeatherHourlyData {
    /** Weather data timestamp (ISO format) */
    datetime: string;
    /** Area name */
    area: string;
    /** Temperature in Celsius (2m), null if unavailable */
    temperature_2m: number | null;
    /** Relative humidity percentage (2m), null if unavailable */
    relative_humidity_2m: number | null;
    /** Precipitation in mm, null if unavailable */
    precipitation: number | null;
    /** Rain in mm, null if unavailable */
    rain: number | null;
    /** Snowfall in cm, null if unavailable */
    snowfall: number | null;
    /** Wind speed in m/s (10m), null if unavailable */
    wind_speed_10m: number | null;
    /** Wind direction (10m) */
    wind_direction_10m: string;
    /** Cloud coverage percentage, null if unavailable */
    cloud_cover: number | null;
    /** Shortwave radiation in W/m², null if unavailable */
    shortwave_radiation: number | null;
    /** Weather condition ID (JWA format) */
    weather_code_jwa: number | null;
    /** Is day indicator (1 for day, 0 for night) */
    is_day: number | null;
    /** Model string if provided */
    model?: string;
    /** Area name in Chinese */
    area_ch?: string;
    /** City name */
    city?: string;
    /** Apparent temperature */
    apparent_temperature?: number | null;
    /** Dew point at 2m */
    dew_point_2m?: number | null;
    /** Mean sea level pressure */
    pressure_msl?: number | null;
    /** Surface pressure */
    surface_pressure?: number | null;
    /** Wind gusts at 10m */
    wind_gusts_10m?: number | null;
    /** Snow depth */
    snow_depth?: number | null;
    /** Soil temperature 0-7cm */
    soil_temperature_0_to_7cm?: number | null;
    /** Soil moisture 0-7cm */
    soil_moisture_0_to_7cm?: number | null;
    /** Sunshine duration (hourly) */
    sunshine_duration?: number | null;
    /** Daylight duration */
    daylight_duration?: number | null;
    /** Precipitation hours */
    precipitation_hours?: number | null;
}

/** Backup alias for existing code */
export type WeatherData = WeatherHourlyData;

/**
 * Weather daily aggregate data.
 */
export interface WeatherDailyData {
    /** Observation date (ISO format) */
    datetime: string;
    /** Area name */
    area: string;
    /** Mean temperature in Celsius */
    temperature_2m_mean: number | null;
    /** Max temperature in Celsius */
    temperature_2m_max: number | null;
    /** Min temperature in Celsius */
    temperature_2m_min: number | null;
    /** Mean apparent temperature */
    apparent_temperature_mean: number | null;
    /** Max apparent temperature */
    apparent_temperature_max: number | null;
    /** Min apparent temperature */
    apparent_temperature_min: number | null;
    /** Mean relative humidity percentage */
    relative_humidity_2m_mean: number | null;
    /** Max relative humidity percentage */
    relative_humidity_2m_max: number | null;
    /** Min relative humidity percentage */
    relative_humidity_2m_min: number | null;
    /** Cloud cover mean percentage */
    cloud_cover_mean: number | null;
    /** Total sunshine duration in seconds */
    sunshine_duration: number | null;
    /** Total precipitation sum in mm */
    precipitation_sum: number | null;
    /** Total shortwave radiation sum in MJ/m² */
    shortwave_radiation_sum: number | null;
    /** Total daylight duration in seconds */
    daylight_duration: number | null;
    /** Sunrise time (ISO format) */
    sunrise: string | null;
    /** Sunset time (ISO format) */
    sunset: string | null;
    /** Model string if provided */
    model?: string;
    /** Area name in Chinese */
    area_ch?: string;
    /** City name */
    city?: string;
    /** Rain sum */
    rain_sum?: number | null;
    /** Snowfall sum */
    snowfall_sum?: number | null;
    /** Max wind speed at 10m */
    wind_speed_10m_max?: number | null;
    /** Mean wind speed at 10m */
    wind_speed_10m_mean?: number | null;
    /** Max wind gusts at 10m */
    wind_gusts_10m_max?: number | null;
    /** Mean MSL pressure */
    pressure_msl_mean?: number | null;
    /** Min MSL pressure */
    pressure_msl_min?: number | null;
    /** Max MSL pressure */
    pressure_msl_max?: number | null;
}
