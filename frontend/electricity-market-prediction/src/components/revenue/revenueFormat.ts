/**
 * 月營收顯示格式 + 漲跌色。
 * 台股慣例:正(增加)→ 紅;負(減少)→ 綠(與本站漲停紅一致)。
 * 金額來源單位:仟元(thousand NTD)。
 */

const RED = '#FF6B6B';            // 正/增加
const GREEN = 'var(--primary)';   // 負/減少
const MUTED = 'var(--muted)';

/** YoY/MoM 百分比色:>0 紅、<0 綠、0/null 灰。 */
export function pctColor(v: number | null | undefined): string {
    if (v == null) return MUTED;
    if (v > 0) return RED;
    if (v < 0) return GREEN;
    return MUTED;
}

/** 百分比文字:帶正負號,1 位小數;null → "—"。 */
export function fmtPct(v: number | null | undefined): string {
    if (v == null) return '—';
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toFixed(1)}%`;
}

/** 營收(仟元)→ 人類可讀:>=1億 顯示「X.XX 億」,否則「X,XXX 萬」。 */
export function fmtRevenue(thousandNtd: number | null | undefined): string {
    if (thousandNtd == null) return '—';
    const yi = thousandNtd / 100_000;        // 仟元 → 億
    if (Math.abs(yi) >= 1) return `${yi.toFixed(2)} 億`;
    const wan = thousandNtd / 10;            // 仟元 → 萬
    return `${Math.round(wan).toLocaleString('en-US')} 萬`;
}
