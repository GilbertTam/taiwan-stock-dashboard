'use client';

import React, { useState } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Typography,
    Chip,
    TableSortLabel,
    Tooltip,
} from '@mui/material';
import { GanttOperation } from '@/types/revenueAnalysis';
import { format } from 'date-fns';
import { useTheme } from '@/app/ThemeProvider';

interface OperationScheduleTableProps {
    data: GanttOperation[];
    height?: number;
    /** When true, show action/power/revenue even if pricePredicted is null (Manual schedule) */
    isManualSchedule?: boolean;
    /** When true, show action/power/revenue even if pricePredicted is null (Optimal schedule uses actual prices, pricePredicted is always null) */
    isOptimalSchedule?: boolean;
    /** 'actual' | modelKey — when not 'actual', show revenueEstimated instead of revenueRealized */
    priceBasis?: string;
    /** Per-row revenue override keyed by op.datetime (cross-model: model Y's ops at model X's prices). */
    revenueOverrides?: Record<string, number> | null;
}

type Order = 'asc' | 'desc';
type OrderBy = keyof GanttOperation | 'timeCode';

/**
 * 儲能操作明細表 | Energy storage operation details table
 * 顯示每小時/每半小時的充放電狀態與收益 (Displays hourly/half-hourly charge/discharge state and revenue)
 */
