'use client';

import React from 'react';
import { Box, Typography, Divider, Tooltip, Chip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

function formatJPY(value: number | null): string {
    if (value === null) return '—';
    return `¥${value.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`;
}

function formatPct(value: number | null): string {
    if (value === null) return '—';
    return `${value.toFixed(1)}%`;
}

/**
 * A single sub-metric row: colored dot + label + optional formula hint + right-aligned value.
 * Used within KpiBlock to break down how the primary value is composed.
 */
function MetricRow({
    dotColor,
    label,
    value,
    valueColor,
    hint,
}: {
    dotColor: string;
    label: string;
    value: string;
    valueColor?: string;
    hint?: string; // shown in parentheses after label to clarify calculation basis
}) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 0.5 }}>
            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0, mt: '3px' }} />
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 0.3, minWidth: 0, overflow: 'hidden' }}>
                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {label}
                </Typography>
                {hint && (
                    <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', whiteSpace: 'nowrap', opacity: 0.85 }}>
                        ({hint})
                    </Typography>
                )}
            </Box>
            <Typography sx={{
                fontSize: '0.73rem',
                fontWeight: 700,
                color: valueColor || 'text.primary',
                whiteSpace: 'nowrap',
                flexShrink: 0,
            }}>
                {value}
            </Typography>
        </Box>
    );
}

interface KpiBlockProps {
    label: string;
    /** One-line description always shown below the title — explains what this KPI measures */
    description: string;
    value: string;
    sub?: string;
    accentColor: string;
    badge?: 'actual' | 'estimated';
    /** Detailed tooltip content shown on info-icon hover */
    tooltip?: string;
    children?: React.ReactNode; // MetricRow elements
}

function KpiBlock({ label, description, value, sub, accentColor, badge, tooltip, children }: KpiBlockProps) {
    return (
        <Box sx={{
            flex: 1,
            px: 2,
            py: 1.25,
            borderLeft: `3px solid ${accentColor}`,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
        }}>
            {/* ── Title row ─────────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.2 }}>
                <Typography sx={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flexShrink: 1,
                    minWidth: 0,
                }}>
                    {label}
                </Typography>
                {badge && (
                    <Chip
                        label={badge === 'actual' ? '實際值' : '預測值'}
                        size="small"
                        sx={{
                            height: 14,
                            fontSize: '0.58rem',
                            flexShrink: 0,
                            bgcolor: badge === 'actual' ? '#1976d230' : '#ed6c0220',
                            color: badge === 'actual' ? '#42a5f5' : '#ff9800',
                            '& .MuiChip-label': { px: 0.75 },
                        }}
                    />
                )}
                {tooltip && (
                    <Tooltip
                        title={
                            <Typography sx={{ fontSize: '0.78rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                                {tooltip}
                            </Typography>
                        }
                        placement="bottom-start"
                        enterDelay={200}
                    >
                        <InfoOutlinedIcon sx={{
                            fontSize: '0.8rem',
                            color: 'text.disabled',
                            cursor: 'help',
                            flexShrink: 0,
                            ml: 'auto',
                            '&:hover': { color: 'text.secondary' },
                        }} />
                    </Tooltip>
                )}
            </Box>

            {/* ── Description — always visible ───────────────────────── */}
            <Typography sx={{
                fontSize: '0.62rem',
                color: 'text.disabled',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                mb: 0.6,
                lineHeight: 1.3,
            }}>
                {description}
            </Typography>

            {/* ── Primary value ─────────────────────────────────────── */}
            <Typography sx={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: accentColor,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
            }}>
                {value}
            </Typography>

            {/* ── Sub text (e.g. model name) ─────────────────────────── */}
            {sub && (
                <Typography sx={{
                    fontSize: '0.62rem',
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    mt: 0.1,
                }}>
                    {sub}
                </Typography>
            )}

            {/* ── Breakdown rows ─────────────────────────────────────── */}
            {children && (
                <Box sx={{ mt: 0.6, pt: 0.5, borderTop: '1px dashed', borderColor: 'divider' }}>
                    {children}
                </Box>
            )}
        </Box>
    );
}

interface RevenueKpiHeaderProps {
    optimalRev: number | null;
    bestModelRev: number | null;
    bestModelName: string;
    efficiency: number | null;
    manualRev: number | null;
    priceBasis?: string;
    referenceName?: string;
    bestModelRevActual?: number | null;
    bestModelRevEstimated?: number | null;
    efficiencyActual?: number | null;
    efficiencyEstimated?: number | null;
    manualRevActual?: number | null;
    manualRevEstimated?: number | null;
    manualEffectiveCycles?: number | null;
    cycleLimit?: number | null;
}

