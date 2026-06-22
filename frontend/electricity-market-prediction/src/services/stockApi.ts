/**
 * @fileoverview 股票相關 API service。
 *
 * 端點:
 *   GET  /api/stock/daily/limit-up?market=&date=        — 當日 / 歷史漲停清單
 *   GET  /api/stock/daily/available-dates                — DB 中已有 snapshot 的日期清單
 *   POST /api/stock/daily/snapshot                       — 手動 snapshot 今日(管理用)
 *   GET  /api/stock/daily/brokers/{code}?date=           — 分點快照(三狀態)
 *   POST /api/stock/daily/brokers/{code}/refresh         — 強制重抓單檔
 */

import { createApiInstance } from './apiClient';
import type {
    AvailableDatesResponse,
    BrokerSnapshotResponse,
    DailyLimitUpResponse,
    Market,
} from '@/types/stock';

export interface FetchDailyParams {
    date?: string;          // YYYY-MM-DD;空 = 今日 live
    market?: Market | 'all';
}

export const fetchDailyLimitUp = async (
    params: FetchDailyParams = {},
): Promise<DailyLimitUpResponse> => {
    const api = createApiInstance();
    const response = await api.get<DailyLimitUpResponse>('/stock/daily/limit-up', {
        params: {
            ...(params.date ? { date: params.date } : {}),
            market: params.market ?? 'all',
        },
    });
    return response.data;
};

export const fetchAvailableDates = async (): Promise<AvailableDatesResponse> => {
    const api = createApiInstance();
    const response = await api.get<AvailableDatesResponse>('/stock/daily/available-dates');
    return response.data;
};

export const triggerSnapshot = async (): Promise<{ date: string; total: number; saved: boolean }> => {
    const api = createApiInstance();
    const response = await api.post('/stock/daily/snapshot');
    return response.data;
};

export const fetchBrokers = async (
    code: string,
    date?: string,
): Promise<BrokerSnapshotResponse> => {
    const api = createApiInstance();
    const response = await api.get<BrokerSnapshotResponse>(`/stock/daily/brokers/${code}`, {
        params: date ? { date } : undefined,
    });
    return response.data;
};

export const refreshBrokers = async (code: string): Promise<BrokerSnapshotResponse> => {
    const api = createApiInstance();
    const response = await api.post<BrokerSnapshotResponse>(`/stock/daily/brokers/${code}/refresh`);
    return response.data;
};

export interface BrokerBatchCrawlResult {
    trade_date: string;
    queued: string[];          // 剛排進佇列的
    skipped_ok: string[];      // 今日已 ok 的
    skipped_pending: string[]; // 已在抓取中的
}

/**
 * 對「今日漲停清單」批次排程背景抓取分點。
 *
 * 後端會對全清單呼叫 broker_service.schedule_crawl,Semaphore(1) 序列化抓取。
 * 立即回傳分桶結果(沒等抓完),前端僅用於觸發 + 統計。
 */
export const triggerBrokerBatchCrawl = async (): Promise<BrokerBatchCrawlResult> => {
    const api = createApiInstance();
    const response = await api.post<BrokerBatchCrawlResult>('/stock/daily/brokers/batch-crawl');
    return response.data;
};
