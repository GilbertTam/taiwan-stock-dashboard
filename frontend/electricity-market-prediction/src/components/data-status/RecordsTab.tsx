'use client';

import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TablePagination,
    Chip,
    IconButton,
    MenuItem,
    Select,
    Skeleton,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTheme } from '@/app/ThemeProvider';
import { fetchCoverageRecords, fetchPredictionCalculateTimes, RecordRow } from '@/services/dataStatusApi';
import { getRecordColumns } from '@/constants/dataStatusColumns';
import { AREA_JP } from './DataStatusControls';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    sourceKey: string;
    area: string;
    date: string;                               // YYYYMMDD
    interval: 'hour' | '30m' | 'day';
    slotFilter: number | null;
    onSlotFilterChange: (slot: number | null) => void;
    onOpenFullPage?: () => void;                // optional: navigate to full-page raw data view
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumeric(v: unknown): string {
    if (v === null || v === undefined) return '─';
    const n = Number(v);
    if (isNaN(n)) return String(v);
    if (Number.isInteger(n)) return n.toLocaleString();
    return n.toFixed(4);
}

function slotIndexToLabel(slot: number, interval: 'hour' | '30m' | 'day'): string {
    if (interval === 'day') return '全日';
    if (interval === '30m') {
        const h = Math.floor(slot / 2);
        const m = slot % 2 === 0 ? '00' : '30';
        return `${h.toString().padStart(2, '0')}:${m}`;
    }
    return `${slot.toString().padStart(2, '0')}:00`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const RecordsTab: React.FC<Props> = ({
    sourceKey, area, date, interval, slotFilter, onSlotFilterChange, onOpenFullPage,
}) => {
    const { darkMode } = useTheme();

    const [rows, setRows]       = useState<RecordRow[]>([]);
    const [total, setTotal]     = useState(0);
    const [page, setPage]       = useState(0);
    const [perPage, setPerPage] = useState(20);
    const [loading, setLoading] = useState(false);

    // ── Calculate-time filter (prediction sources only) ───────────────────────
    const isPrediction = sourceKey.startsWith('prediction_');
    const [calcTimes,     setCalcTimes]     = useState<string[]>([]);
    const [calcTimeFilter, setCalcTimeFilter] = useState<string>('');   // '' = all

    // Fetch available calculate_times when source/area/date changes
    useEffect(() => {
        if (!isPrediction || !sourceKey || !area || !date) {
            setCalcTimes([]);
            setCalcTimeFilter('');
            return;
        }
        fetchPredictionCalculateTimes(sourceKey, area, date)
            .then(times => {
                setCalcTimes(times);
                // Auto-select the most recent run as default
                setCalcTimeFilter(times[0] ?? '');
            })
            .catch(() => { setCalcTimes([]); setCalcTimeFilter(''); });
    }, [isPrediction, sourceKey, area, date]);

    const isEventSource = sourceKey === 'occto_event';
    const columns = getRecordColumns(sourceKey);

    // Reset page when any filter / cell changes
    useEffect(() => { setPage(0); }, [slotFilter, calcTimeFilter, sourceKey, area, date]);

    useEffect(() => {
        if (!sourceKey || !area || !date) return;
        setLoading(true);
        fetchCoverageRecords(
            sourceKey, area, date,
            slotFilter ?? undefined,
            calcTimeFilter || undefined,
            page, perPage,
        )
            .then(r => { setRows(r.rows); setTotal(r.total); })
            .catch(() => { setRows([]); setTotal(0); })
            .finally(() => setLoading(false));
    }, [sourceKey, area, date, slotFilter, calcTimeFilter, page, perPage]);

    // ── Theme ─────────────────────────────────────────────────────────────────
    const border    = darkMode ? '#2d2f3e' : '#e0e0e0';
    const textPri   = darkMode ? '#e8e8e8' : '#111111';
    const textSec   = darkMode ? '#8a8fa0' : '#6b7280';
    const headerBg  = darkMode ? '#1a1c25' : '#f5f5f5';
    const rowHover  = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
    const chipColor = '#ff7043';

    const skeletonCount = Math.min(perPage, 5);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Filter bar */}
            <Box sx={{
                px: 2, py: 0.75, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
                borderBottom: `1px solid ${border}`,
            }}>
                {/* Calculate-time selector (prediction sources only) */}
                {isPrediction && calcTimes.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Typography sx={{ fontSize: '0.68rem', color: textSec, whiteSpace: 'nowrap' }}>
                            計算日:
                        </Typography>
                        <Select
                            size="small"
                            value={calcTimeFilter}
                            onChange={e => setCalcTimeFilter(e.target.value)}
                            displayEmpty
                            sx={{
                                fontSize: '0.72rem',
                                height: 24,
                                '& .MuiSelect-select': { py: 0.25, px: 0.75 },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
                            }}
                        >
                            <MenuItem value="" sx={{ fontSize: '0.72rem' }}>全部 ({calcTimes.length} 筆計算)</MenuItem>
                            {calcTimes.map(ct => (
                                <MenuItem key={ct} value={ct} sx={{ fontSize: '0.72rem' }}>
                                    {ct}
                                    {ct === calcTimes[0] && (
                                        <Box component="span" sx={{ ml: 0.75, fontSize: '0.62rem', color: textSec }}>（最新）</Box>
                                    )}
                                </MenuItem>
                            ))}
                        </Select>
                    </Box>
                )}

                {slotFilter !== null && (
                    <Chip
                        size="small"
                        label={`時段: ${slotIndexToLabel(slotFilter, interval)}`}
                        onDelete={() => onSlotFilterChange(null)}
                        variant="outlined"
                        sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            borderColor: chipColor,
                            color: chipColor,
                            '& .MuiChip-deleteIcon': { color: chipColor, fontSize: '0.85rem' },
                        }}
                    />
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                    <Typography sx={{ fontSize: '0.72rem', color: textSec }}>
                        {loading ? '…' : `共 ${total.toLocaleString()} 筆`}
                    </Typography>
                    {onOpenFullPage && (
                        <IconButton
                            size="small"
                            onClick={onOpenFullPage}
                            title="在完整頁面開啟原始資料"
                            sx={{ color: textSec, p: 0.4 }}
                        >
                            <OpenInNewIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                    )}
                </Box>
            </Box>

            {/* Content area */}
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {isEventSource ? (
                    /* ── Event card list ─────────────────────────────────── */
                    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {loading ? (
                            Array.from({ length: skeletonCount }).map((_, i) => (
                                <Skeleton key={i} variant="rounded" height={64} />
                            ))
                        ) : rows.length === 0 ? (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: '0.82rem', color: textSec }}>
                                    {slotFilter !== null ? '該時段無事件記錄' : '當日無事件記錄'}
                                </Typography>
                            </Box>
                        ) : (
                            rows.map((row, i) => {
                                const f = row.fields;
                                const areaVal = String(f.area ?? area);
                                const desc    = String(f.description ?? f.Description ?? '（無描述）');
                                const val     = f.value !== null && f.value !== undefined ? f.value : null;
                                return (
                                    <Box key={i} sx={{
                                        px: 1.5, py: 1, borderRadius: 1,
                                        border: `1px solid ${border}`,
                                        backgroundColor: darkMode ? '#1e202b' : '#f8f9fb',
                                    }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: textSec, fontFamily: 'monospace', mb: 0.25 }}>
                                            {row.timestamp.slice(0, 16).replace('T', ' ')}
                                            &nbsp;&nbsp;
                                            {AREA_JP[areaVal] ?? areaVal}
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.8rem', color: textPri }}>{desc}</Typography>
                                        {val !== null && (
                                            <Typography sx={{ fontSize: '0.72rem', color: textSec, mt: 0.25 }}>
                                                值：{String(val)}
                                            </Typography>
                                        )}
                                    </Box>
                                );
                            })
                        )}
                    </Box>

                ) : columns.length === 0 ? (
                    /* ── No column definition (unsupported source) ───────── */
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: '0.82rem', color: textSec }}>
                            此資料來源不支援明細查詢
                        </Typography>
                    </Box>

                ) : (
                    /* ── Data table ──────────────────────────────────────── */
                    <Table size="small" stickyHeader sx={{ tableLayout: 'auto' }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{
                                    width: 60, flexShrink: 0,
                                    backgroundColor: headerBg, color: textSec,
                                    fontSize: '0.68rem', fontWeight: 700,
                                    px: 1, py: 0.75,
                                }}>
                                    時間
                                </TableCell>
                                {columns.map(col => (
                                    <TableCell key={col.field} align={col.text ? 'left' : 'right'} sx={{
                                        backgroundColor: headerBg, color: textSec,
                                        fontSize: '0.68rem', fontWeight: 700,
                                        px: 1, py: 0.75, whiteSpace: 'nowrap',
                                    }}>
                                        {col.label}
                                        {col.unit && (
                                            <Box component="span" sx={{ display: 'block', fontSize: '0.6rem', opacity: 0.7 }}>
                                                {col.unit}
                                            </Box>
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {loading ? (
                                Array.from({ length: skeletonCount }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell sx={{ px: 1 }}>
                                            <Skeleton variant="text" width={40} />
                                        </TableCell>
                                        {columns.map(col => (
                                            <TableCell key={col.field} sx={{ px: 1 }}>
                                                <Skeleton variant="text" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4 }}>
                                        <Typography sx={{ fontSize: '0.82rem', color: textSec }}>
                                            {slotFilter !== null ? '該時段無資料' : '當日無資料'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row, i) => (
                                    <TableRow key={i} hover sx={{ '&:hover': { backgroundColor: rowHover } }}>
                                        <TableCell sx={{
                                            px: 1, fontFamily: 'monospace',
                                            fontSize: '0.72rem', color: textSec, whiteSpace: 'nowrap',
                                        }}>
                                            {row.slot_label}
                                        </TableCell>
                                        {columns.map(col => {
                                            const v = row.fields[col.field];
                                            const missing = v === null || v === undefined;
                                            return (
                                                <TableCell key={col.field} align={col.text ? 'left' : 'right'} sx={{
                                                    px: 1,
                                                    fontFamily: col.text ? 'inherit' : 'monospace',
                                                    fontSize: '0.72rem',
                                                    color: missing ? textSec : textPri,
                                                    whiteSpace: col.text ? 'nowrap' : undefined,
                                                }}>
                                                    {col.text ? (missing ? '─' : String(v)) : formatNumeric(v)}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </Box>

            {/* Pagination (only for table sources) */}
            {!isEventSource && columns.length > 0 && (
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={perPage}
                    onRowsPerPageChange={e => { setPerPage(parseInt(e.target.value)); setPage(0); }}
                    rowsPerPageOptions={[10, 20, 50]}
                    sx={{
                        flexShrink: 0,
                        borderTop: `1px solid ${border}`,
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                            fontSize: '0.72rem', color: textSec,
                        },
                        '& .MuiTablePagination-select': { fontSize: '0.72rem' },
                        '& .MuiSvgIcon-root': { fontSize: '1rem' },
                    }}
                />
            )}
        </Box>
    );
};
