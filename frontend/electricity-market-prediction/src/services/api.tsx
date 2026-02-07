/**
 * @fileoverview API Service Module
 *
 * Provides functions for interacting with the backend REST API.
 * Handles authentication tokens, API instance creation, and typed
 * responses for all market data endpoints.
 *
 * Token Management:
 * - Tokens are stored in both cookies (for SSR) and localStorage (fallback)
 * - Access tokens are automatically attached to authenticated requests
 *
 * @example
 * ```ts
 * import { fetchAreas, fetchPredictions } from '@/services/api';
 *
 * const areas = await fetchAreas();
 * const predictions = await fetchPredictions({
 *   start_date: '20250101',
 *   end_date: '20250107',
 *   area_name: 'tokyo',
 *   model_name: 'ModelA'
 * });
 * ```
 */

import axios from 'axios';
import {
  Area,
  PredictionModel,
  AreaPrice,
  PricePrediction,
  ApiResponse,
  CalculatingDate,
  LoginCredentials,
  AuthTokens,
  ImbalanceData,
  HjksOutage,
  InterconnectionFlow,
  IntradayData,
  Earthquake,
  OcctoAreaData,
  OcctoInterconnection,
  OcctoEvent,
  TdgcData,
  WeatherData,
} from '@/types';
import Cookies from 'js-cookie';
import { getApiBaseUrl } from '@/utils/apiConfig';

const API_BASE_URL = getApiBaseUrl();

/**
 * Create an axios instance configured for API requests.
 *
 * @param token - Optional JWT access token for authenticated requests
 * @returns Configured axios instance
 */
const createApiInstance = (token?: string) => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
  });

  if (token) {
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  return instance;
};

/**
 * Retrieve the access token from storage.
 *
 * Checks cookies first (for SSR compatibility), then falls back to
 * localStorage. Returns null if no token is found or parsing fails.
 *
 * @returns Access token string or null if not found
 */
const getAccessToken = (): string | null => {
  // Guard for SSR environment where window is undefined
  if (typeof window === 'undefined') return null;

  // Try cookie first (preferred for SSR)
  const cookieTokens = Cookies.get('auth_tokens');
  if (cookieTokens) {
    try {
      const tokens = JSON.parse(cookieTokens) as AuthTokens;
      return tokens.access_token;
    } catch (error) {
      console.error('Failed to parse access token from cookie', error);
    }
  }

  // Fallback to localStorage
  const storedTokens = localStorage.getItem('auth_tokens');
  if (storedTokens) {
    try {
      const tokens = JSON.parse(storedTokens) as AuthTokens;
      return tokens.access_token;
    } catch (error) {
      console.error('Failed to parse access token from localStorage', error);
    }
  }

  return null;
};

// =============================================================================
// Authentication API
// =============================================================================

/**
 * Authenticate user and retrieve tokens.
 *
 * @param credentials - Username and password
 * @returns Auth tokens including access_token and refresh_token
 * @throws Error if authentication fails
 */
export const login = async (credentials: LoginCredentials): Promise<AuthTokens> => {
  const api = createApiInstance();
  const response = await api.post<AuthTokens>('/auth/token', credentials);
  return response.data;
};

// =============================================================================
// Core Data API
// =============================================================================

/**
 * Fetch all available electricity grid areas.
 *
 * @returns Array of Area objects with id, name, name_ch, name_jp
 * @throws Error if not authenticated or request fails
 */
export const fetchAreas = async (): Promise<Area[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');

  const api = createApiInstance(token);
  const response = await api.get<{ result: Area[] }>('/area');
  return response.data.result;
};

/**
 * Fetch all available prediction models.
 *
 * @returns Array of PredictionModel objects with model metadata
 * @throws Error if not authenticated or request fails
 */
export const fetchPredictionModels = async (): Promise<PredictionModel[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');

  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<PredictionModel[]>>('/custom-predict/available-models');
  return response.data.data;
};

// =============================================================================
// Predictions API
// =============================================================================

/**
 * Parameters for fetching predictions
 */
export interface PredictionsParams {
  /** Start date in YYYYMMDD format */
  start_date: string;
  /** End date in YYYYMMDD format */
  end_date: string;
  /** Area name filter */
  area_name: string;
  /** Model/source name */
  model_name: string;
  /** If true, return only the latest prediction per time slot */
  latest_only?: boolean;
}

/**
 * Fetch price predictions for a model.
 *
 * @param params - Query parameters including dates, area, and model
 * @returns Array of PricePrediction objects with percentile prices
 * @throws Error if not authenticated or request fails
 */
export const fetchPredictions = async (params: PredictionsParams): Promise<PricePrediction[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');

  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<PricePrediction[]>>('/custom-predict/predictions', { params });
  return response.data.data;
};