export default function RevenueKpiHeader({
    optimalRev,
    bestModelRev,
    bestModelName,
    efficiency,
    manualRev,
    priceBasis = 'actual',
    referenceName,
    bestModelRevActual,
    bestModelRevEstimated,
    efficiencyActual,
    efficiencyEstimated,
    manualRevActual,
    manualRevEstimated,
    manualEffectiveCycles,
    cycleLimit,
}: RevenueKpiHeaderProps) {
    const effColor = efficiency !== null
        ? (efficiency > 90 ? '#66bb6a' : '#ffa726')
        : '#aaa';

    /** Compute percentage, guarding against zero/mismatched-sign denominators */
    function calcEff(rev: number, ref: number): number | null {
        if (ref === 0) return null;
        if (!((ref > 0 && rev > 0) || (ref < 0 && rev < 0))) return null;
        return (rev / ref) * 100;
    }

    const hasOptimalRef = optimalRev != null && optimalRev !== 0;
    const manualEfficiencyActual = (hasOptimalRef && manualRevActual != null)
        ? calcEff(manualRevActual, optimalRev!)
        : null;
    const manualEfficiencyEstimated = (hasOptimalRef && manualRevEstimated != null)
        ? calcEff(manualRevEstimated, optimalRev!)
        : null;
    const showManualEff = manualEfficiencyActual != null || manualEfficiencyEstimated != null;

    const isEstimated = priceBasis !== 'actual';
    const isReferenceMode = isEstimated && referenceName != null;

    // Show breakdown rows only when both actual and estimated values are available
    const showModelDual = bestModelRevActual != null && bestModelRevEstimated != null;
    const showEffDual = efficiencyActual != null || efficiencyEstimated != null;

    // ── Block 1: Optimal / Reference ─────────────────────────────────
    const optimalLabel = isReferenceMode
        ? `Reference (${referenceName})`
        : 'Optimal (Realized)';

    const optimalDescription = isReferenceMode
        ? `${referenceName} 依自身預測排程所得收益（視為 100% 基準）`
        : '依實際成交價，事後計算之理論最大收益';

    const optimalTooltip = isReferenceMode
        ? `計算方式：\n以「${referenceName}」的預測排程為基準，並以其自身預測價格計算收益，作為其他模型的比較基準（= 100%）。\n\n注意：此模式在無實際成交價資料時啟用。`
        : `計算方式：\n最優排程 × 實際成交價\n\n在已知實際成交價的條件下，以線性規劃求出最大收益排程並回算，是理論上無法超越的上限。`;

    // ── Block 2: Best Model ───────────────────────────────────────────
    const bestModelLabel = isReferenceMode
        ? 'Best Competing Model'
        : isEstimated ? 'Best Model (Estimated)' : 'Best Model (Realized)';

    const bestModelDescription = isReferenceMode
        ? `排除基準模型後，以 ${referenceName} 預測價結算之最高收益模型`
        : isEstimated
            ? '依各模型預測排程，以基準模型預測價格估算的最高收益'
            : '依各模型預測排程，以實際成交價結算後收益最高的模型';

    const bestModelTooltip = isReferenceMode
        ? `計算方式：\n各競爭模型 × ${referenceName} 預測排程 → 以 ${referenceName} 預測價計算收益 → 取最高者\n\n此模式下基準模型本身排除在外。`
        : isEstimated
            ? `計算方式：\n各模型依自身預測排程 → 以「${priceBasis}」預測價計算估算收益 → 取最高者\n\n主值為估算收益，展開項顯示同排程在實際成交價下的結算結果。`
            : `計算方式：\n各模型依預測排程 → 以實際成交價結算 → 取最高者\n\n主值為實際結算收益；展開項中另列模型自身預測收益供對照。`;

    // ── Block 3: Strategy Efficiency ─────────────────────────────────
    const effDescription = isReferenceMode
        ? `競爭模型收益 ÷ ${referenceName} 基準收益 × 100%`
        : '最佳模型實際收益 ÷ 最優收益 × 100%';

    const effTooltip = isReferenceMode
        ? `計算方式：\n最佳競爭模型收益 ÷ ${referenceName} 基準收益 × 100%\n\n100% 表示某競爭模型與基準模型收益相同。`
        : `計算方式：\n最佳模型收益 ÷ 最優收益 × 100%\n\n「最優收益」是以實際成交價計算的理論上限。\n\n展開項說明：\n• 以實際價結算效率：最佳模型實際收益 ÷ 最優收益\n• 以預測估算效率：最佳模型依自身預測的預期收益 ÷ 最優收益\n  （分子與分母使用不同價格基準，故通常小於 100%）`;

    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'stretch',
            bgcolor: 'var(--card-bg)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--card-border)',
            flexShrink: 0,
            overflow: 'hidden',
        }}>
            {/* ── 1. Optimal (Realized) ──────────────────────────────── */}
            <KpiBlock
                label={optimalLabel}
                description={optimalDescription}
                value={formatJPY(optimalRev)}
                accentColor="#42a5f5"
                badge={isReferenceMode ? 'estimated' : 'actual'}
                tooltip={optimalTooltip}
            />

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'var(--card-border)' }} />

            {/* ── 2. Best Model ─────────────────────────────────────── */}
            <KpiBlock
                label={bestModelLabel}
                description={bestModelDescription}
                value={formatJPY(bestModelRev)}
                sub={bestModelName || undefined}
                accentColor="#ab47bc"
                badge={isEstimated ? 'estimated' : 'actual'}
                tooltip={bestModelTooltip}
            >
                {showModelDual && (
                    <>
                        <MetricRow
                            dotColor="#42a5f5"
                            label="以實際成交價結算"
                            hint={`${bestModelName} 排程 × 實際價`}
                            value={formatJPY(bestModelRevActual!)}
                            valueColor="#42a5f5"
                        />
                        <MetricRow
                            dotColor="#ff9800"
                            label="依自身預測估算"
                            hint={`${bestModelName} 排程 × ${bestModelName} 預測價`}
                            value={formatJPY(bestModelRevEstimated!)}
                            valueColor="#ff9800"
                        />
                    </>
                )}
            </KpiBlock>

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'var(--card-border)' }} />

            {/* ── 3. Strategy Efficiency ────────────────────────────── */}
            <KpiBlock
                label="Strategy Efficiency"
                description={effDescription}
                value={efficiency !== null ? `${efficiency.toFixed(1)}%` : '—'}
                accentColor={effColor}
                badge={isEstimated ? 'estimated' : 'actual'}
                tooltip={effTooltip}
            >
                {showEffDual && (
                    <>
                        {efficiencyActual != null && (
                            <MetricRow
                                dotColor="#42a5f5"
                                label="以實際價結算效率"
                                hint="最佳模型實際收益 ÷ 最優收益"
                                value={formatPct(efficiencyActual)}
                                valueColor="#42a5f5"
                            />
                        )}
                        {efficiencyEstimated != null && (
                            <MetricRow
                                dotColor="#ff9800"
                                label="以預測估算效率"
                                hint="最佳模型預測收益 ÷ 最優收益"
                                value={formatPct(efficiencyEstimated)}
                                valueColor="#ff9800"
                            />
                        )}
                    </>
                )}
            </KpiBlock>

            {/* ── 4. Manual ─────────────────────────────────────────── */}
            {manualRev !== null && (
                <>
                    <Divider orientation="vertical" flexItem sx={{ borderColor: 'var(--card-border)' }} />
                    <KpiBlock
                        label="Manual Schedule"
                        description="手動排程執行後的預期收益"
                        value={formatJPY(manualRev)}
                        accentColor="var(--primary)"
                        badge={isEstimated && manualRevEstimated != null ? 'estimated' : 'actual'}
                        tooltip={[
                            '手動排程收益說明：',
                            '',
                            '• 以實際成交價結算\n  手動設定的排程，以實際成交價計算實現收益（最真實的結果）',
                            ...(manualRevEstimated != null
                                ? [`• 以預測基準價估算\n  相同排程以「${priceBasis}」預測價格計算的預估收益`]
                                : []),
                            '',
                            '注意：若手動排程未受 Cycle_limit 約束，收益可能高於模型最優，僅供參考。',
                        ].join('\n')}
                    >
                        {/* Revenue at actual prices */}
                        {manualRevActual != null && (
                            <MetricRow
                                dotColor="#42a5f5"
                                label="以實際成交價結算"
                                hint="手動排程 × 實際價"
                                value={formatJPY(manualRevActual)}
                                valueColor="#42a5f5"
                            />
                        )}
                        {/* Revenue at basis model's predicted prices */}
                        {manualRevEstimated != null && (
                            <MetricRow
                                dotColor="#ff9800"
                                label="以預測基準價估算"
                                hint={`手動排程 × ${isEstimated ? priceBasis.split('|').pop() : '基準'} 預測價`}
                                value={formatJPY(manualRevEstimated)}
                                valueColor="#ff9800"
                            />
                        )}
                        {/* Efficiency vs optimal */}
                        {showManualEff && (
                            <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px dashed', borderColor: 'divider' }}>
                                <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', mb: 0.25 }}>
                                    對比最優收益
                                </Typography>
                                {manualEfficiencyActual != null && (
                                    <MetricRow
                                        dotColor="#42a5f5"
                                        label="以實際價結算效率"
                                        hint="手動實際收益 ÷ 最優收益"
                                        value={formatPct(manualEfficiencyActual)}
                                        valueColor="#42a5f5"
                                    />
                                )}
                                {manualEfficiencyEstimated != null && (
                                    <MetricRow
                                        dotColor="#ff9800"
                                        label="以預測估算效率"
                                        hint="手動預測收益 ÷ 最優收益"
                                        value={formatPct(manualEfficiencyEstimated)}
                                        valueColor="#ff9800"
                                    />
                                )}
                            </Box>
                        )}
                        {/* Cycle limit warning */}
                        {optimalRev !== null && manualRev > optimalRev && (
                            <Box sx={{ mt: 0.6, px: 0.75, py: 0.4, bgcolor: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.35)', borderRadius: 1 }}>
                                <Typography sx={{ fontSize: '0.62rem', color: '#f97316', lineHeight: 1.5 }}>
                                    ⚠ 未受 Cycle_limit ({cycleLimit ?? '?'}) 約束，比較僅供參考
                                    {manualEffectiveCycles != null && `（等效 ${manualEffectiveCycles.toFixed(2)} 次循環）`}
                                </Typography>
                            </Box>
                        )}
                    </KpiBlock>
                </>
            )}
        </Box>
    );
}
