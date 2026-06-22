/**
 * @fileoverview 當日漲停 + 分點券商型別。
 *
 * 分類欄位兩種來源：
 *   - concept        ── 子產業細分（MoneyDJ）
 *   - concept_reason ── 基礎分類（TWSE 官方產業別）
 */

export type Market = 'twse' | 'tpex';
export type ClassifyMode = 'base' | 'sub';

export interface BrokerEntry {
    broker: string;
    buy: number;
    sell: number;
    net: number;
}

export interface DailyStock {
    code: string;
    name: string;
    market: Market;
    close: number;
    changePercent: number;
    volume: number;

    concept: string;
    concept_reason: string;

    foreign: number;
    trust: number;
    dealer: number;

    brokers: BrokerEntry[];  // 保留向下相容；新流程改用 BrokerSnapshotResponse
}

export interface SectorOption { name: string; count: number; }
export interface MarketBreakdown { twse: number; tpex: number; }

export interface DailyLimitUpResponse {
    date: string;
    updatedAt: string;
    total: number;
    breakdown: MarketBreakdown;
    baseSectors: SectorOption[];
    subSectors: SectorOption[];
    stocks: DailyStock[];
}

// ── 分點券商 ──────────────────────────────────────────────
export type BrokerStatus = 'pending' | 'ok' | 'failed';

export interface BrokerEntryOut {
    broker_code: string;
    broker_name: string;
    net: number;
    buy: number;
    sell: number;
    buy_avg?: number | null;
    sell_avg?: number | null;
    rank_in_buy?: number | null;
    rank_in_sell?: number | null;
}

// ── 可用歷史日期 ──────────────────────────────────────────
export interface AvailableDateRow { date: string; total: number; }
export interface AvailableDatesResponse {
    /** 已 snapshot 的日期清單 (desc by date) */
    dates: AvailableDateRow[];
    /** 後端認定的今日(Asia/Taipei) ISO 字串 — 前端用以區分 live vs 歷史 */
    today: string;
}

export interface BrokerSnapshotResponse {
    code: string;
    name: string;
    market: string;
    trade_date?: string | null;
    status: BrokerStatus;
    fetched_at?: string | null;
    error?: string | null;
    open?: number | null;
    high?: number | null;
    low?: number | null;
    close?: number | null;
    total_records: number;
    total_brokers: number;
    buyTop: BrokerEntryOut[];
    sellTop: BrokerEntryOut[];
    all: BrokerEntryOut[];
}