/**
 * Parameters for fetching predictions with specific calculating date
 */
export interface SpecificPredictionsParams {
  /** Start date in YYYYMMDD format */
  start_date: string;
  /** End date in YYYYMMDD format */
  end_date: string;
  /** Area name filter */
  area_name: string;
  /** Model/source name */
  model_name: string;
  /** Specific calculation date in YYYYMMDD format */
  calculating_date: string;
}

/**
 * Fetch predictions for a specific calculation date.
 *
 * Useful for comparing historical prediction accuracy.
 *
 * @param params - Query parameters including calculating_date
 * @returns Array of PricePrediction objects for that calculation date
 * @throws Error if not authenticated or request fails
 */
export const fetchSpecificPredictions = async (params: SpecificPredictionsParams): Promise<PricePrediction[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');

  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<PricePrediction[]>>('/custom-predict/specific-calculating-date-predictions', { params });
  return response.data.data;
};

// =============================================================================
// Actual Prices API
// =============================================================================

/**
 * Parameters for fetching actual prices
 */
export interface ActualPricesParams {
  /** Start date in YYYYMMDD format */
  start_date: string;
  /** End date in YYYYMMDD format */
  end_date: string;
  /** Area name (English) */
  name: string;
}

/**
 * Fetch actual JEPX spot market prices.
 *
 * @param params - Query parameters with date range and area
 * @returns Array of AreaPrice objects with actual trading prices
 * @throws Error if not authenticated or request fails
 */
export const fetchActualPrices = async (params: ActualPricesParams): Promise<AreaPrice[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');

  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<AreaPrice[]>>('/market-info/spot-market-area-prices', { params });
  return response.data.data;
};

/**
 * Parameters for fetching all areas prices
 */
export interface AllAreasPricesParams {
  /** Start date in YYYYMMDD format */
  start_date: string;
  /** End date in YYYYMMDD format */
  end_date: string;
}

/**
 * Fetch actual prices for ALL areas in a single request.
 *
 * More efficient than calling fetchActualPrices repeatedly for each area.
 *
 * @param params - Query parameters with date range only
 * @returns Array of AreaPrice objects for all areas
 * @throws Error if not authenticated or request fails
 */
export const fetchAllAreasPrices = async (params: AllAreasPricesParams): Promise<AreaPrice[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');

  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<AreaPrice[]>>('/market-info/spot-market-area-prices', { params });
  return response.data.data;
};

// =============================================================================
// Calculating Dates API
// =============================================================================

/**
 * Parameters for fetching available calculating dates
 */
export interface CalculatingDatesParams {
  /** Start date in YYYYMMDD format */
  start_date: string;
  /** End date in YYYYMMDD format */
  end_date: string;
  /** Area name filter */
  area_name: string;
  /** Model/source name */
  model_name: string;
}

/**
 * Fetch available prediction calculation dates.
 *
 * Returns dates when predictions were generated for the specified
 * model and area, allowing historical prediction comparison.
 *
 * @param params - Query parameters for filtering
 * @returns Array of CalculatingDate objects
 * @throws Error if not authenticated or request fails
 */
export const fetchAvailableCalculatingDates = async (params: CalculatingDatesParams): Promise<CalculatingDate[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');

  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<CalculatingDate[]>>('/custom-predict/available-calculating-dates', { params });
  return response.data.data;
};

// =============================================================================
// Market Info API - Common Parameter Interfaces
// =============================================================================

/**
 * Base date range parameters used by most market info endpoints
 */
export interface DateRangeParams {
  /** Start date in YYYYMMDD format */
  start_date: string;
  /** End date in YYYYMMDD format */
  end_date: string;
}

/**
 * Date range with optional area filter
 */
export interface AreaDateRangeParams extends DateRangeParams {
  /** Optional area name filter */
  area_name?: string;
}

/**
 * Date range with optional interconnection line filter
 */
export interface InterconnectionParams extends DateRangeParams {
  /** Optional interconnection line name */
  line_name?: string;
}

// =============================================================================
// Market Info API - Data Fetching Functions
// =============================================================================

/**
 * Fetch grid imbalance data.
 *
 * @param params - Date range and optional area filter
 * @returns Array of ImbalanceData with values per area
 */
export const fetchImbalance = async (params: AreaDateRangeParams): Promise<ImbalanceData[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<ImbalanceData[]>>('/market-info/imbalance', { params });
  return response.data.data;
};

/**
 * Fetch HJKS power plant outage data.
 *
 * @param params - Date range and optional area filter
 * @returns Array of HjksOutage with plant outage details
 */
