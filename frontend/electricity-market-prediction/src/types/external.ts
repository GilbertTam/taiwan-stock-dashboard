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
 * Weather observation or forecast data.
 */
export interface WeatherData {
    /** Weather data timestamp (ISO format) */
    weather_datetime: string;
    /** Region name (matches grid area) */
    region: string;
    /** Area name */
    area: string;
    /** City name */
    city: string;
    /** Temperature in Celsius, null if unavailable */
    temperature: number | null;
    /** Rainfall in mm, null if unavailable */
    rainfall: number | null;
    /** Snowfall in cm, null if unavailable */
    snowfall: number | null;
    /** Wind speed in m/s, null if unavailable */
    wind_speed: number | null;
    /** Wind direction (e.g., "N", "NE") */
    wind_direction: string;
    /** Relative humidity percentage, null if unavailable */
    relative_humidity: number | null;
    /** Weather condition ID (OpenWeatherMap code) */
    weather_id: number;
    /** Cloud coverage percentage, null if unavailable */
    clouds_all: number | null;
}
