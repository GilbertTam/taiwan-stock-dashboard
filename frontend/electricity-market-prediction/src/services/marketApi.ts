/**
 * @fileoverview Market Data API Service
 *
 * API functions for fetching JEPX spot market prices and core area data.
 */

import { createAuthenticatedApi } from './apiClient';
import { ApiResponse, Area, AreaPrice } from '@/types';

// =============================================================================
// Parameter Interfaces
// =============================================================================

/** Parameters for fetching actual prices */
export interface ActualPricesParams {
    /** Start date in YYYYMMDD format */
    start_date: string;
    /** End date in YYYYMMDD format */
    end_date: string;
    /** Area name (English) */
    name: string;
}

/** Parameters for fetching all areas prices */
export interface AllAreasPricesParams {
    /** Start date in YYYYMMDD format */
    start_date: string;
    /** End date in YYYYMMDD format */
    end_date: string;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch all available electricity grid areas.
 */
export const fetchAreas = async (): Promise<Area[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<{ result: Area[] }>('/area');
    return response.data.result;
};

/**
 * Fetch actual JEPX spot market prices.
 */
export const fetchActualPrices = async (params: ActualPricesParams): Promise<AreaPrice[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<AreaPrice[]>>('/market-info/spot-market-area-prices', { params });
    return response.data.data;
};

/**
 * Fetch actual prices for ALL areas in a single request.
 */
export const fetchAllAreasPrices = async (params: AllAreasPricesParams): Promise<AreaPrice[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<AreaPrice[]>>('/market-info/spot-market-area-prices', { params });
    return response.data.data;
};
