/**
 * @fileoverview 台股漲跌色階 — 紅漲綠跌（與美股相反），漲跌停 ±10%。
 *
 * 依 changePercent 回傳對應的背景色 / 文字色。色階完全對應規格表：
 *
 *  +10  以上 → 漲停紅 #7F1D1D
 *  +7 ~ +10  → 深紅   #8B0000
 *  +3 ~ +7   → 中紅   #CC0000
 *  +1 ~ +3   → 淺紅   #FF4444
 *  -1 ~ +1   → 平盤   #2D3748
 *  -3 ~ -1   → 淺綠   #22C55E
 *  -7 ~ -3   → 中綠   #16A34A
 *  -10 ~ -7  → 墨綠   #14532D
 *  -10 以下  → 跌停綠 #14532D
 */

export type ChangeTone =
    | 'limitUp' | 'up3' | 'up2' | 'up1'
    | 'flat'
    | 'down1' | 'down2' | 'down3' | 'limitDown';

export interface ChangeColor {
    tone: ChangeTone;
    /** 背景色（用於數字 chip / 收盤格背景） */
    bg: string;
    /** 在該背景上易讀的文字色 */
    fg: string;
    /** 純文字色（用於透明背景時直接著色數字） */
    text: string;
    label: string;
}

const TABLE: { test: (p: number) => boolean; value: ChangeColor }[] = [
    { test: (p) => p >= 10, value: { tone: 'limitUp', bg: '#7F1D1D', fg: '#FFFFFF', text: '#FF6B6B', label: '漲停' } },
    { test: (p) => p >= 7, value: { tone: 'up3', bg: '#8B0000', fg: '#FFFFFF', text: '#FF5252', label: '強勢大漲' } },
    { test: (p) => p >= 3, value: { tone: 'up2', bg: '#CC0000', fg: '#FFFFFF', text: '#FF4444', label: '明顯上漲' } },
    { test: (p) => p >= 1, value: { tone: 'up1', bg: '#FF4444', fg: '#FFFFFF', text: '#FF4444', label: '小幅上漲' } },
    { test: (p) => p > -1, value: { tone: 'flat', bg: '#2D3748', fg: '#CBD5E0', text: '#A0AEC0', label: '平盤' } },
    { test: (p) => p > -3, value: { tone: 'down1', bg: '#22C55E', fg: '#06210F', text: '#22C55E', label: '小幅下跌' } },
    { test: (p) => p > -7, value: { tone: 'down2', bg: '#16A34A', fg: '#FFFFFF', text: '#16A34A', label: '明顯下跌' } },
    { test: (p) => p > -10, value: { tone: 'down3', bg: '#14532D', fg: '#FFFFFF', text: '#34D399', label: '強勢大跌' } },
    { test: () => true, value: { tone: 'limitDown', bg: '#14532D', fg: '#FFFFFF', text: '#34D399', label: '跌停' } },
];

export function getChangeColor(changePercent: number | null | undefined): ChangeColor {
    const p = changePercent ?? 0;
    return (TABLE.find((row) => row.test(p)) ?? TABLE[TABLE.length - 1]).value;
}

export function formatPercent(changePercent: number | null | undefined, digits = 2): string {
    const p = changePercent ?? 0;
    const sign = p > 0 ? '+' : '';
    return `${sign}${p.toFixed(digits)}%`;
}

export function netColor(net: number | null | undefined): string {
    const n = net ?? 0;
    if (n > 0) return '#FF4444';
    if (n < 0) return '#22C55E';
    return '#A0AEC0';
}

export function formatLots(net: number | null | undefined): string {
    const n = net ?? 0;
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toLocaleString('en-US')}`;
}
