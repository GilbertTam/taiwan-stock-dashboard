/**
 * @fileoverview 台股庫藏股型別。對齊後端 app/schemas/treasury.py。
 * 金額單位:元;股數:股。
 */

export type TreasuryStatus = '執行中' | '新公告' | '完成';
export type TreasuryStatusFilter = 'active' | 'executing' | 'new' | 'done' | 'all';
export type TreasurySort = 'board_date' | 'first_seen' | 'code';

export interface TreasuryBuyback {
    code: string;
    name: string;
    market: string;
    board_date: string;                  // 董事會決議日 "YYYY-MM-DD"
    purpose: string;
    amount_cap: number | null;           // 金額上限(元)
    planned_shares: number | null;       // 預定買回股數(股)
    price_low: number | null;
    price_high: number | null;
    period_start: string;
    period_end: string;
    is_done: boolean;
    bought_shares: number | null;
    bought_amount: number | null;
    bought_pct: number | null;           // 已買回佔預定(%)
    avg_price: number | null;
    status: TreasuryStatus;
    is_new: boolean;
    first_seen_at: string | null;
}

export interface TreasurySummary {
    executing: number;
    new_today: number;
    done: number;
    total: number;
}

export interface TreasuryListResponse {
    summary: TreasurySummary;
    items: TreasuryBuyback[];
}
