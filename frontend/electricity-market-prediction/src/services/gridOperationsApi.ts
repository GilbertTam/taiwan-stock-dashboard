/**
 * @fileoverview Grid Operations API Service
 *
 * API functions for fetching grid operation data including imbalance,
 * outages, interconnection flows, intraday market, OCCTO, and TDGC.
 */

import { createAuthenticatedApi } from './apiClient';
import {
    ApiResponse,
    ImbalanceData,
    HjksOutage,
    InterconnectionFlow,
    IntradayData,
    Earthquake,
    OcctoAreaData,
    OcctoInterconnection,
    OcctoEvent,
    BatteryData,
    TdgcData,
    BidPlanData,
    JepxSystemData,
} from '@/types';

// =============================================================================
// Parameter Interfaces
// =============================================================================

/** Base date range parameters */
export interface DateRangeParams {
    /** Start date in YYYYMMDD format */
    start_date: string;
    /** End date in YYYYMMDD format */
    end_date: string;
}

/** Date range with optional area filter */
export interface AreaDateRangeParams extends DateRangeParams {
    /** Optional area name filter */
    area_name?: string;
}

/** Date range with optional interconnection line filter and sampling interval */
export interface InterconnectionParams extends DateRangeParams {
    /** Optional interconnection line name */
    line_name?: string;
    /** Downsample to one point per N minutes (e.g. 30). Omit for raw 5-min data. */
    interval_minutes?: number;
}

/** Date range with optional battery site filter */
export interface BatteryDataParams extends DateRangeParams {
    /** Optional site ID (e.g. Helios) */
    site_id?: string;
}

/** Date range with optional bid plan filters */
export interface BidPlanParams extends DateRangeParams {
    /** Optional site ID */
    site_id?: string;
    /** Commodity category (default: spot) */
    commodity_category?: string;
}

// =============================================================================
// API Functions
// =============================================================================

/** Fetch grid imbalance data. */
export const fetchImbalance = async (params: AreaDateRangeParams): Promise<ImbalanceData[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<ImbalanceData[]>>('/market-info/imbalance', { params });
    return response.data.data;
};

/** Fetch HJKS power plant outage data. */
export const fetchHjksOutages = async (params: AreaDateRangeParams): Promise<HjksOutage[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<HjksOutage[]>>('/market-info/hjks', { params });
    return response.data.data;
};

/** Fetch interconnection line flow data. */
export const fetchInterconnectionFlows = async (params: InterconnectionParams): Promise<InterconnectionFlow[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<InterconnectionFlow[]>>('/market-info/interconnection', { params });
    return response.data.data;
};

/** Fetch JEPX intraday market data. */
export const fetchIntraday = async (params: AreaDateRangeParams): Promise<IntradayData[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<IntradayData[]>>('/market-info/intraday', { params });
    return response.data.data;
};

/** Fetch earthquake event data from JMA. */
export const fetchEarthquakes = async (params: DateRangeParams): Promise<Earthquake[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<Earthquake[]>>('/market-info/earthquakes', { params });
    return response.data.data;
};

/** Fetch OCCTO area supply/demand data. */
export const fetchOcctoArea = async (params: AreaDateRangeParams): Promise<OcctoAreaData[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<OcctoAreaData[]>>('/market-info/occto-area', { params });
    return response.data.data;
};

/** Fetch OCCTO interconnection data. */
export const fetchOcctoInterconnection = async (params: DateRangeParams): Promise<OcctoInterconnection[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<OcctoInterconnection[]>>('/market-info/occto-inter', { params });
    return response.data.data;
};

/** Fetch battery data (eflow). */
export const fetchBatteryData = async (params: BatteryDataParams): Promise<BatteryData[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<BatteryData[]>>('/market-info/battery-data', { params });
    return response.data.data;
};

/** Fetch OCCTO system event data. */
export const fetchOcctoEvents = async (params: DateRangeParams): Promise<OcctoEvent[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<OcctoEvent[]>>('/market-info/occto-event', { params });
    return response.data.data;
};

/** Params for TDGC data fetch with optional data_type filter. */
export interface TdgcParams extends AreaDateRangeParams {
    /** Filter by data type: "result" (確報) or "prompt" (速報). Omit for all. */
    data_type?: string;
}

/** Fetch TDGC (balancing market) data. */
export const fetchTdgc = async (params: TdgcParams): Promise<TdgcData[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<TdgcData[]>>('/market-info/tdgc', { params });
    return response.data.data;
};

/** Fetch bid plan data. */
export const fetchBidPlans = async (params: BidPlanParams): Promise<BidPlanData[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<BidPlanData[]>>('/market-info/bid-plans', { params });
    return response.data.data;
};

/** Fetch JEPX system-level price and bid/ask volume data. */
export const fetchJepxSystem = async (params: DateRangeParams): Promise<JepxSystemData[]> => {
    const api = createAuthenticatedApi();
    const response = await api.get<ApiResponse<JepxSystemData[]>>('/market-info/jepx-system', { params });
    return response.data.data;
};
