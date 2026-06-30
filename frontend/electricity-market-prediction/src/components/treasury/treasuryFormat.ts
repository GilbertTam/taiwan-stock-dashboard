/**
 * 庫藏股顯示格式 + 狀態色。
 * 股數來源單位:股(顯示為「張」= 股/1000);金額單位:元(顯示為 億/萬)。
 */
import type { TreasuryStatus } from '@/types/treasury';

export const STATUS_COLOR: Record<TreasuryStatus, string> = {
    新公告: '#FF6B6B',
    執行中: 'var(--primary)',
    完成: 'var(--muted)',
};

/** i18n key 後綴(treasury namespace 下 status.*)。 */
export const STATUS_I18N: Record<TreasuryStatus, string> = {
    新公告: 'status.new',
    執行中: 'status.executing',
    完成: 'status.done',
};

/** 股 → 張(股/1000),加千分位;null → "—"。 */
export function fmtShares(shares: number | null | undefined): string {
    if (shares == null) return '—';
    const lots = Math.round(shares / 1000);
    return `${lots.toLocaleString('en-US')} 張`;
}

/** 元 → 億/萬;>=1億 顯示「X.XX 億」,否則「X,XXX 萬」。 */
export function fmtAmount(ntd: number | null | undefined): string {
    if (ntd == null) return '—';
    const yi = ntd / 100_000_000;
    if (Math.abs(yi) >= 1) return `${yi.toFixed(2)} 億`;
    const wan = ntd / 10_000;
    return `${Math.round(wan).toLocaleString('en-US')} 萬`;
}

/** 價格區間文字。 */
export function fmtPriceRange(low: number | null, high: number | null): string {
    if (low == null && high == null) return '—';
    return `${low ?? '—'} ~ ${high ?? '—'}`;
}
