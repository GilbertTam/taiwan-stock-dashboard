'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TablePagination,
    TableRow,
    Typography,
} from '@mui/material';
import ArrowBackIcon    from '@mui/icons-material/ArrowBack';
import CloseIcon        from '@mui/icons-material/Close';
import ContentCopyIcon  from '@mui/icons-material/ContentCopy';
import { useTranslation } from 'react-i18next';
import { fetchCoverageRecords, RecordRow } from '@/services/dataStatusApi';
import { useTheme } from '@/app/ThemeProvider';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_KEYS = ['datetime', 'event_time', 'area', 'source', 'calculate_time'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(v: unknown): string {
    if (v === null || v === undefined) return '─';
    if (typeof v === 'number') {
        if (Number.isInteger(v)) return v.toLocaleString();
        return v.toFixed(4);
    }
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

function slotToLabel(slot: number): string {
    if (slot < 24) return `${slot.toString().padStart(2, '0')}:00`;
    const h = Math.floor(slot / 2);
    const m = slot % 2 === 0 ? '00' : '30';
    return `${h.toString().padStart(2, '0')}:${m}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DataStatusRawViewProps {
    sourceKey: string;
    area: string;
    date: string;       // YYYYMMDD
    slot?: number;
    onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DataStatusRawView: React.FC<DataStatusRawViewProps> = ({
    sourceKey, area, date, slot, onClose,
}) => {
    const { darkMode } = useTheme();
    const { t } = useTranslation('dataStatus');

    const [rows,    setRows]    = useState<RecordRow[]>([]);
    const [total,   setTotal]   = useState(0);
    const [page,    setPage]    = useState(0);
    const [perPage, setPerPage] = useState(50);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState<string | null>(null);
    const [copied,  setCopied]  = useState(false);

    // JSON viewer modal
    const [viewedRow, setViewedRow] = useState<RecordRow | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchCoverageRecords(sourceKey, area, date, slot, undefined, page, perPage)
            .then(r => { setRows(r.rows); setTotal(r.total); })
            .catch(() => setError(t('rawView.loadError')))
            .finally(() => setLoading(false));
    }, [sourceKey, area, date, slot, page, perPage]);

    // Derive all column keys dynamically from the first 20 rows
    const allFieldKeys = useMemo(() => {
        const keySet = new Set<string>();
        rows.slice(0, 20).forEach(r => Object.keys(r.fields).forEach(k => keySet.add(k)));
        return Array.from(keySet);
    }, [rows]);

    const orderedKeys = useMemo(() => {
        const priority = PRIORITY_KEYS.filter(k => allFieldKeys.includes(k));
        const rest     = allFieldKeys.filter(k => !PRIORITY_KEYS.includes(k)).sort();
        return [...priority, ...rest];
    }, [allFieldKeys]);

    const handleCopy = useCallback(() => {
        if (!viewedRow) return;
        navigator.clipboard.writeText(JSON.stringify(viewedRow.fields, null, 2)).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }, [viewedRow]);

    // ── Theme ─────────────────────────────────────────────────────────────────
    const bg       = darkMode ? '#16171e' : '#ffffff';
    const border   = darkMode ? '#2d2f3e' : '#e0e0e0';
    const textPri  = darkMode ? '#e8e8e8' : '#111111';
    const textSec  = darkMode ? '#8a8fa0' : '#6b7280';
    const headerBg = darkMode ? '#1a1c25' : '#f5f5f5';
    const rowHover = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
    const dialogBg = darkMode ? '#1a1c25' : '#fafafa';

    const dateDisplay = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    const slotLabel   = slot !== undefined ? slotToLabel(slot) : null;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Box sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: bg,
            overflow: 'hidden',
        }}>
            {/* ── Header ── */}
            <Box sx={{
                px: 2, py: 1.25, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 1,
                borderBottom: `1px solid ${border}`,
                backgroundColor: bg,
            }}>
                <IconButton size="small" onClick={onClose} sx={{ color: textSec }}>
                    <ArrowBackIcon fontSize="small" />
                </IconButton>

                <Typography sx={{ fontSize: '0.8rem', color: textSec }}>
                    {t('rawView.rawData')}
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: textPri, fontWeight: 600 }}>
                    {sourceKey} / {area} / {dateDisplay}
                </Typography>

                <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
                    {slotLabel && (
                        <Chip
                            size="small"
                            label={t('records.slotLabel', { label: slotLabel })}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 22, borderColor: '#ff7043', color: '#ff7043' }}
                        />
                    )}
                    <Typography sx={{ fontSize: '0.72rem', color: textSec }}>
                        {loading ? '…' : t('rawView.totalRecords', { count: total.toLocaleString() })}
                    </Typography>
                </Box>
            </Box>

            {/* ── Error state ── */}
            {error && (
                <Box sx={{ p: 3 }}>
                    <Alert severity="error">{error}</Alert>
                </Box>
            )}

            {/* ── Records table ── */}
            {!error && (
                <Box sx={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'auto' }}>
                    <Table size="small" stickyHeader sx={{ tableLayout: 'auto', minWidth: 600 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{
                                    backgroundColor: headerBg, color: textSec,
                                    fontSize: '0.68rem', fontWeight: 700,
                                    px: 1.5, py: 0.75, whiteSpace: 'nowrap',
                                    position: 'sticky', left: 0, zIndex: 3,
                                }}>
                                    {t('rawView.tableHeaderTime')}
                                </TableCell>
                                {orderedKeys.map(k => (
                                    <TableCell key={k} sx={{
                                        backgroundColor: headerBg, color: textSec,
                                        fontSize: '0.68rem', fontWeight: 700,
                                        px: 1.5, py: 0.75, whiteSpace: 'nowrap',
                                    }}>
                                        {k}
                                    </TableCell>
                                ))}
                                <TableCell sx={{
                                    backgroundColor: headerBg, color: textSec,
                                    fontSize: '0.68rem', fontWeight: 700,
                                    px: 1.5, py: 0.75,
                                }}>
                                    {/* JSON action column */}
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {loading ? (
                                Array.from({ length: Math.min(perPage, 8) }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: orderedKeys.length + 2 }).map((__, j) => (
                                            <TableCell key={j} sx={{ px: 1.5 }}>
                                                <Skeleton variant="text" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={orderedKeys.length + 2} align="center" sx={{ py: 6 }}>
                                        <Typography sx={{ fontSize: '0.85rem', color: textSec }}>
                                            {slotLabel ? t('rawView.noDataForSlot', { slot: slotLabel }) : t('rawView.noDataForDay')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row, i) => (
                                    <TableRow
                                        key={i}
                                        hover
                                        sx={{ cursor: 'pointer', '&:hover': { backgroundColor: rowHover } }}
                                        onClick={() => setViewedRow(row)}
                                    >
                                        <TableCell sx={{
                                            px: 1.5,
                                            fontFamily: 'monospace',
                                            fontSize: '0.72rem',
                                            color: textSec,
                                            whiteSpace: 'nowrap',
                                            position: 'sticky',
                                            left: 0,
                                            backgroundColor: bg,
                                            zIndex: 1,
                                        }}>
                                            {row.slot_label}
                                        </TableCell>
                                        {orderedKeys.map(k => {
                                            const v = row.fields[k];
                                            const isNull = v === null || v === undefined;
                                            return (
                                                <TableCell key={k} sx={{
                                                    px: 1.5,
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.72rem',
                                                    color: isNull ? textSec : textPri,
                                                    whiteSpace: 'nowrap',
                                                    maxWidth: 200,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}>
                                                    {formatValue(v)}
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell sx={{ px: 1, width: 60 }}>
                                            <Typography sx={{ fontSize: '0.65rem', color: textSec }}>
                                                JSON
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Box>
            )}

            {/* ── Pagination ── */}
            {!error && (
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={perPage}
                    onRowsPerPageChange={e => { setPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[20, 50]}
                    sx={{
                        flexShrink: 0,
                        borderTop: `1px solid ${border}`,
                        backgroundColor: bg,
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                            fontSize: '0.72rem', color: textSec,
                        },
                        '& .MuiTablePagination-select': { fontSize: '0.72rem' },
                        '& .MuiSvgIcon-root': { fontSize: '1rem' },
                    }}
                />
            )}

            {/* ── Loading overlay (initial load) ── */}
            {loading && rows.length === 0 && !error && (
                <Box sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    zIndex: 10,
                }}>
                    <CircularProgress size={36} />
                </Box>
            )}

            {/* ── JSON Viewer Modal ── */}
            <Dialog
                open={!!viewedRow}
                onClose={() => setViewedRow(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        backgroundColor: dialogBg,
                        maxHeight: '80vh',
                        border: `1px solid ${border}`,
                    },
                }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1, px: 2,
                    borderBottom: `1px solid ${border}`,
                }}>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: textPri }}>
                        {t('rawView.documentDetail')}
                        {viewedRow && (
                            <Box component="span" sx={{ fontSize: '0.75rem', fontWeight: 400, color: textSec, ml: 1 }}>
                                {viewedRow.slot_label}
                            </Box>
                        )}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton
                            size="small"
                            onClick={handleCopy}
                            title={t('rawView.copyJson')}
                            sx={{ color: copied ? '#52c41a' : textSec }}
                        >
                            <ContentCopyIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => setViewedRow(null)} sx={{ color: textSec }}>
                            <CloseIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <Box
                        component="pre"
                        sx={{
                            m: 0, p: 2,
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            color: textPri,
                            overflowY: 'auto',
                        }}
                    >
                        {viewedRow ? JSON.stringify(viewedRow.fields, null, 2) : ''}
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );
};
