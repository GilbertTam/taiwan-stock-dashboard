'use client';

import React, { useEffect, useState } from 'react';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Divider,
    Skeleton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/app/ThemeProvider';
import { fetchCoverageDetail, DetailHourRow } from '@/services/dataStatusApi';
import { getAreaName } from '@/utils/areaI18n';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectedCell {
    sourceKey: string;
    sourceLabel: string;
    area: string;       // lowercase area name or 'system'
    date: string;       // YYYY-MM-DD
    docCount: number;
}

interface Props {
    selectedCell: SelectedCell | null;
    onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d: string) =>
    `${d.slice(0, 4)}/${d.slice(5, 7)}/${d.slice(8, 10)}`;

// ─── Component ────────────────────────────────────────────────────────────────

export const DataStatusDetailDrawer: React.FC<Props> = ({ selectedCell, onClose }) => {
    const { darkMode } = useTheme();
    const { t } = useTranslation('dataStatus');
    const [slotRows, setSlotRows] = useState<DetailHourRow[]>([]);
    const [interval, setInterval] = useState<'hour' | '30m' | 'day'>('hour');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!selectedCell) return;
        setIsLoading(true);
        setSlotRows([]);
        const dateParam = selectedCell.date.replace(/-/g, '');
        fetchCoverageDetail(selectedCell.sourceKey, selectedCell.area, dateParam)
            .then(r => { setSlotRows(r.rows); setInterval(r.interval); })
            .catch(() => setSlotRows([]))
            .finally(() => setIsLoading(false));
    }, [selectedCell]);

    // ── Derived data ──────────────────────────────────────────────────────────
    const totalSlots  = interval === '30m' ? 48 : interval === 'day' ? 1 : 24;
    const totalDocs   = slotRows.reduce((s, r) => s + r.doc_count, 0);
    const slotsOk     = slotRows.filter(r => r.doc_count > 0).length;
    const slotsMissing = totalSlots - slotsOk;
    const missingList  = slotRows.filter(r => r.doc_count === 0).map(r => r.label);

    // ── Status ────────────────────────────────────────────────────────────────
    type Status = 'ok' | 'partial' | 'missing';
    const status: Status =
        isLoading        ? 'ok' :
        slotsMissing === 0          ? 'ok' :
        slotsMissing === totalSlots ? 'missing' : 'partial';

    const STATUS: Record<Status, { label: string; color: string; bg: string }> = {
        ok:      { label: t('status.complete'),  color: '#52c41a', bg: 'rgba(82,196,26,0.18)'  },
        partial: { label: t('status.partial'),   color: '#fa8c16', bg: 'rgba(250,140,22,0.18)' },
        missing: { label: t('status.missing'),   color: '#ff4d4f', bg: 'rgba(255,77,79,0.18)'  },
    };
    const sm = STATUS[status];

    // ── Colors ────────────────────────────────────────────────────────────────
    const bg      = darkMode ? '#16171e' : '#ffffff';
    const border  = darkMode ? '#2d2f3e' : '#e0e0e0';
    const textPri = darkMode ? '#e8e8e8' : '#111111';
    const textSec = darkMode ? '#8a8fa0' : '#6b7280';
    const cellOk  = '#52c41a';
    const cellErr = '#ff4d4f';
    const cellOkDim  = darkMode ? 'rgba(82,196,26,0.18)'  : 'rgba(82,196,26,0.14)';
    const cellErrDim = darkMode ? 'rgba(255,77,79,0.18)'  : 'rgba(255,77,79,0.14)';

    const areaLabel = selectedCell
        ? getAreaName(t, selectedCell.area)
        : '';

    // Grid layout: 6 cols for hourly; 8 cols for 30m; 1 col for daily
    const gridCols = interval === '30m' ? 8 : interval === 'day' ? 1 : 6;
    const cellHeight = interval === '30m' ? 34 : interval === 'day' ? 72 : 40;

    // Label unit for KPI display
    const slotUnit = interval === '30m' ? t('intervals.30minSlot') : interval === 'day' ? t('intervals.dayUnit') : t('intervals.hourUnit');

    return (
        <Drawer
            anchor="right"
            open={!!selectedCell}
            onClose={onClose}
            disableEnforceFocus
            slotProps={{
                paper: {
                    elevation: 8,
                    sx: {
                        width: 380,
                        backgroundColor: bg,
                        borderLeft: `1px solid ${border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    },
                },
                backdrop: {
                    sx: { backgroundColor: 'transparent' },
                },
            }}
        >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <Box sx={{ px: 2, pt: 1.75, pb: 1.25, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1, mr: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: textPri, fontSize: '0.95rem', lineHeight: 1.25 }}>
                            {selectedCell?.sourceLabel}
                        </Typography>
                        <Typography variant="body2" sx={{ color: textSec, fontSize: '0.78rem', mt: 0.25 }}>
                            {areaLabel}
                            {selectedCell && <>&nbsp;·&nbsp;{formatDate(selectedCell.date)}</>}
                            {!isLoading && (
                                <>&nbsp;·&nbsp;<span style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                                    {interval === '30m' ? t('intervals.30min') : interval === 'day' ? t('intervals.daily') : t('intervals.hourly')}
                                </span></>
                            )}
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={onClose} sx={{ color: textSec, mt: -0.25 }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Status badge */}
                <Box
                    sx={{
                        mt: 1.25,
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1.5,
                        backgroundColor: sm.bg,
                        border: `1.5px solid ${sm.color}`,
                    }}
                >
                    {isLoading
                        ? <Skeleton variant="text" width={80} />
                        : <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: sm.color }}>{sm.label}</Typography>
                    }
                </Box>
            </Box>

            <Divider sx={{ borderColor: border }} />

            {/* ── KPI row ─────────────────────────────────────────────────── */}
            <Box sx={{ px: 2, py: 1.25, flexShrink: 0, display: 'flex', gap: 1 }}>
                {[
                    { label: t('drawer.totalRecords'),   value: isLoading ? '…' : totalDocs, accent: undefined },
                    { label: t('drawer.hasData'),        value: isLoading ? '…' : `${slotsOk} / ${totalSlots} ${slotUnit}`, accent: cellOk },
                    { label: t('drawer.missingSlots'),   value: isLoading ? '…' : `${slotsMissing} ${slotUnit}`, accent: slotsMissing > 0 ? cellErr : cellOk },
                ].map(({ label, value, accent }) => (
                    <Box
                        key={label}
                        sx={{
                            flex: 1,
                            px: 1,
                            py: 0.75,
                            border: `1px solid ${border}`,
                            borderLeft: accent ? `3px solid ${accent}` : `1px solid ${border}`,
                            borderRadius: 1,
                            backgroundColor: darkMode ? '#1e202b' : '#f8f9fb',
                        }}
                    >
                        <Typography sx={{ fontSize: '0.64rem', color: textSec, display: 'block' }}>{label}</Typography>
                        <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: accent ?? textPri }}>{value}</Typography>
                    </Box>
                ))}
            </Box>

            <Divider sx={{ borderColor: border }} />

            {/* ── Slot grid ───────────────────────────────────────────────── */}
            <Box sx={{ px: 2, pt: 1.25, flexShrink: 0 }}>
                <Typography sx={{ fontSize: '0.72rem', color: textSec, mb: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {interval === '30m' ? t('drawer.slotStatus30m') : interval === 'day' ? t('drawer.slotStatusDaily') : t('drawer.slotStatusHourly')}
                </Typography>

                {isLoading ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 0.5 }}>
                        {Array.from({ length: totalSlots }).map((_, i) => (
                            <Skeleton key={i} variant="rounded" height={cellHeight} />
                        ))}
                    </Box>
                ) : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: '3px' }}>
                        {slotRows.map(({ slot, label, doc_count }) => {
                            const hasData = doc_count > 0;
                            const displayLabel = interval === 'day' ? t('intervals.fullDay') : label;
                            return (
                                <Box
                                    key={slot}
                                    title={t('drawer.slotTitle', { label: displayLabel, count: doc_count })}
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: cellHeight,
                                        borderRadius: '5px',
                                        border: `1.5px solid ${hasData ? cellOk : cellErr}`,
                                        backgroundColor: hasData ? cellOkDim : cellErrDim,
                                        cursor: 'default',
                                    }}
                                >
                                    <Typography sx={{ fontSize: interval === '30m' ? '0.52rem' : interval === 'day' ? '0.82rem' : '0.6rem', fontWeight: 700, color: hasData ? cellOk : cellErr, lineHeight: 1 }}>
                                        {displayLabel}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.52rem', color: textSec, lineHeight: 1.2 }}>
                                        {doc_count > 0 ? doc_count : '─'}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                )}

                {/* Legend */}
                <Box sx={{ display: 'flex', gap: 2, mt: 1, mb: 0.5 }}>
                    {[{ color: cellOk, label: t('drawer.legendHasData') }, { color: cellErr, label: t('drawer.legendMissing') }].map(({ color, label }) => (
                        <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '3px', backgroundColor: color }} />
                            <Typography sx={{ fontSize: '0.65rem', color: textSec }}>{label}</Typography>
                        </Box>
                    ))}
                </Box>
            </Box>

            <Divider sx={{ borderColor: border, mt: 0.5 }} />

            {/* ── Missing slots list ──────────────────────────────────────── */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pt: 1.25, pb: 2 }}>
                <Typography sx={{ fontSize: '0.72rem', color: textSec, mb: 0.75, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {t('drawer.missingSlotsList')}
                </Typography>

                {isLoading ? (
                    <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
                ) : missingList.length === 0 ? (
                    <Box sx={{ py: 1.5, px: 1.5, borderRadius: 1, backgroundColor: cellOkDim, border: `1px solid ${cellOk}` }}>
                        <Typography sx={{ fontSize: '0.8rem', color: cellOk, fontWeight: 600 }}>{t('drawer.noMissingSlots')}</Typography>
                    </Box>
                ) : (
                    <Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                            {missingList.map(t => (
                                <Box
                                    key={t}
                                    sx={{
                                        px: 1,
                                        py: 0.35,
                                        borderRadius: 1,
                                        backgroundColor: cellErrDim,
                                        border: `1px solid ${cellErr}`,
                                    }}
                                >
                                    <Typography sx={{ fontSize: '0.75rem', color: cellErr, fontWeight: 600, fontFamily: 'monospace' }}>
                                        {t}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                        <Typography sx={{ fontSize: '0.68rem', color: textSec }}>
                            {t('drawer.totalMissing', { count: missingList.length, unit: slotUnit })}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Drawer>
    );
};