export const fetchHjksOutages = async (params: AreaDateRangeParams): Promise<HjksOutage[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<HjksOutage[]>>('/market-info/hjks', { params });
  return response.data.data;
};

/**
 * Fetch interconnection line flow data.
 *
 * @param params - Date range and optional line name filter
 * @returns Array of InterconnectionFlow with capacity and flow data
 */
export const fetchInterconnectionFlows = async (params: InterconnectionParams): Promise<InterconnectionFlow[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<InterconnectionFlow[]>>('/market-info/interconnection', { params });
  return response.data.data;
};

/**
 * Fetch JEPX intraday market data.
 *
 * @param params - Date range and optional area filter
 * @returns Array of IntradayData with OHLC prices
 */
export const fetchIntraday = async (params: AreaDateRangeParams): Promise<IntradayData[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<IntradayData[]>>('/market-info/intraday', { params });
  return response.data.data;
};

/**
 * Fetch earthquake event data from JMA.
 *
 * @param params - Date range for event query
 * @returns Array of Earthquake event objects
 */
export const fetchEarthquakes = async (params: DateRangeParams): Promise<Earthquake[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<Earthquake[]>>('/market-info/earthquakes', { params });
  return response.data.data;
};

/**
 * Fetch OCCTO area supply/demand data.
 *
 * @param params - Date range and optional area filter
 * @returns Array of OcctoAreaData with generation mix
 */
export const fetchOcctoArea = async (params: AreaDateRangeParams): Promise<OcctoAreaData[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<OcctoAreaData[]>>('/market-info/occto-area', { params });
  return response.data.data;
};

/**
 * Fetch OCCTO interconnection data.
 *
 * @param params - Date range for query
 * @returns Array of OcctoInterconnection objects
 */
export const fetchOcctoInterconnection = async (params: DateRangeParams): Promise<OcctoInterconnection[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<OcctoInterconnection[]>>('/market-info/occto-inter', { params });
  return response.data.data;
};

/**
 * Fetch OCCTO system event data.
 *
 * @param params - Date range for query
 * @returns Array of OcctoEvent objects
 */
export const fetchOcctoEvents = async (params: DateRangeParams): Promise<OcctoEvent[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<OcctoEvent[]>>('/market-info/occto-event', { params });
  return response.data.data;
};

/**
 * Fetch TDGC (balancing market) data.
 *
 * @param params - Date range and optional area filter
 * @returns Array of TdgcData with reserve and pricing info
 */
export const fetchTdgc = async (params: AreaDateRangeParams): Promise<TdgcData[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<TdgcData[]>>('/market-info/tdgc', { params });
  return response.data.data;
};

/**
 * Fetch actual (observed) weather data.
 *
 * @param params - Date range and optional area/region filter
 * @returns Array of WeatherData observations
 */
export const fetchWeatherActual = async (params: AreaDateRangeParams): Promise<WeatherData[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<WeatherData[]>>('/market-info/weather-actual', { params });
  return response.data.data;
};

/**
 * Fetch weather forecast data.
 *
 * @param params - Date range and optional area/region filter
 * @returns Array of WeatherData forecasts
 */
export const fetchWeatherForecast = async (params: AreaDateRangeParams): Promise<WeatherData[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  const api = createApiInstance(token);
  const response = await api.get<ApiResponse<WeatherData[]>>('/market-info/weather-forecast', { params });
  return response.data.data;
};

// =============================================================================
// CSV Download API
// =============================================================================

/**
 * Parameters for spot CSV download
 */
export interface SpotCsvParams {
  /** Start date in YYYYMMDD format */
  start_date: string;
  /** End date in YYYYMMDD format */
  end_date: string;
  /** Area name (English) */
  area_name: string;
  /** Optional comma-separated list of model names */
  model_names?: string;
}

/**
 * Download CSV with JEPX actual prices and model predictions.
 *
 * Returns a Blob that can be used to trigger a file download.
 *
 * @param params - Query parameters for CSV generation
 * @returns Blob containing CSV data
 * @throws Error if not authenticated or request fails
 *
 * @example
 * ```ts
 * const blob = await downloadSpotCsv({
 *   start_date: '20250101',
 *   end_date: '20250107',
 *   area_name: 'tokyo',
 *   model_names: 'ModelA,ModelB'
 * });
 *
 * // Trigger download
 * const url = URL.createObjectURL(blob);
 * const a = document.createElement('a');
 * a.href = url;
 * a.download = 'spot_prices.csv';
 * a.click();
 * ```
 */
export const downloadSpotCsv = async (params: SpotCsvParams): Promise<Blob> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');
  const api = createApiInstance(token);
  const response = await api.get('/custom-predict/spot-csv-download', {
    params,
    responseType: 'blob',
  });
  return response.data as Blob;
};
