'use client';

import React from 'react';
import { Box, Typography, Divider, Tooltip, Chip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';

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
                <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {label}
                </Typography>
                {hint && (
                    <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
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
    const { t } = useTranslation('siteRevenue');
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
                    fontSize: '0.72rem',
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
                        label={badge === 'actual' ? t('kpi.actualValue') : t('kpi.estimatedValue')}
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
                fontSize: '0.72rem',
                color: 'text.secondary',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                mb: 0.6,
                lineHeight: 1.4,
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
                    fontSize: '0.7rem',
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
    const { t } = useTranslation('siteRevenue');

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
        ? t('kpi.optimal.labelReference', { name: referenceName })
        : t('kpi.optimal.labelRealized');

    const optimalDescription = isReferenceMode
        ? t('kpi.optimal.descReference', { name: referenceName })
        : t('kpi.optimal.descRealized');

    const optimalTooltip = isReferenceMode
        ? t('kpi.optimal.tooltipReference', { name: referenceName })
        : t('kpi.optimal.tooltipRealized');

    // ── Block 2: Best Model ───────────────────────────────────────────
    const bestModelLabel = isReferenceMode
        ? t('kpi.bestModel.labelReference')
        : isEstimated ? t('kpi.bestModel.labelEstimated') : t('kpi.bestModel.labelRealized');

    const bestModelDescription = isReferenceMode
        ? t('kpi.bestModel.descReference', { name: referenceName })
        : isEstimated
            ? t('kpi.bestModel.descEstimated')
            : t('kpi.bestModel.descRealized');

    const bestModelTooltip = isReferenceMode
        ? t('kpi.bestModel.tooltipReference', { name: referenceName })
        : isEstimated
            ? t('kpi.bestModel.tooltipEstimated', { priceBasis })
            : t('kpi.bestModel.tooltipRealized');

    // ── Block 3: Strategy Efficiency ─────────────────────────────────
    const effDescription = isReferenceMode
        ? t('kpi.efficiency.descReference', { name: referenceName })
        : t('kpi.efficiency.descNormal');

    const effTooltip = isReferenceMode
        ? t('kpi.efficiency.tooltipReference', { name: referenceName })
        : t('kpi.efficiency.tooltipNormal');

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
                            label={t('kpi.bestModel.actualRow')}
                            hint={t('kpi.bestModel.actualRowHint', { name: bestModelName })}
                            value={formatJPY(bestModelRevActual!)}
                            valueColor="#42a5f5"
                        />
                        <MetricRow
                            dotColor="#ff9800"
                            label={t('kpi.bestModel.estimatedRow')}
                            hint={t('kpi.bestModel.estimatedRowHint', { name: bestModelName })}
                            value={formatJPY(bestModelRevEstimated!)}
                            valueColor="#ff9800"
                        />
                    </>
                )}
            </KpiBlock>

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'var(--card-border)' }} />

            {/* ── 3. Strategy Efficiency ────────────────────────────── */}
            <KpiBlock
                label={t('kpi.efficiency.label')}
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
                                label={t('kpi.efficiency.actualRow')}
                                hint={t('kpi.efficiency.actualHint')}
                                value={formatPct(efficiencyActual)}
                                valueColor="#42a5f5"
                            />
                        )}
                        {efficiencyEstimated != null && (
                            <MetricRow
                                dotColor="#ff9800"
                                label={t('kpi.efficiency.estimatedRow')}
                                hint={t('kpi.efficiency.estimatedHint')}
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
                        label={t('kpi.manual.label')}
                        description={t('kpi.manual.desc')}
                        value={formatJPY(manualRev)}
                        accentColor="var(--primary)"
                        badge={isEstimated && manualRevEstimated != null ? 'estimated' : 'actual'}
                        tooltip={[
                            t('kpi.manual.tooltipHeader'),
                            '',
                            t('kpi.manual.tooltipActualLine'),
                            ...(manualRevEstimated != null
                                ? [t('kpi.manual.tooltipEstimatedLine', { priceBasis })]
                                : []),
                            '',
                            t('kpi.manual.tooltipNote'),
                        ].join('\n')}
                    >
                        {/* Revenue at actual prices */}
                        {manualRevActual != null && (
                            <MetricRow
                                dotColor="#42a5f5"
                                label={t('kpi.manual.actualRow')}
                                hint={t('kpi.manual.actualRowHint')}
                                value={formatJPY(manualRevActual)}
                                valueColor="#42a5f5"
                            />
                        )}
                        {/* Revenue at basis model's predicted prices */}
                        {manualRevEstimated != null && (
                            <MetricRow
                                dotColor="#ff9800"
                                label={t('kpi.manual.estimatedRow')}
                                hint={t('kpi.manual.estimatedRowHint', { basis: isEstimated ? priceBasis.split('|').pop() : t('kpi.manual.basisDefault') })}
                                value={formatJPY(manualRevEstimated)}
                                valueColor="#ff9800"
                            />
                        )}
                        {/* Efficiency vs optimal */}
                        {showManualEff && (
                            <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px dashed', borderColor: 'divider' }}>
                                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mb: 0.25 }}>
                                    {t('kpi.manual.vsOptimal')}
                                </Typography>
                                {manualEfficiencyActual != null && (
                                    <MetricRow
                                        dotColor="#42a5f5"
                                        label={t('kpi.manual.actualEffRow')}
                                        hint={t('kpi.manual.actualEffHint')}
                                        value={formatPct(manualEfficiencyActual)}
                                        valueColor="#42a5f5"
                                    />
                                )}
                                {manualEfficiencyEstimated != null && (
                                    <MetricRow
                                        dotColor="#ff9800"
                                        label={t('kpi.manual.estimatedEffRow')}
                                        hint={t('kpi.manual.estimatedEffHint')}
                                        value={formatPct(manualEfficiencyEstimated)}
                                        valueColor="#ff9800"
                                    />
                                )}
                            </Box>
                        )}
                        {/* Cycle limit warning */}
                        {optimalRev !== null && manualRev > optimalRev && (
                            <Box sx={{ mt: 0.6, px: 0.75, py: 0.4, bgcolor: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.35)', borderRadius: 1 }}>
                                <Typography sx={{ fontSize: '0.7rem', color: '#f97316', lineHeight: 1.5 }}>
                                    {t('kpi.manual.cycleLimitWarning', { limit: cycleLimit ?? '?' })}
                                    {manualEffectiveCycles != null && t('kpi.manual.effectiveCycles', { cycles: manualEffectiveCycles.toFixed(2) })}
                                </Typography>
                            </Box>
                        )}
                    </KpiBlock>
                </>
            )}
        </Box>
    );
}
