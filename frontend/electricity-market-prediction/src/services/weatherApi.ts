/**
 * @fileoverview Weather API Service
 *
 * API functions for fetching weather actual and forecast data.
 */

import { createAuthenticatedApi } from './apiClient';
import { ApiResponse, WeatherHourlyData, WeatherDailyData, WeatherData } from '@/types';

// =============================================================================
// Parameter Interfaces
// =============================================================================

/** Parameters for fetching weather data */
export interface WeatherParams {
    /** Start date in YYYYMMDD format */
    start_date: string;
    /** End date in YYYYMMDD format */
    end_date: string;
    /** Optional area/region filter */
    area_name?: string;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch actual (observed) weather data.
 */
export const fetchWeatherActual = async (params: WeatherParams): Promise<WeatherHourlyData[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<WeatherHourlyData[]>>('/market-info/weather-actual', { params });
    return response.data.data;
};

/**
 * Fetch daily actual (observed) weather aggregate data.
 */
export const fetchWeatherActualDaily = async (params: WeatherParams): Promise<WeatherDailyData[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<WeatherDailyData[]>>('/market-info/weather-actual-daily', { params });
    return response.data.data;
};

/**
 * Fetch weather forecast data.
 */
export const fetchWeatherForecast = async (params: WeatherParams): Promise<WeatherHourlyData[]> => {
    try {
        const api = createAuthenticatedApi();
        console.log('[WeatherAPI] Fetching forecast data with params:', params);
        const response = await api.get<ApiResponse<WeatherHourlyData[]>>('/market-info/weather-forecast', { params });
        console.log('[WeatherAPI] Forecast data received:', {
            count: response.data.data?.length || 0,
            params
        });
        return response.data.data;
    } catch (error) {
        console.error('[WeatherAPI] Failed to fetch weather forecast:', error);
        throw error;
    }
};

/** Weather model info returned by /weather-models */
export interface WeatherModelInfo {
    model: string;
    hourly_count: number;
    daily_count: number;
    has_actual_data?: boolean;
    has_forecast_data?: boolean;
}

/**
 * Fetch available weather models for an area.
 */
export const fetchWeatherModels = async (params: { area_name?: string }): Promise<WeatherModelInfo[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<WeatherModelInfo[]>>('/market-info/weather-models', { params });
    return response.data.data;
};

/**
 * Fetch daily weather forecast data.
 */
export const fetchWeatherForecastDaily = async (params: WeatherParams): Promise<WeatherDailyData[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<WeatherDailyData[]>>('/market-info/weather-forecast-daily', { params });
    return response.data.data;
};

// =============================================================================
// Per-Dataset Model List Fetchers
// =============================================================================

/** Basic model info returned by per-dataset model endpoints */
export interface WeatherModelBasicInfo {
    model: string;
    doc_count: number;
}

/** Fetch model names available in actual hourly weather data. */
export const fetchWeatherActualModels = async (params: { area_name?: string }): Promise<WeatherModelBasicInfo[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<WeatherModelBasicInfo[]>>('/market-info/weather-actual-models', { params });
    return response.data.data;
};

/** Fetch model names available in actual daily weather data. */
export const fetchWeatherActualDailyModels = async (params: { area_name?: string }): Promise<WeatherModelBasicInfo[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<WeatherModelBasicInfo[]>>('/market-info/weather-actual-daily-models', { params });
    return response.data.data;
};

/** Fetch model names available in forecast hourly weather data. */
export const fetchWeatherForecastModels = async (params: { area_name?: string }): Promise<WeatherModelBasicInfo[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<WeatherModelBasicInfo[]>>('/market-info/weather-forecast-models', { params });
    return response.data.data;
};

/** Fetch model names available in forecast daily weather data. */
export const fetchWeatherForecastDailyModels = async (params: { area_name?: string }): Promise<WeatherModelBasicInfo[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<WeatherModelBasicInfo[]>>('/market-info/weather-forecast-daily-models', { params });
    return response.data.data;
};
