/**
 * @fileoverview Predictions API Service
 *
 * API functions for fetching price predictions and related metadata.
 */

import { createAuthenticatedApi } from './apiClient';
import { ApiResponse, PricePrediction, CalculatingDate, PredictionModel } from '@/types';

// =============================================================================
// Parameter Interfaces
// =============================================================================

/** Parameters for fetching predictions */
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

/** Parameters for fetching predictions with specific calculating date */
export interface SpecificPredictionsParams {
    /** Start date in YYYYMMDD format */
    start_date: string;
    /** End date in YYYYMMDD format */
    end_date: string;
    /** Area name filter */
    area_name: string;
    /** Model/source name */
    model_name: string;
    /** Specific calculation timestamp (ISO 8601 with timezone, e.g. "2026-05-22T00:00:00+09:00") */
    calculating_date: string;
}

/** Parameters for fetching available calculating dates */
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

/** Parameters for spot CSV download */
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

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch all available prediction models.
 */
export const fetchPredictionModels = async (): Promise<PredictionModel[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<PredictionModel[]>('/custom-spot-market-predict/available-models');
    return response.data;
};

/**
 * Fetch price predictions for a model.
 */
export const fetchPredictions = async (params: PredictionsParams): Promise<PricePrediction[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<PricePrediction[]>>('/custom-spot-market-predict/predictions', { params });
    return response.data.data;
};

/**
 * Fetch predictions for a specific calculation date.
 */
export const fetchSpecificPredictions = async (params: SpecificPredictionsParams): Promise<PricePrediction[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<PricePrediction[]>>('/custom-spot-market-predict/specific-calculating-date-predictions', { params });
    return response.data.data;
};


export const fetchAvailableCalculatingDates = async (params: CalculatingDatesParams): Promise<CalculatingDate[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<CalculatingDate[]>('/custom-spot-market-predict/available-dates', { params });
    return response.data;
};

/**
 * Download CSV with JEPX actual prices and model predictions.
 */
export const downloadSpotCsv = async (params: SpotCsvParams): Promise<Blob> => {
    const api = createAuthenticatedApi();
    const response = await api.get('/custom-spot-market-predict/spot-csv-download', {
        params,
        responseType: 'blob',
    });
    return response.data as Blob;
};
