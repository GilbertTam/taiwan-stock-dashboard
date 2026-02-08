/**
 * @fileoverview Weather API Service
 *
 * API functions for fetching weather actual and forecast data.
 */

import { createAuthenticatedApi } from './apiClient';
import { ApiResponse, WeatherData } from '@/types';

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
export const fetchWeatherActual = async (params: WeatherParams): Promise<WeatherData[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<WeatherData[]>>('/market-info/weather-actual', { params });
    return response.data.data;
};

/**
 * Fetch weather forecast data.
 */
export const fetchWeatherForecast = async (params: WeatherParams): Promise<WeatherData[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<WeatherData[]>>('/market-info/weather-forecast', { params });
    return response.data.data;
};