export const OperationScheduleTable: React.FC<OperationScheduleTableProps> = ({
    data,
    height = 400,
    isManualSchedule = false,
    isOptimalSchedule = false,
    priceBasis = 'actual',
    revenueOverrides = null,
}) => {
    const isEstimated = priceBasis !== 'actual';
    const { darkMode } = useTheme();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [order, setOrder] = useState<Order>('asc');
    const [orderBy, setOrderBy] = useState<OrderBy>('datetime');

    const handleRequestSort = (property: OrderBy) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Helper for action colors
    const getActionColor = (action: string) => {
        switch (action) {
            case 'Charge': return 'success';
            case 'Spot': return 'error';
            case 'Discharge': return 'error';
            case 'Balance': return 'warning';
            default: return 'default';
        }
    };

    // Sorting: primary by datetime, secondary by timeCode
    const sortedData = React.useMemo(() => {
        return [...data].sort((a, b) => {
            const dtCmp = (a.datetime || '').localeCompare(b.datetime || '');
            if (dtCmp !== 0) return order === 'asc' ? dtCmp : -dtCmp;
            const tcA = a.timeCode ?? (a.timeStep != null ? (a.timeStep % 48) + 1 : 0);
            const tcB = b.timeCode ?? (b.timeStep != null ? (b.timeStep % 48) + 1 : 0);
            const tcCmp = tcA - tcB;
            return order === 'asc' ? tcCmp : -tcCmp;
        });
    }, [data, order, orderBy]);

    const visibleRows = React.useMemo(
        () => sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [sortedData, page, rowsPerPage]
    );

    return (
        <Paper sx={{ width: '100%', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
            <TableContainer sx={{ maxHeight: height }}>
                <Table stickyHeader aria-label="operation table" size="small">
                    <TableHead>
                        <TableRow sx={{ '& th': { bgcolor: darkMode ? '#1e1e1e' : '#f5f5f5', zIndex: 1 } }}>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'datetime'}
                                    direction={orderBy === 'datetime' ? order : 'asc'}
                                    onClick={() => handleRequestSort('datetime')}
                                >
                                    時間 (Time)
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">
                                <TableSortLabel
                                    active={orderBy === 'timeCode'}
                                    direction={orderBy === 'timeCode' ? order : 'asc'}
                                    onClick={() => handleRequestSort('timeCode')}
                                >
                                    時段 (Time Code)
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">
                                <TableSortLabel
                                    active={orderBy === 'action'}
                                    direction={orderBy === 'action' ? order : 'asc'}
                                    onClick={() => handleRequestSort('action')}
                                >
                                    操作 (Action)
                                </TableSortLabel>
                            </TableCell>
                            {isManualSchedule && (
                                <TableCell align="center">SoC限縮</TableCell>
                            )}
                            <TableCell align="right">
                                <TableSortLabel
                                    active={orderBy === 'power'}
                                    direction={orderBy === 'power' ? order : 'asc'}
                                    onClick={() => handleRequestSort('power')}
                                >
                                    功率 (Power) (kW)
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                                <TableSortLabel
                                    active={orderBy === 'priceActual'}
                                    direction={orderBy === 'priceActual' ? order : 'asc'}
                                    onClick={() => handleRequestSort('priceActual' as any)}
                                >
                                    實際價格 (Act. Price)
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                                <TableSortLabel
                                    active={orderBy === 'pricePredicted'}
                                    direction={orderBy === 'pricePredicted' ? order : 'asc'}
                                    onClick={() => handleRequestSort('pricePredicted' as any)}
                                >
                                    預測價格 (Pred. Price)
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                                <TableSortLabel
                                    active={orderBy === 'revenueRealized'}
                                    direction={orderBy === 'revenueRealized' ? order : 'asc'}
                                    onClick={() => handleRequestSort('revenueRealized' as any)}
                                >
                                    {isEstimated ? '預測收益 (Est. JPY)' : '實現收益 (Realized JPY)'}
                                </TableSortLabel>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {visibleRows.map((row, index) => {
                            const timeCode = row.timeCode ?? (row.timeStep % 48) + 1;

                            return (
                                <TableRow hover role="checkbox" tabIndex={-1} key={`${row.datetime}-${index}`}>
                                    <TableCell component="th" scope="row">
                                        {(() => {
                                            if (!row.datetime) return '-';
                                            try {
                                                const d = new Date(row.datetime);
                                                if (isNaN(d.getTime())) return '-';
                                                return format(d, 'MM/dd HH:mm');
                                            } catch {
                                                return '-';
                                            }
                                        })()}
                                    </TableCell>
                                    <TableCell align="center">
                                        {timeCode != null && Number.isFinite(timeCode) ? timeCode : '-'}
                                    </TableCell>
                                    <TableCell align="center">
                                        {(!isManualSchedule && !isOptimalSchedule && row.pricePredicted == null) ? '-' : row.action ? (
                                            <Chip
                                                label={row.action}
                                                color={getActionColor(row.action) as any}
                                                size="small"
                                                variant="outlined"
                                            />
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                    {isManualSchedule && (
                                        <TableCell align="center">
                                            {row.wasClamped ? (
                                                <Tooltip title={`要求: ${row.requestedPower != null ? row.requestedPower.toFixed(2) : '-'} MW → 實際: ${row.power != null ? row.power.toFixed(2) : '0'} MW`}>
                                                    <Chip
                                                        label={row.power != null && row.power < 1e-3 ? '無效' : '縮減'}
                                                        size="small"
                                                        sx={{
                                                            height: 16, fontSize: '0.58rem',
                                                            bgcolor: row.power != null && row.power < 1e-3 ? 'rgba(249,115,22,0.2)' : 'rgba(250,204,21,0.2)',
                                                            color: row.power != null && row.power < 1e-3 ? '#f97316' : '#facc15',
                                                            '& .MuiChip-label': { px: 0.75 },
                                                        }}
                                                    />
                                                </Tooltip>
                                            ) : '-'}
                                        </TableCell>
                                    )}
                                    <TableCell align="right">
                                        {(!isManualSchedule && !isOptimalSchedule && row.pricePredicted == null) ? '-' : (row.power != null && Number.isFinite(row.power) ? row.power.toFixed(2) : '-')}
                                    </TableCell>
                                    <TableCell align="right">
                                        {row.priceActual != null && Number.isFinite(row.priceActual)
                                            ? row.priceActual.toFixed(2)
                                            : '-'}
                                    </TableCell>
                                    <TableCell align="right">
                                        {row.pricePredicted != null && Number.isFinite(row.pricePredicted)
                                            ? row.pricePredicted.toFixed(2)
                                            : '-'}
                                    </TableCell>
                                    <TableCell align="right">
                                        {(() => {
                                            if (!isManualSchedule && !isOptimalSchedule && row.pricePredicted == null) return '-';
                                            // Cross-model override takes priority
                                            const override = revenueOverrides?.[row.datetime];
                                            if (override != null && Number.isFinite(override)) {
                                                return override.toLocaleString(undefined, { maximumFractionDigits: 0 });
                                            }
                                            const rev = isEstimated
                                                ? (row.revenueEstimated ?? row.revenueRealized)
                                                : row.revenueRealized;
                                            return rev != null && Number.isFinite(rev)
                                                ? rev.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                                : '-';
                                        })()}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[10, 25, 48, 100]}
                component="div"
                count={data.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
            <Box sx={{ p: 1, borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                <Typography variant="caption" color="text.secondary">
                    * {isEstimated ? 'Estimated Revenue uses predicted prices. ' : 'Realized Revenue uses actual prices. '}Power is in kW.
                </Typography>
            </Box>
        </Paper >
    );
};
