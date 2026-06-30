/**
 * @fileoverview 台股庫藏股 API service。
 *   GET  /api/treasury/list?status=&market=&query=&sort=
 *   POST /api/treasury/sync
 */
import { createApiInstance } from './apiClient';
import type {
    TreasuryListResponse,
    TreasurySort,
    TreasuryStatusFilter,
} from '@/types/treasury';

export interface FetchTreasuryParams {
    status?: TreasuryStatusFilter;
    market?: 'all' | 'twse' | 'tpex';
    query?: string;
    sort?: TreasurySort;
}

export const fetchTreasury = async (
    params: FetchTreasuryParams = {},
): Promise<TreasuryListResponse> => {
    const api = createApiInstance();
    const res = await api.get<TreasuryListResponse>('/treasury/list', {
        params: {
            status: params.status ?? 'active',
            market: params.market ?? 'all',
            ...(params.query ? { query: params.query } : {}),
            sort: params.sort ?? 'board_date',
        },
    });
    return res.data;
};

export const triggerTreasurySync = async (): Promise<{ fetched: number; inserted: number; new_today: number }> => {
    const api = createApiInstance();
    const res = await api.post('/treasury/sync');
    return res.data;
};
