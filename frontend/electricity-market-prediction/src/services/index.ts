/**
 * @fileoverview Services Barrel Export
 *
 * Re-exports all API services for convenient importing.
 * Consumers can import from '@/services' directly.
 *
 * @example
 * import { login, fetchAreas, fetchPredictions } from '@/services';
 */

// API Client utilities
export { createApiInstance, getAccessToken, createAuthenticatedApi } from './apiClient';

// Authentication
export { login } from './authApi';

// Core market data
export { fetchAreas, fetchActualPrices, fetchAllAreasPrices } from './marketApi';
export type { ActualPricesParams, AllAreasPricesParams } from './marketApi';

// Predictions
export {
    fetchPredictionModels,
    fetchPredictions,
    fetchSpecificPredictions,
    fetchAvailableCalculatingDates,
    downloadSpotCsv,
} from './predictionsApi';
export type {
    PredictionsParams,
    SpecificPredictionsParams,
    CalculatingDatesParams,
    SpotCsvParams,
} from './predictionsApi';

// Weather
export { fetchWeatherActual, fetchWeatherForecast } from './weatherApi';
export type { WeatherParams } from './weatherApi';

// Grid operations
export {
    fetchImbalance,
    fetchHjksOutages,
    fetchInterconnectionFlows,
    fetchIntraday,
    fetchEarthquakes,
    fetchOcctoArea,
    fetchOcctoInterconnection,
    fetchOcctoEvents,
    fetchBatteryData,
    fetchTdgc,
} from './gridOperationsApi';
export type { DateRangeParams, AreaDateRangeParams, InterconnectionParams, BatteryDataParams } from './gridOperationsApi';
