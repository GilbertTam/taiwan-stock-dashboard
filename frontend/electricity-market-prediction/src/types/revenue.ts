/**
 * @fileoverview 台股月營收型別。對齊後端 app/schemas/revenue.py。
 * 金額單位:仟元(thousand NTD)。
 */

export type RevenueMarket = 'twse' | 'tpex';
export type RevenueSort = 'first_seen' | 'yoy' | 'mom' | 'revenue' | 'code';

export interface MonthlyRevenue {
    code: string;
    name: string;
    market: string;
    industry: string;
    year_month: string;                  // "YYYY-MM"
    revenue: number | null;              // 當月營收(仟元)
    last_month_revenue: number | null;
    last_year_revenue: number | null;
    mom_pct: number | null;              // 上月比較增減(%)
    yoy_pct: number | null;              // 去年同月增減(%)
    cum_revenue: number | null;          // 當月累計營收(仟元)
    cum_yoy_pct: number | null;          // 累計前期比較增減(%)
    note: string;
    first_seen_at: string | null;
    is_new: boolean;                     // 今日新申報
}

export interface RevenueSummary {
    latest_year_month: string | null;
    total: number;
    new_today: number;
    avg_yoy: number | null;
}

export interface RevenueListResponse {
    year_month: string | null;
    summary: RevenueSummary;
    items: MonthlyRevenue[];
}

export interface MonthsResponse {
    months: string[];
}

export interface IndustriesResponse {
    industries: string[];
}
