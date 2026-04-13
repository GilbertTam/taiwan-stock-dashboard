'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
    Box,
    Typography,
    Tooltip,
    TextField,
    Button,
    ToggleButton,
    ToggleButtonGroup,
    IconButton,
} from '@mui/material';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import BoltIcon from '@mui/icons-material/Bolt';
import { ManualSlot, BatteryConfig } from '@/types/revenueAnalysis';
import { simulateManualClient, ManualSimPreviewSlot } from '@/utils/manualSimulationClient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/app/ThemeProvider';

// Time labels for 48 slots
const TIME_LABELS: string[] = [];
for (let h = 0; h < 24; h++) {
    TIME_LABELS.push(`${String(h).padStart(2, '0')}:00`);
    TIME_LABELS.push(`${String(h).padStart(2, '0')}:30`);
}

const CLAMPED_BORDER = '#facc15';

interface ManualScheduleEditorProps {
    slots: ManualSlot[];
    config: BatteryConfig;
    onChange: (slots: ManualSlot[]) => void;
    spotPrices?: number[]; // optional, for SoC & revenue preview
    initialSocMwh?: number; // optional: starting SoC for cross-day carry-over
}

export default function ManualScheduleEditor({
    slots,
    config,
    onChange,
    spotPrices,
    initialSocMwh,
}: ManualScheduleEditorProps) {
    const { t } = useTranslation('siteRevenue');
    const { darkMode } = useTheme();

    const ACTION_COLORS = useMemo(() => ({
        Idle:      darkMode ? 'rgba(128, 128, 128, 0.18)' : 'rgba(128, 128, 128, 0.18)',
        Charge:    darkMode ? 'rgba(46, 125, 50, 0.78)'   : 'rgba(46, 125, 50, 0.45)',
        Discharge: darkMode ? 'rgba(198, 40, 40, 0.78)'   : 'rgba(198, 40, 40, 0.45)',
    }), [darkMode]);

    const [activeAction, setActiveAction] = useState<'Idle' | 'Charge' | 'Discharge'>('Charge');
    const [activePower, setActivePower] = useState<string>(''); // '' = P_max
    // Batch range
    const [batchFrom, setBatchFrom] = useState<number>(0);
    const [batchTo,   setBatchTo]   = useState<number>(7);

    // Drag-to-fill
    const isDragging = useRef(false);

    // Build a full 48-slot array from sparse input
    const fullSlots = useMemo<ManualSlot[]>(
        () => Array.from({ length: 48 }, (_, i) => slots[i] ?? { timeStep: i, action: 'Idle', power: null }),
        [slots]
    );

    // Client-side SoC preview (uses initialSocMwh for cross-day carry-over)
    const preview = useMemo<ManualSimPreviewSlot[]>(
        () => simulateManualClient(fullSlots, config, spotPrices, initialSocMwh).slots,
        [fullSlots, config, spotPrices, initialSocMwh]
    );

    // Count clamped slots for warning banner
    const clampStats = useMemo(() => {
        let fullyClamped = 0;
        let partiallyClamped = 0;
        preview.forEach((p, i) => {
            if (!p.wasClamped || fullSlots[i]?.action === 'Idle') return;
            if (p.effectivePower < 1e-6) fullyClamped++;
            else partiallyClamped++;
        });
        return { fullyClamped, partiallyClamped };
    }, [preview, fullSlots]);

    // Clear fully-clamped (ineffective) slots back to Idle
    const handleClearIneffective = useCallback(() => {
        const next = fullSlots.map((slot, t) => {
            const p = preview[t];
            if (slot.action !== 'Idle' && p?.wasClamped && (p?.effectivePower ?? 0) < 1e-6) {
                return { timeStep: t, action: 'Idle' as const, power: null };
            }
            return slot;
        });
        onChange(next);
    }, [fullSlots, preview, onChange]);

    const parsedPower = activePower === '' ? null : parseFloat(activePower) || null;
    const maxPower = activeAction === 'Charge' ? config.P_max_ch : config.P_max_dis;

    // Apply action to a single slot
    const applySlot = useCallback((t: number) => {
        const next = [...fullSlots];
        if (activeAction === 'Idle') {
            next[t] = { timeStep: t, action: 'Idle', power: null };
        } else {
            next[t] = { timeStep: t, action: activeAction, power: parsedPower };
        }
        onChange(next);
    }, [fullSlots, activeAction, parsedPower, onChange]);

    const handleMouseDown = useCallback((e: React.MouseEvent, t: number) => {
        e.preventDefault();
        isDragging.current = true;
        applySlot(t);
    }, [applySlot]);

    const handleMouseEnter = useCallback((t: number) => {
        if (isDragging.current) applySlot(t);
    }, [applySlot]);

    const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

    // Batch apply range
    const handleBatchApply = () => {
        const from = Math.min(batchFrom, batchTo);
        const to   = Math.max(batchFrom, batchTo);
        const next = [...fullSlots];
        for (let t = from; t <= to; t++) {
            if (activeAction === 'Idle') {
                next[t] = { timeStep: t, action: 'Idle', power: null };
            } else {
                next[t] = { timeStep: t, action: activeAction, power: parsedPower };
            }
        }
        onChange(next);
    };

    const handleClearAll = () => {
        onChange(Array.from({ length: 48 }, (_, i) => ({ timeStep: i, action: 'Idle' as const, power: null })));
    };

    const socMin  = config.SoC_min_pct  * 100;
    const socMax  = config.SoC_max_pct  * 100;
    const socInit = config.SoC_init_pct * 100;

    return (
        <Box
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            sx={{ userSelect: 'none' }}
        >
            {/* ── Mode Toolbar ── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ToggleButtonGroup
                    value={activeAction}
                    exclusive
                    onChange={(_, v) => { if (v) setActiveAction(v); }}
                    size="small"
                    sx={{
                        '& .MuiToggleButton-root': {
                            py: 0.4, px: 1, fontSize: '0.72rem', textTransform: 'none',
                            border: '1px solid var(--card-border)',
                            color: 'text.secondary',
                        },
                        '& .MuiToggleButton-root.Mui-selected[value="Idle"]':    { bgcolor: darkMode ? 'rgba(128,128,128,0.3)' : 'rgba(128,128,128,0.2)', color: darkMode ? '#ccc' : '#555' },
                        '& .MuiToggleButton-root.Mui-selected[value="Charge"]':    { bgcolor: ACTION_COLORS.Charge, color: darkMode ? '#a5d6a7' : '#1b5e20', borderColor: '#388e3c' },
                        '& .MuiToggleButton-root.Mui-selected[value="Discharge"]': { bgcolor: ACTION_COLORS.Discharge, color: darkMode ? '#ef9a9a' : '#b71c1c', borderColor: '#c62828' },
                    }}
                >
                    <ToggleButton value="Idle">{t('manualEditor.idle')}</ToggleButton>
                    <ToggleButton value="Charge">{t('manualEditor.charge')}</ToggleButton>
                    <ToggleButton value="Discharge">{t('manualEditor.discharge')}</ToggleButton>
                </ToggleButtonGroup>

                {/* Power input for active mode */}
                {activeAction !== 'Idle' && (
                    <TextField
                        size="small"
                        type="number"
                        value={activePower}
                        onChange={e => setActivePower(e.target.value)}
                        placeholder={`${maxPower} MW`}
                        label={t('manualEditor.powerMw')}
                        inputProps={{ min: 0, max: maxPower, step: 0.1 }}
                        sx={{
                            width: 110,
                            '& .MuiInputBase-root': { height: 32 },
                            '& .MuiInputLabel-root': { fontSize: '0.72rem' },
                            '& input': { fontSize: '0.75rem', py: 0.5 },
                        }}
                    />
                )}
                <Box sx={{ flex: 1 }} />
                <Tooltip title={t('manualEditor.clearAll')}>
                    <IconButton size="small" onClick={handleClearAll} sx={{ color: 'text.secondary', p: 0.25 }}>
                        <ClearAllIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* ── Batch Fill Row ── */}
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: 0.75, mb: 1,
                p: 0.75, borderRadius: 1,
                bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border: '1px solid var(--card-border)',
            }}>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {t('manualEditor.batchFill')}
                </Typography>
                <TextField
                    type="number"
                    value={batchFrom}
                    onChange={e => setBatchFrom(Math.min(47, Math.max(0, Number(e.target.value))))}
                    slotProps={{ htmlInput: { min: 0, max: 47, step: 1 } }}
                    size="small"
                    sx={{ width: 68, '& .MuiInputBase-root': { height: 30 }, '& input': { fontSize: '0.78rem', py: 0.5, textAlign: 'center' } }}
                />
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {TIME_LABELS[batchFrom]}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>→</Typography>
                <TextField
                    type="number"
                    value={batchTo}
                    onChange={e => setBatchTo(Math.min(47, Math.max(0, Number(e.target.value))))}
                    slotProps={{ htmlInput: { min: 0, max: 47, step: 1 } }}
                    size="small"
                    sx={{ width: 68, '& .MuiInputBase-root': { height: 30 }, '& input': { fontSize: '0.78rem', py: 0.5, textAlign: 'center' } }}
                />
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {TIME_LABELS[batchTo]}
                </Typography>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<BoltIcon sx={{ fontSize: '0.85rem !important' }} />}
                    onClick={handleBatchApply}
                    sx={{
                        fontSize: '0.68rem', py: 0.25, px: 0.75, minWidth: 0,
                        borderColor: activeAction === 'Charge' ? '#388e3c' : activeAction === 'Discharge' ? '#c62828' : 'var(--card-border)',
                        color: activeAction === 'Charge' ? '#a5d6a7' : activeAction === 'Discharge' ? '#ef9a9a' : 'text.secondary',
                    }}
                >
                    {t('manualEditor.apply')}
                </Button>
            </Box>

            {/* ── Clamped slots warning banner ── */}
            {(clampStats.fullyClamped > 0 || clampStats.partiallyClamped > 0) && (
                <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    px: 1, py: 0.5, mb: 0.75,
                    bgcolor: 'rgba(249, 115, 22, 0.10)',
                    border: '1px solid rgba(249, 115, 22, 0.35)',
                    borderRadius: 1,
                    gap: 1,
                }}>
                    <Typography sx={{ fontSize: '0.65rem', color: '#f97316', flex: 1 }}>
                        {clampStats.fullyClamped > 0 && t('manualEditor.invalidOps', { count: clampStats.fullyClamped })}
                        {clampStats.fullyClamped > 0 && clampStats.partiallyClamped > 0 && '、'}
                        {clampStats.partiallyClamped > 0 && t('manualEditor.powerReduced', { count: clampStats.partiallyClamped })}
                    </Typography>
                    {clampStats.fullyClamped > 0 && (
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={handleClearIneffective}
                            sx={{
                                fontSize: '0.6rem', py: 0.2, px: 0.75, minWidth: 0, flexShrink: 0,
                                borderColor: '#f97316', color: '#f97316',
                                '&:hover': { bgcolor: 'rgba(249,115,22,0.12)', borderColor: '#f97316' },
                            }}
                        >
                            {t('manualEditor.clearInvalid')}
                        </Button>
                    )}
                </Box>
            )}

            {/* ── 4×12 Cell Grid (12 cols = 6 h/row) ── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2px', mb: 1 }}>
                {fullSlots.map((slot, si) => {
                    const prev = preview[si];
                    const isFullyClamped = prev?.wasClamped && slot.action !== 'Idle' && (prev?.effectivePower ?? 0) < 1e-6;
                    const isPartiallyClamped = prev?.wasClamped && slot.action !== 'Idle' && (prev?.effectivePower ?? 0) >= 1e-6;
                    const isClamped = isFullyClamped || isPartiallyClamped;
                    const hasPower = slot.power != null && slot.action !== 'Idle';
                    return (
                        <Tooltip
                            key={si}
                            title={
                                <Box sx={{ fontSize: '0.7rem', lineHeight: 1.5 }}>
                                    <b>{TIME_LABELS[si]}</b><br />
                                    {t('manualEditor.tooltipAction')}{slot.action}<br />
                                    {hasPower ? `${t('manualEditor.tooltipSetPower')}${slot.power} MW` : `${t('manualEditor.tooltipPower')}${prev?.effectivePower.toFixed(1) ?? '-'} MW`}<br />
                                    {t('manualEditor.tooltipSoc')}{prev ? `${prev.socPct.toFixed(1)}%` : '-'}
                                    {isFullyClamped && <><br /><span style={{ color: '#f97316' }}>{t('manualEditor.tooltipInvalid')}</span></>}
                                    {isPartiallyClamped && <><br /><span style={{ color: CLAMPED_BORDER }}>{t('manualEditor.tooltipReduced')}{prev?.effectivePower.toFixed(1)} MW</span></>}
                                </Box>
                            }
                            placement="top"
                            enterDelay={150}
                        >
                            <Box
                                onMouseDown={e => handleMouseDown(e, si)}
                                onMouseEnter={() => handleMouseEnter(si)}
                                sx={{
                                    height: 30,
                                    borderRadius: '2px',
                                    bgcolor: ACTION_COLORS[slot.action],
                                    border: isFullyClamped
                                        ? `2px solid #f97316`
                                        : isPartiallyClamped
                                            ? `1.5px solid ${CLAMPED_BORDER}`
                                            : `1px solid ${slot.action === 'Idle'
                                                ? (darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)')
                                                : (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)')}`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'filter 0.1s ease',
                                    '&:hover': { filter: 'brightness(1.35)' },
                                    position: 'relative',
                                    overflow: 'hidden',
                                    px: 0.25,
                                }}
                            >
                                <Typography sx={{ fontSize: '0.48rem', lineHeight: 1, fontWeight: 600, color: slot.action === 'Idle'
                                    ? (darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)')
                                    : (darkMode ? 'rgba(255,255,255,0.9)' : '#fff'), whiteSpace: 'nowrap' }}>
                                    {TIME_LABELS[si]}
                                </Typography>
                                {hasPower && (
                                    <Typography sx={{ fontSize: '0.42rem', lineHeight: 1, color: darkMode ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.85)' }}>
                                        {slot.power}MW
                                    </Typography>
                                )}
                                {isClamped && (
                                    <Box sx={{ position: 'absolute', top: 1, right: 1, width: 4, height: 4, borderRadius: '50%', bgcolor: isFullyClamped ? '#f97316' : CLAMPED_BORDER }} />
                                )}
                            </Box>
                        </Tooltip>
                    );
                })}
            </Box>

            {/* ── SoC Preview Bar ── */}
            <Box sx={{ mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                        {t('manualEditor.socPreview')}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                        {socMin.toFixed(0)}%–{socMax.toFixed(0)}%  ({t('manualEditor.initPct', { val: socInit.toFixed(0) })})
                    </Typography>
                </Box>
                <Box sx={{
                    width: '100%', height: 28, position: 'relative',
                    bgcolor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    borderRadius: 1,
                    border: '1px solid var(--card-border)',
                    overflow: 'hidden',
                }}>
                    {/* SoC range shading */}
                    <Box sx={{
                        position: 'absolute',
                        left: 0, right: 0,
                        bottom: `${socMin}%`,
                        height: `${socMax - socMin}%`,
                        bgcolor: 'rgba(33,150,243,0.07)',
                    }} />
                    {/* SoC line */}
                    <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }} preserveAspectRatio="none">
                        <polyline
                            points={preview.map((s, i) => {
                                const x = (i / 47) * 100;
                                const y = 100 - s.socPct;
                                return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="rgba(33,150,243,0.85)"
                            strokeWidth="1.5"
                        />
                        {/* Min/max lines */}
                        <line x1="0" y1={`${100 - socMin}%`} x2="100%" y2={`${100 - socMin}%`} stroke="rgba(198,40,40,0.4)" strokeWidth="1" strokeDasharray="4 3" />
                        <line x1="0" y1={`${100 - socMax}%`} x2="100%" y2={`${100 - socMax}%`} stroke="rgba(76,175,80,0.4)"  strokeWidth="1" strokeDasharray="4 3" />
                    </svg>
                </Box>
            </Box>

            {/* Legend */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {(['Charge', 'Discharge', 'Idle'] as const).map(a => (
                    <Box key={a} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: ACTION_COLORS[a], border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }} />
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                            {a === 'Charge' ? t('manualEditor.charge') : a === 'Discharge' ? t('manualEditor.discharge') : t('manualEditor.idle')}
                        </Typography>
                    </Box>
                ))}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '2px', border: '2px solid #f97316', bgcolor: 'transparent' }} />
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>{t('manualEditor.invalidOp')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CLAMPED_BORDER }} />
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>{t('manualEditor.socClamped')}</Typography>
                </Box>
            </Box>
        </Box>
    );
}
