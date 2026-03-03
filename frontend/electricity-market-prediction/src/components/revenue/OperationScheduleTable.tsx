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
    TableSortLabel
} from '@mui/material';
import { GanttOperation } from '@/types/revenueAnalysis';
import { format } from 'date-fns';
import { useTheme } from '@/app/ThemeProvider';

interface OperationScheduleTableProps {
    data: GanttOperation[];
    title?: string;
    height?: number;
}

type Order = 'asc' | 'desc';
type OrderBy = keyof GanttOperation | 'timeCode';

export const OperationScheduleTable: React.FC<OperationScheduleTableProps> = ({
    data,
    title = "Detailed Operation Schedule",
    height = 400
}) => {
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
        <Paper sx={{ width: '100%', overflow: 'hidden', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                <Typography variant="h6">{title}</Typography>
            </Box>
            <TableContainer sx={{ maxHeight: height }}>
                <Table stickyHeader aria-label="operation table" size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'datetime'}
                                    direction={orderBy === 'datetime' ? order : 'asc'}
                                    onClick={() => handleRequestSort('datetime')}
                                >
                                    Time
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">
                                <TableSortLabel
                                    active={orderBy === 'timeCode'}
                                    direction={orderBy === 'timeCode' ? order : 'asc'}
                                    onClick={() => handleRequestSort('timeCode')}
                                >
                                    Time Code
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">
                                <TableSortLabel
                                    active={orderBy === 'action'}
                                    direction={orderBy === 'action' ? order : 'asc'}
                                    onClick={() => handleRequestSort('action')}
                                >
                                    Action
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                                <TableSortLabel
                                    active={orderBy === 'power'}
                                    direction={orderBy === 'power' ? order : 'asc'}
                                    onClick={() => handleRequestSort('power')}
                                >
                                    Power (kW)
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                                <TableSortLabel
                                    active={orderBy === 'priceActual'}
                                    direction={orderBy === 'priceActual' ? order : 'asc'}
                                    onClick={() => handleRequestSort('priceActual' as any)}
                                >
                                    Price (Actual)
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                                <TableSortLabel
                                    active={orderBy === 'pricePredicted'}
                                    direction={orderBy === 'pricePredicted' ? order : 'asc'}
                                    onClick={() => handleRequestSort('pricePredicted' as any)}
                                >
                                    Price (Pred)
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                                <TableSortLabel
                                    active={orderBy === 'revenueRealized'}
                                    direction={orderBy === 'revenueRealized' ? order : 'asc'}
                                    onClick={() => handleRequestSort('revenueRealized' as any)}
                                >
                                    Revenue (Realized)
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
                                        {row.pricePredicted == null ? '-' : row.action ? (
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
                                    <TableCell align="right">
                                        {row.pricePredicted == null ? '-' : (row.power != null && Number.isFinite(row.power) ? row.power.toFixed(2) : '-')}
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
                                        {row.pricePredicted == null ? '-' : (row.revenueRealized != null && Number.isFinite(row.revenueRealized)
                                            ? row.revenueRealized.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                            : '-')}
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
                    * Realized Revenue is calculated using Actual Prices. Power is in kW.
                </Typography>
            </Box>
        </Paper >
    );
};
