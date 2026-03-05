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
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<WeatherHourlyData[]>>('/market-info/weather-forecast', { params });
    return response.data.data;
};

/** Weather model info returned by /weather-models */
export interface WeatherModelInfo {
    model: string;
    hourly_count: number;
    daily_count: number;
}

/**
 * Fetch available weather models for an area.
 */
export const fetchWeatherModels = async (params: { area_name?: string }): Promise<WeatherModelInfo[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<WeatherModelInfo[]>>('/market-info/weather-models', { params });
    return response.data.data;
};
