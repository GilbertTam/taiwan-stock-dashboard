/**
 * @fileoverview 台股月營收 API service。
 *
 * 端點:
 *   GET  /api/revenue/monthly     — 月營收列表(篩選/排序)
 *   GET  /api/revenue/months      — 可選年月清單
 *   GET  /api/revenue/industries  — 產業別清單
 *   POST /api/revenue/sync        — 手動觸發抓取(管理)
 */

import { createApiInstance } from './apiClient';
import type {
    IndustriesResponse,
    MonthsResponse,
    RevenueHistoryResponse,
    RevenueListResponse,
    RevenueSort,
} from '@/types/revenue';

export interface FetchRevenueParams {
    market?: 'all' | 'twse' | 'tpex';
    year_month?: string;
    industry?: string;
    min_yoy?: number;
    min_mom?: number;
    new_only?: boolean;
    query?: string;
    sort?: RevenueSort;
}

export const fetchMonthlyRevenue = async (
    params: FetchRevenueParams = {},
): Promise<RevenueListResponse> => {
    const api = createApiInstance();
    const res = await api.get<RevenueListResponse>('/revenue/monthly', {
        params: {
            market: params.market ?? 'all',
            ...(params.year_month ? { year_month: params.year_month } : {}),
            ...(params.industry ? { industry: params.industry } : {}),
            ...(params.min_yoy != null ? { min_yoy: params.min_yoy } : {}),
            ...(params.min_mom != null ? { min_mom: params.min_mom } : {}),
            ...(params.new_only ? { new_only: true } : {}),
            ...(params.query ? { query: params.query } : {}),
            sort: params.sort ?? 'first_seen',
        },
    });
    return res.data;
};

export const fetchRevenueHistory = async (code: string): Promise<RevenueHistoryResponse> => {
    const api = createApiInstance();
    const res = await api.get<RevenueHistoryResponse>(`/revenue/history/${encodeURIComponent(code)}`);
    return res.data;
};

export const fetchMonths = async (): Promise<MonthsResponse> => {
    const api = createApiInstance();
    const res = await api.get<MonthsResponse>('/revenue/months');
    return res.data;
};

export const fetchIndustries = async (yearMonth?: string): Promise<IndustriesResponse> => {
    const api = createApiInstance();
    const res = await api.get<IndustriesResponse>('/revenue/industries', {
        params: yearMonth ? { year_month: yearMonth } : undefined,
    });
    return res.data;
};

export const triggerRevenueSync = async (): Promise<{ fetched: number; inserted: number; updated: number; new_today: number }> => {
    const api = createApiInstance();
    const res = await api.post('/revenue/sync');
    return res.data;
};
